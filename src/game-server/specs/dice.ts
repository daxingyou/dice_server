'use strict';

import dao from '../../dao';
import * as mroom from '../room';

const userDao = dao['UserDao'];

const MAX_RECORDS = 20;
const LEOPARD_INTERVAL = 1500;

enum RoomStage {
	ROOM_STAGE_ROB = 0,
	ROOM_STAGE_BET,
	ROOM_STAGE_OPEN,
	ROOM_STAGE_MAX
}

enum RoomTimeout {
	ROOM_TIMEOUT_ROB = 5,
	ROOM_TIMEOUT_BET = 51,
	ROOM_TIMEOUT_OPEN = 7
}

enum DiceResult {
    BIG = 1,
    SMALL = 2,
    LEOPARD = 4
}

const STAGES = [ 'rob', 'bet', 'open' ];

interface Player {
	id : number;
	account : string;
	nickname : string;
	balance : number;
	avatar : number;
	profit : number;
	is_robot : boolean;
    banker_amount : number;
}

interface Bet {
	uid : number;
	bet : string;
	amount : number;
    nickname ?: string;
}

interface Rob {
	uid : number;
	amount : number;
}

interface Stat {
	triple : number;
	big : number;
	small : number;
	big_bet_total : number;
	small_bet_total : number;
}

interface RoomStatus {
    big_total : number;
    small_total : number;
    big_limit : number;
    small_limit : number;
}

interface Room {
	id : number;
	name : string;
	server : string,
	config : string;
	expire : number;
	round : number;
	dices : number[];
	result : string;
	records : string[];
	players : Player[];
	robots : Player[];
	bets : Bet[];
	robot_bets : Bet[];
	stat : Stat;
	stage : RoomStage;
	robs : Rob[];
    status : RoomStatus;

	banker : Player;
    last_leopard : number;
}

function parse_player(player : any) {
    let p : any = {};
    let fs = [ 'id', 'account', 'nickname', 'balance', 'avatar', 'profit', 'is_robot', 'banker_amount' ];

    fs.forEach(x => {
        p[x] = player[x];
    });

    return p;
}

function find_player(room : Room, uid : number) {
    let players = room.players;

    for (let i = 0; i < players.length; i++) {
        let p = players[i];

        if (p.id == uid)
            return p;
    }


    return null;
}

function enter_rob(room : Room) {
	// 进入抢庄阶段

	console.log('enter_rob');

    /* 1. 清空抢庄信息 */
    room.robs = [];

    let data = {
        stage : 'rob',
        round : room.round,
        expire : room.expire
    };

    mroom.broadcast(room, 'game_stage_push', data);
}

function leave_rob(room : Room) {
	// 离开抢庄阶段

	console.log('leave_rob');

    let robs = room.robs;
    let max = 0;
    let uid = 0;
    for (let i = 0; i < robs.length; i++) {
        let rb = robs[i];
        if (rb.amount > max) {
            max = rb.amount;
            uid = rb.uid;
        }
    }

    let banker = null;

    if (max > 0) {
        banker = find_player(room, uid);
        if (banker != null) {
            banker.banker_amount = max;
            banker.balance -= max;
        }
    }

    if (banker == null) {
        banker = initBanker();
        banker.banker_amount = 400000;
    }

    let status = room.status;
    
    status.small_limit = banker.banker_amount;
    status.big_limit = banker.banker_amount;

    let data : any = {
        banker : parse_player(banker),
        status : status
    };

    room.robs = [];
    room.banker = banker;

    mroom.broadcast(room, 'game_banker_push', data);

    if (!banker.is_robot) {
        return userDao.addMoney(banker.id, 0 - banker.banker_amount);
    }
}

function enter_bet(room : Room) {
	// 开始下注阶段

	console.log('enter_bet');

    let data = {
        stage : 'bet',
		round : room.round,
        expire : room.expire,
		robots : room.robots
    }
    
    mroom.broadcast(room, 'game_stage_push', data);
}

function leave_bet(room : Room) {
	// 离开下注阶段

	console.log('leave_bet');
}

