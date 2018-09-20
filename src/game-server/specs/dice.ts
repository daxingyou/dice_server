'use strict';

import dao from '../../dao';
import * as mroom from '../room';

const MAX_RECORDS = 20;

enum RoomStage {
	ROOM_STAGE_ROB = 0,
	ROOM_STAGE_BET,
	ROOM_STAGE_OPEN,
	ROOM_STAGE_MAX
}

enum RoomTimeout {
	ROOM_TIMEOUT_ROB = 5,
	ROOM_TIMEOUT_BET = 30,
	ROOM_TIMEOUT_OPEN = 7
}

const STAGES = [ 'rob', 'bet', 'open' ];

interface Player {
	id : number;
	account : string;
	name : string;
	balance : number;
	avatar : number;
	profit : number;
	is_robot : boolean;
}

interface Bet {
	uid : number;
	bet : string;
	amount : number;
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

interface Room {
	id : number;
	name : string;
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
	banker ?: Player;
}

function enter_rob(room : Room) {
	// 进入抢庄阶段

    /* 1. 清空抢庄信息 */
    room.robs = [];

    let content = {
        stage : 'rob',
        round : room.round,
        expire : room.expire
    };

    mroom.broadcast(room, 'game_stage_push', content);
}

function leave_rob(room : Room) {
	// 离开抢庄阶段

    let content = {
        banker : room.banker
    };

    room.robs = [];

    mroom.broadcast(room, 'game_banker_push', content);
}

function enter_bet(room : Room) {
	// 开始下注阶段

    let content = {
        stage : 'bet',
        expire : room.expire
    }
    
    mroom.broadcast(room, 'game_stage_push', content);
}

function leave_bet(room : Room) {
	// 离开下注阶段
}

function enter_open(room : Room) {
	// 进入开牌阶段

	/* 1. 摇骰子 */
	shuffle(room);

	/* 2. 计算结果 */
	settle(room);

	/* 3. 广播结果  */
	let banker = room.banker;
	let content : any = {
        stage : 'open',
		round : room.round,
		dices : room.dices,
		records : room.records,
		result : room.result,
		banker : {
			balance : banker ? banker.balance : 0,
			profit : banker ? banker.profit : 0
		}
	};

	room.players.forEach((p : Player) => {
		let self = {
			balance : p.balance,
			profit : p.profit
		};

		content.self = self;

		mroom.sendMsg(p, 'game_stage_push', content);
	});
}

function leave_open(room : Room) {
	// 离开开牌阶段

	/* 1. 清空玩家下注信息 */
	room.bets = [];
    room.robot_bets = [];
    room.result = '';

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

function shuffle(room : Room) {
	let dices = [];
	let p = Math.floor(Math.random() * 10000);
	dices.push(p % 6 + 1);

	p = Math.floor(Math.random() * 2000);
	dices.push(p % 6 + 1);

	p = Math.floor(Math.random() * 1000);
	dices.push(p % 6 + 1);

	room.dices = dices;
}

function settle(room : Room) {
	let dices = room.dices;
	let stat = room.stat;

	let flag = '';
	let count = 0;

	dices.forEach((x : number) => {
		count += x;
	});

	let big_win = false;
	let small_win = false;

	if (dices[0] == dices[1] && dices[1] == dices[2]) {
		flag = 'G';
		stat.triple ++;
	} else if (count <= 10 ) {
		flag = 'B';
		stat.small ++;

		small_win = true;
	} else {
		flag = 'R';
		stat.big ++;

		big_win = true;
	}

	let result = flag + count;
	let records = room.records;

    records.push(result);
	if (records.length > MAX_RECORDS)
		records.splice(0, records.length - MAX_RECORDS);

	room.result = result;

	let bets = room.bets;
	let scores : any = {};
	let banker_sc = 0;

	bets.forEach((x : Bet) => {
		if (scores[x.uid] == null)
			scores[x.uid] = 0;

		let sc = 0;

		if ((x.bet == 'small' && small_win) || (x.bet == 'big' && big_win))
			sc += x.amount;
		else
			sc -= x.amount;

		scores[x.uid] += sc;
		banker_sc -= sc;
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

	let banker = room.banker;
	if (banker) {
		banker.profit = banker_sc;
		banker.balance += banker_sc;
	}

	let sequelize = dao['sequelize'];
	let UserDao = dao['UserDao'];
	let works = [];

	for (let uid in scores)
		works.push({ uid : uid, score : scores[uid] });

	sequelize.Promise.each(works, (wk : any)=> {
		return UserDao.add_money(wk.uid, wk.score);
	});
}

function initBanker(room : Room) {
	// TODO
	let banker = {
		id : 10000,
		account : '3492934349',
		name : '呵呵',
		avatar : 2,
		balance : 9274612788,
		profit : 0,
		is_robot : true
	};

	room.banker = banker;
}

function resetExpired(room : Room, timeout : number) {
	room.expire = Math.floor(Date.now() / 1000) + timeout;
}

function getRoomDetail(room : Room) {
    return {
        id : room.id,
        name : room.name,
        stage : STAGES[room.stage],
        expire : room.expire,
        round : room.round,
        dices : room.dices,
        result : room.result,
        records : room.records,
        robots : room.robots,
        stat : room.stat,
        banker : room.banker
    };
}

export function createRoom(roominfo : any) {
    let room : Room = {
        id: roominfo.room_id,     	// 桌子ID
        name: roominfo.name,      	// 桌名
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
		robs : [],
    };

	initBanker(room);

	let stage = RoomStage.ROOM_STAGE_ROB;
	let nw = listStage[stage];
	let enter = nw.enter;
	if (enter)
		enter(room);

	resetExpired(room, nw.timeout);

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

    room.bets.push(bet);

    let content = {
        bet : bet
    };

    mroom.sendMsg(player, 'player_bet_push', content);
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

    let content = getRoomDetail(room);

    mroom.sendMsg(player, 'enter_room_re', content);
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