function enter_open(room : Room) {
	// 进入开牌阶段

	console.log('enter_open');

	/* 2. 计算结果 */
	settle(room);

	/* 3. 广播结果  */
	let banker = room.banker;
	let data : any = {
        stage : 'open',
		round : room.round,
		expire : room.expire,

		dices : room.dices,
		records : room.records,
		result : room.result,
		banker : {
			balance : banker ? banker.balance : 0,
			profit : banker ? banker.profit : 0
		},
		stat : room.stat
	};

	room.players.forEach((p : Player) => {
		data.myself = {
			balance : p.balance,
			profit : p.profit
		};

		mroom.sendMsg(p, 'game_stage_push', data);
	});
}

function leave_open(room : Room) {
	// 离开开牌阶段

	console.log('leave_open');

	/* 1. 清空玩家下注信息 */
	room.bets = [];
    room.robot_bets = [];
    room.result = '';

    room.status = {
        small_total : 0,
        big_total : 0,
        small_limit : 0,
        big_limit : 0
    };

	/* 2. 更新Round信息 */
	room.round++;
}

interface ListStage {
	stage : RoomStage;
	timeout : RoomTimeout;
	enter : (room : Room) => void;
	leave : (room : Room) => void;
}

let listStage : ListStage[] = [
	{
		stage : RoomStage.ROOM_STAGE_ROB,
		timeout : RoomTimeout.ROOM_TIMEOUT_ROB,
		enter : enter_rob,
		leave : leave_rob
	},
	{
		stage : RoomStage.ROOM_STAGE_BET,
		timeout : RoomTimeout.ROOM_TIMEOUT_BET,
		enter : enter_bet,
		leave : leave_bet
	},
	{
		stage : RoomStage.ROOM_STAGE_OPEN,
		timeout : RoomTimeout.ROOM_TIMEOUT_OPEN,
		enter : enter_open,
		leave : leave_open
	}
];

function shuffle(goal : number | undefined) {
    let need = goal;
    if (need == undefined || need == 0)
        need = DiceResult.SMALL | DiceResult.BIG | DiceResult.LEOPARD;

    let ret = [];

    do {
    	let dices = [];
    	let p = Math.floor(Math.random() * 10000);
    	dices.push(p % 6 + 1);
    
    	p = Math.floor(Math.random() * 2000);
    	dices.push(p % 6 + 1);
    
    	p = Math.floor(Math.random() * 1000);
    	dices.push(p % 6 + 1);

        let total = dices[0] + dices[1] + dices[2];
        let triple = (dices[0] == dices[1]) && (dices[1] == dices[2]);
        let small = !triple && total <= 10;
        let big = !triple && total > 10;

        if ((triple && (need & DiceResult.LEOPARD) > 0) ||
            (small && (need & DiceResult.SMALL) > 0) ||
            (big && (need & DiceResult.BIG) > 0))
        {
            ret = dices;
            break;
        }
    } while (true);

    return ret;
}

function settle(room : Room) {
	let stat = room.stat;

	let flag = '';
    let goal = 0;
	let banker = room.banker;
    if (banker && !banker.is_robot) {
        goal = DiceResult.BIG | DiceResult.SMALL;
    } else {
        if (room.round - room.last_leopard < LEOPARD_INTERVAL) {
            goal = DiceResult.BIG | DiceResult.SMALL;
        }
    }

    let dices = room.dices = shuffle(goal);

	let count = 0;

	dices.forEach((x : number) => {
		count += x;
	});

	let triple = (dices[0] == dices[1] && dices[1] == dices[2]);
    let small_win = !triple && count <= 10;
    let big_win = !triple && count > 10;

	if (triple) {
        flag = 'L';
		stat.triple ++;
        room.last_leopard = room.round;
	} else if (small_win) {
		flag = 'S';
		stat.small ++;
	} else {
		flag = 'B';
		stat.big ++;
	}

	let bets = room.bets;
	let scores : any = {};
	let banker_sc = banker.banker_amount;

	bets.forEach((x : Bet) => {
		if (scores[x.uid] == null)
			scores[x.uid] = 0;

		if ((x.bet == 'small' && small_win) || (x.bet == 'big' && big_win)) {
			scores[x.uid] += x.amount * 2;
            banker_sc -= x.amount;
        } else {
            banker_sc += x.amount;
        }
	});

	let players = room.players;

	players.forEach((x : Player) => {
		let uid = x.id;
		let sc = scores[uid];

		x.profit = 0;

		if (sc != null) {
			x.balance += sc;
			x.profit = sc;
		}
	});

	if (banker) {
		banker.profit = banker_sc;
		banker.balance += banker_sc;

        console.log('banker robot: ' + banker.is_robot);

        if (!banker.is_robot)
            scores[banker.id] = banker_sc;
	}

	/* update result & records */
    let bk_win = banker_sc - banker.banker_amount;
	let w = bk_win > 0 ? 'w' : (bk_win < 0 ? 'l' : 'd');
	let result = flag + dices[0] + dices[1] + dices[2] + w;
	let records = room.records;

    records.push(result);
	if (records.length > MAX_RECORDS)
		records.splice(0, records.length - MAX_RECORDS);

	room.result = result;

	/* update balance */
	let sequelize = dao['sequelize'];
	let works = [];

	for (let uid in scores) {
        let sc = scores[uid];

        if (sc != null && sc != 0) {
            console.log('add score: ' + uid + ' ' + sc);
		    works.push({ uid : uid, score : sc });
        }
    }

	sequelize.Promise.each(works, (wk : any)=> {
		return userDao.addMoney(wk.uid, wk.score);
	});
}

function initBanker() {
	// TODO
	let banker = {
		id : 10000,
		account : '3492934349',
		nickname : '呵呵',
		avatar : 2,
		balance : 9274612788,
		profit : 0,
		is_robot : true,
        banker_amount : 400000
	};

	return banker;
}

function resetExpired(room : Room, timeout : number) {
	room.expire = Math.floor(Date.now() / 1000) + timeout;
}

function getRoomDetail(room : Room) {
    return {
        id : room.id,
		server : room.server,
        name : room.name,
        stage : STAGES[room.stage],
        expire : room.expire,
        round : room.round,
        dices : room.dices,
        result : room.result,
        records : room.records,
        robots : room.robots,
        stat : room.stat,
        status : room.status,
        banker : room.banker
    };
}

function initRobots(room : Room) {

	room.robots = [
		{
			id : 1000,
			account : '23842034',
			nickname : '小舟元宝',
			balance : 83760,
			avatar : 7,
			profit : 0,
			is_robot : true,
            banker_amount : 0
		},
		{
			id : 1001,
			account : '84038204',
			nickname : '我来看看的',
			balance : 3840,
			avatar : 4,
			profit : 0,
			is_robot : true,
            banker_amount : 0
		},
		{
			id : 1002,
			account : '73457845',
			nickname : '点点点',
			balance : 29384,
			avatar : 2,
			profit : 0,
			is_robot : true,
            banker_amount : 0
		},
		{
			id : 1003,
			account : '83475483',
			nickname : '出啥买啥',
			balance : 1873484,
			avatar : 8,
			profit : 0,
			is_robot : true,
            banker_amount : 0
		},
		{
			id : 1004,
			account : '49594853',
			nickname : '我是赌神',
			balance : 76540,
			avatar : 3,
			profit : 0,
			is_robot : true,
            banker_amount : 0
		},
		{
			id : 1005,
			account : '20343435',
			nickname : '林发进',
			balance : 760945,
			avatar : 9,
			profit : 0,
			is_robot : true,
            banker_amount : 0
		}
	];
}

export function createRoom(roominfo : any) {
    let room : Room = {
        id: roominfo.id,     	// 桌子ID
        name: roominfo.name,      	// 桌名
		server : roominfo.server,
		config: roominfo.config,
        expire: 0,      			// 本期即将开牌时间点
        round: 1,        			// 第几期
		dices: [],
        result: '',      			// 当期胜负, R: 大, G: 豹子, B: 小; 如 R12, G6, B4
        records: [],     			// 所有的 result
        players: [],      			// 玩家列表
		robots : [],
		bets : [],					// 真实玩家下注: { uid : uid, bet : 'small', amount : amount }
		robot_bets : [],			// 机器人下注
		stat : {
			triple : 0,
			big : 0,
			small : 0,
			big_bet_total: 0,
			small_bet_total: 0
		},
		stage : RoomStage.ROOM_STAGE_ROB,
        status : {
            big_total : 0,
            small_total : 0,
            big_limit : 0,
            small_limit : 0
        },

		robs : [],
        banker : initBanker(),
        last_leopard : 0
    };

	initRobots(room);

	let stage = RoomStage.ROOM_STAGE_ROB;
	let nw = listStage[stage];

	resetExpired(room, nw.timeout);

	let enter = nw.enter;
	if (enter)
		enter(room);

    return room;
}

export function tick(room : Room) {
	let now = Math.floor(Date.now() / 1000);

	if (now < room.expire)
		return;

	let stage = room.stage;
	let old = listStage[stage];
	let leave = old.leave;

	if (leave)
		leave(room);

	stage = (stage + 1) % RoomStage.ROOM_STAGE_MAX;
	room.stage = stage;

	let nw = listStage[stage];

	resetExpired(room, nw.timeout);

	let enter = nw.enter;
	if (enter)
		enter(room);
}

export function playerBet(room : Room, player : Player, bet : Bet) {
    let stage = room.stage;

    if (stage != RoomStage.ROOM_STAGE_BET)
        return;

    let amount = bet.amount;

	let total = 0;
    let bos = '';
	room.bets.forEach(x => {
		if (x.uid == player.id) {
			total += x.amount;
            bos = x.bet;
        }
	});

    if (total > 0 && bos != bet.bet) {
        mroom.sendMsg(player, 'player_bet_push', { bet : bet, valid : false, tips : '您不能同时下注大和小' });
        return;
    }

	if (amount > player.balance) {
		mroom.sendMsg(player, 'player_bet_push', { bet : bet, valid : false, tips : '您的余额不足' });
		return;
	}

    let stat = room.stat;
    let status = room.status;
    let banker_amount = room.banker.banker_amount;
    if ((bet.bet == 'small' && amount + status.small_total > status.big_total + banker_amount) ||
        (bet.bet == 'big' && amount + status.big_total > status.small_total + banker_amount))
    {
        mroom.sendMsg(player, 'player_bet_push', { bet : bet, valid : false, tips : '超过下注上限' });
        return;
    }

    room.bets.push(bet);

    return userDao.addMoney(bet.uid, 0 - amount)
    .then(() => {
        if (bet.bet == 'small') {
            stat.small_bet_total += amount;
            status.small_total += amount;
        } else if (bet.bet = 'big') {
            stat.big_bet_total += amount;
            status.big_total += amount;
        }
    
        status.small_limit = status.big_total + banker_amount - status.small_total;
        status.big_limit = status.small_total + banker_amount - status.big_total;

        player.balance -= amount;
    
        let data = {
            bet : bet,
    		valid : true,
            status : status,
            balance : player.balance
        };
    
        data.bet.nickname = player.nickname;
    
        //mroom.sendMsg(player, 'player_bet_push', data);
        mroom.broadcast(room, 'player_bet_push', data);
    })
    .catch((err : any) => {
       mroom.sendMsg(player, 'player_bet_push', { bet : bet, valid : false, tips : err });
    });
}

export function playerRob(room : Room, player : Player, rob : Rob) {
    let stage = room.stage;

    if (stage != RoomStage.ROOM_STAGE_ROB)
        return;

    room.robs.push(rob);
}

export function enterRoom(room : Room, player : Player) {
    let id = player.id;

    let found = false;
    let players = room.players;
    for (let i = 0; i < players.length; i++) {
        let p = players[i];

        if (p.id == id) {
            found = true;
            break;
        }
    }

    if (!found)
        players.push(player);

    let data = getRoomDetail(room);

    mroom.sendMsg(player, 'enter_room_re', data);
}

export function leaveRoom(room : Room, player : Player) {
    let id = player.id;

    let off = -1;
    let players = room.players;
    for (let i = 0; i < players.length; i++) {
        let p = players[i];

        if (p.id == id) {
            off = i;
            break;
        }
    }
   
    if (off >= 0)
        players.splice(off, 1);
}




