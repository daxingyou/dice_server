
'use strict';

import dao from '../../dao';
import * as mroom from '../room';
import redis from '../../utils/redis';

const userDao = dao['UserDao'];
const gameDao = dao['GameDao'];
const roomDao = dao['RoomDao'];
const sequelize = dao['sequelize'];
const Promise = sequelize.Promise;

const MAX_RECORDS = 20;
const LEOPARD_INTERVAL = 1500;

enum RoomStage {
	ROOM_STAGE_ROB = 0,
	ROOM_STAGE_BET,
	ROOM_STAGE_OPEN,
	ROOM_STAGE_MAX
}

enum RoomTimeout {
	ROOM_TIMEOUT_ROB = 5000,
	ROOM_TIMEOUT_BET = 51000,
	ROOM_TIMEOUT_OPEN = 7000
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
	is_robot : boolean;
	profit : number;
    amount : number;
    bet : string;

    total_recharge : number;
    total_withdraw : number;
}

interface Bet {
	uid : number;
	bet : string;
	amount : number;
    nickname ?: string;
    quick ?: boolean;
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

    big_player : number;
    small_player : number;
    big_robot : number;
    small_robot : number;
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

    rob_name : Robot;
    big_names : Robot[];
    small_names : Robot[];

    big_next : number;
    small_next : number;
    last : any;

    balance : number;
}

interface Robot {
    nickname : string;
    avatar : number;
}

let random_names : Robot[] = [
    {
        nickname : '若即若离',
        avatar : 3
    },
    {
        nickname : '阿强',
        avatar : 5
    },
    {
        nickname : '记忆里只有你',
        avatar : 2
    },
    {
        nickname : '姿势要帅',
        avatar : 1
    },
    {
        nickname : '奔跑的蜗牛',
        avatar : 7
    },
    {
        nickname : '努力做自己',
        avatar : 6
    },
    {
        nickname : '一帘幽梦',
        avatar : 4
    },
    {
        nickname : '那些年',
        avatar : 9
    },
    {
        nickname : '花随风落',
        avatar : 3
    },
    {
        nickname : '时间旅行',
        avatar : 7
    },
    {
        nickname : '酱香传承',
        avatar : 8
    },
    {
        nickname : '你很二啊',
        avatar : 9
    },
    {
        nickname : '小二妹',
        avatar : 3
    },
    {
        nickname : '人生如戏',
        avatar : 2
    },
    {
        nickname : '趁未老',
        avatar : 4
    },
    {
        nickname : '闹够了没有',
        avatar : 5
    },
    {
        nickname : '忘记',
        avatar : 4,
    },
    {
        nickname : '涂涂',
        avatar : 7
    },
    {
        nickname : '坚持就是胜利',
        avatar : 9
    },
    {
        nickname : 'MDZZ',
        avatar : 6
    },
    {
        nickname : '春天的雪',
        avatar : 2
    },
    {
        nickname : '但求无愧于心',
        avatar : 6
    },
    {
        nickname : '小舟元宝',
        avatar : 7
    },
    {
        nickname : '包子世家',
        avatar : 8
    }
];

function parse_player(player : any) {
    let p : any = {};
    let fs = [ 'id', 'account', 'nickname', 'balance', 'avatar', 'profit', 'is_robot', 'amount', 'bet' ];

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

function refresh_players (room : Room) {
    let players = room.players;

	return sequelize.Promise.each(players, (p : any) => {
        return userDao.getById(p.id)
        .then((u : any) => {
            if (u) {
                p.balance = u.balance;
                p.total_recharge = u.total_recharge;
                p.total_withdraw = u.total_withdraw;
            } else
                console.log('player not found : ' + p.id);
        });
	});
}

function remapNames (room : Room) {
    let random = random_names.slice(0);
    let robots = room.robots;

    if (true) {
        let rob = room.rob_name;
        let id = Math.floor(Math.random() * (random.length - 1));
        let rd = random[id];

        rob.nickname = rd.nickname;
        rob.avatar = rd.avatar;
        random.splice(id, 1);
    }

    robots.forEach(x => {
        let id = Math.floor(Math.random() * (random.length - 1));
        let rd = random[id];

        x.nickname = rd.nickname;
        x.avatar = rd.avatar;
        random.splice(id, 1);
    });

    room.small_names = [];
    room.big_names = [];

    for (let i = 0; i < 6; i++) {
        let id = Math.floor(Math.random() * (random.length - 1));
        room.small_names.push(random[id]);
        random.splice(id, 1);
    }

    for (let i = 0; i < 6; i++) {
        let id = Math.floor(Math.random() * (random.length - 1));
        room.big_names.push(random[id]);
        random.splice(id, 1);
    }
}

function enter_rob(room : Room) {
    /* 1. 清空抢庄信息 */
    room.robs = [];

    let data = {
        stage : 'rob',
        round : room.round,
        expire : Math.floor(room.expire / 1000)
    };

    mroom.broadcast(room, 'game_stage_push', data);

    remapNames(room);   
}

function leave_rob(room : Room) {
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
            banker.bet = 'banker';
            banker.amount = max;
            banker.balance -= max;
            banker.profit = 0;
        }
    }

    if (banker == null) {
        banker = initBanker(room.rob_name);
        banker.amount = 400000;
    }

    let status = room.status;
    
    status.small_limit = banker.amount;
    status.big_limit = banker.amount;

    let data : any = {
        banker : parse_player(banker),
        status : status
    };

    room.robs = [];
    room.banker = banker;

    mroom.broadcast(room, 'game_banker_push', data);

    if (!banker.is_robot)
        return userDao.addMoney(banker.id, 0 - banker.amount);
}

function robot_bet(room : Room, bet : string) {
    let small = bet == 'small';

    if (room.stage != RoomStage.ROOM_STAGE_BET) {
        room.big_next = 0;
        room.small_next = 0;
        return;
    }

    let next = Date.now() + Math.floor(Math.random() * 3000);

    let fnNext = () => {
        if (small)
            room.small_next = next;
        else
            room.big_next = next;
    };

    let names = small ? room.small_names : room.big_names;
    let rand = Math.floor(Math.random() * (names.length - 1));
    let nm = names[rand].nickname;

    let stat = room.stat;
    let status = room.status;
    let banker_amount = room.banker.amount;

    let limit = 0;
    if (small) {
        limit = status.big_total + 100000 - status.small_total;
    } else {
        limit = status.small_total + 100000 - status.big_total;
    }

    limit = Math.floor(limit / 1000);
    if (limit <= 0) {
        fnNext();
        return;
    }

    let amount = Math.round(limit * Math.random()) * 1000;
    if (amount == 0) {
        fnNext();
        return;
    }

    if (small) {
        stat.small_bet_total += amount;
        status.small_total += amount;
        status.small_robot += amount;
    } else {
        stat.big_bet_total += amount;
        status.big_total += amount;
        status.big_robot += amount;
    }

    status.small_limit = status.big_total + banker_amount - status.small_total;
    status.big_limit = status.small_total + banker_amount - status.big_total;

    let bett = {
        bet : bet,
        uid : 0,
        amount : amount,
        nickname : nm
    };

    room.bets.push(bett);

    let data = {
        bet : bett,
        valid : true,
        status : status
    };
    
    mroom.broadcast(room, 'player_bet_push', data);

    fnNext();
}

function enter_bet(room : Room) {
    let data = {
        stage : 'bet',
		round : room.round,
        expire : Math.floor(room.expire / 1000),
		robots : room.robots
    }
    
    mroom.broadcast(room, 'game_stage_push', data);

    robot_bet(room, 'small');
    robot_bet(room, 'big');
}

function leave_bet(room : Room) {
    room.big_next = 0;
    room.small_next = 0;
}

function doBalance(room : Room) {
    /* 1. 系统Balance如果低于-100w, 开牌结果必须Balance++ */
    let balance = room.balance;
    let status = room.status;
    let banker = room.banker;
    let total = status.big_robot - status.small_robot;

    if (banker.is_robot)
        total += status.small_total - status.big_total;

    if (total < 0 && balance + total < -1000000)
        return DiceResult.SMALL;
    else if (total > 0 && balance - total < -1000000)
        return DiceResult.BIG;

    /* 2. 如果有玩家Balance - (total_recharge - total_withdraw) > 30%, 杀Balance最大的猪 */
    let ps = room.players;
    let max = 0;
    let target = null;
    for (let i = 0; i < ps.length; i++) {
        let p = ps[i];
        if (p.amount == 0)
            continue;

        let off = p.total_recharge - p.total_withdraw;
        if (off > 0) {
            if (p.balance > off * 1.3 && p.balance > max) {
                max = p.balance;
                target = p;
            }
        } else {
            if (p.balance - off > max) {
                max = p.balance - off;
                target = p;
            }
        }
    }

    if (target == null)
        return 0;

    let bet = target.bet;
    if (bet == 'small')
        return DiceResult.BIG;
    else if (bet == 'big')
        return DiceResult.SMALL;
    else if (bet == 'banker') {
        if (status.big_total > status.small_total)
            return DiceResult.BIG;
        else
            return DiceResult.SMALL;
    }

    return 0;
}

function open(room : Room) {
    let goal = 0;
	let banker = room.banker;
    const KEY = 'next_result';

    return redis.get(KEY)
    .then(x => {
        if (!x) {
            if (banker && !banker.is_robot) {
                goal = DiceResult.BIG | DiceResult.SMALL;
            } else {
                if (room.round - room.last_leopard < LEOPARD_INTERVAL) {
                    goal = DiceResult.BIG | DiceResult.SMALL;
                }
            }

            let bc = doBalance(room);
            if (bc != 0)
                goal = bc;
        } else {
            if (x == 'S')
                goal = DiceResult.SMALL;
            else if (x == 'B')
                goal = DiceResult.BIG;
            else if (x == 'L')
                goal = DiceResult.LEOPARD;
        }

        room.dices = shuffle(goal);

        return redis.del(KEY);
    });
}

function enter_open(room : Room) {
    return open(room)
    .then(() => {
	    return settle(room);
    })
    .then(() => {
        return refresh_players(room);
    })
    .then(() => {
    	/* 3. 广播结果  */
    	let banker = room.banker;
    	let data : any = {
            stage : 'open',
    		round : room.round,
    		expire : Math.floor(room.expire / 1000),
    
    		dices : room.dices,
    		records : room.records,
    		result : room.result,
            banker : parse_player(banker),
    		stat : room.stat,
            status : room.status
    	};

        room.last = {
            dices : room.dices,
            result : room.result,
            records : room.records,
            banker : parse_player(banker),
            stat : room.stat,
            status : room.status
        };

    	room.players.forEach((p : Player) => {
    		data.myself = {
    			balance : p.balance,
    			profit : p.profit,
                amount : p.amount,
                bet : p.bet
    		};
    
    		mroom.sendMsg(p, 'game_stage_push', data);
    	});
    });
}

function leave_open(room : Room) {
	/* 1. 清空玩家下注信息 */
	room.bets = [];
    room.robot_bets = [];
    room.result = '';

    room.status = {
        small_total : 0,
        big_total : 0,
        small_limit : 0,
        big_limit : 0,
        small_player : 0,
        big_player : 0,
        small_robot : 0,
        big_robot : 0
    };

    room.players.forEach(x => {
        x.profit = 0;
        x.amount = 0;
        x.bet = '';
    });

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
	let banker = room.banker;
    let dices = room.dices;
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
	let banker_sc = banker.amount;
    let tax = 0;
    let total = 0;

	bets.forEach((x : Bet) => {
        let sc = scores[x.uid];
        if (sc == null) {
            sc = { bet : x.bet, amount : 0, result : 0 };
            scores[x.uid] = sc;
        }
        
        sc.amount += x.amount;

		if (x.uid != 0) {
            if ((x.bet == 'small' && small_win) || (x.bet == 'big' && big_win)) {
    			sc.result += x.amount * 1.99;
                tax += x.amount * 0.01;
                total += x.amount;
            } else {
                total -= x.amount;
            }
        }
	});

    let status = room.status;

    if (triple) {
        banker_sc += status.big_total + status.small_total;
    } else if (small_win) {
        banker_sc += status.big_total - status.small_total;
    } else {
        banker_sc += status.small_total - status.big_total;
    }

    let banker_profit = banker_sc - banker.amount;

	let players = room.players;

	players.forEach((x : Player) => {
		let uid = x.id;
		let sc = scores[uid];

		x.profit = 0;

		if (sc != null) {
			x.balance += sc.result;
			x.profit = sc.result;

            sc.balance = x.balance;
		}
	});

	if (banker) {
        let cnt = banker_sc * 0.99;

		banker.profit = cnt;
		banker.balance += cnt;

        if (!banker.is_robot) {
            scores[banker.id] = { bet : 'banker', amount : banker.amount, result : cnt, balance : banker.balance };
            total += banker_profit;
            tax += banker_sc * 0.01;
        }
	}

    banker_sc *= 0.99;

	/* update result & records */
    let bk_win = banker_sc - banker.amount;
	let w = bk_win > 0 ? 'w' : (bk_win < 0 ? 'l' : 'd');
	let result = flag + dices[0] + dices[1] + dices[2] + w;
	let records = room.records;

    records.push(result);
	if (records.length > MAX_RECORDS)
		records.splice(0, records.length - MAX_RECORDS);

	room.result = result;

	/* update balance */
	let works : any[] = [];
    let cnt = 0;
	for (let uid in scores) {
        let sc = scores[uid];

        if (sc != null && uid != '0') {
            sc['uid'] = parseInt(uid);
		    works.push(sc);
            cnt++;
        }
    }

    if (0 == cnt) {
        return new Promise((resolve : any, reject : any) => {
            return resolve(true);
        });
    }

	return Promise.each(works, (wk : any) => {
		return userDao.addMoney(wk.uid, wk.result);
	})
    .then(() => {
        return gameDao.createGame(room.id, room.round, result);
    })
    .then((x : any) => {
        let gid = x.id;

        return Promise.each(works, (wk : any) => {
            return gameDao.createGameLog(wk.uid, gid, wk.bet, wk.amount, wk.result, '结算后余额' + wk.balance);
        });
    })
    .then(() => {
        room.balance -= total;
        return roomDao.updateResult(room.id, 0 - total, room.round, tax);
    });
}

function initBanker(rob: Robot) {
	let banker = {
		id : 10000,
		account : '3492934349',
		nickname : rob.nickname,
		avatar : rob.avatar,
		balance : 9274612788,
		profit : 0,
		is_robot : true,
        amount : 400000,
        bet : 'banker',

        total_recharge : 0,
        total_withdraw : 0
	};

	return banker;
}

function resetExpired(room : Room, timeout : number) {
	room.expire = Date.now() + timeout;
}

function getRoomDetail(room : Room, player : Player) {
    return {
        id : room.id,
		server : room.server,
        name : room.name,
        stage : STAGES[room.stage],
        expire : Math.floor(room.expire / 1000),
        round : room.round,
        dices : room.dices,
        result : room.result,
        records : room.records,
        robots : room.robots,
        stat : room.stat,
        status : room.status,
        banker : parse_player(room.banker),
        last : room.last,
        myself : {
            balance : player.balance,
            amount : player.amount,
            profit : player.profit,
            bet : player.bet
        }
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
            amount : 0,
			is_robot : true,
            total_recharge : 0,
            total_withdraw : 0,
            bet : ''
		},
		{
			id : 1001,
			account : '84038204',
			nickname : '我来看看的',
			balance : 3840,
			avatar : 4,
			profit : 0,
            amount : 0,
			is_robot : true,
            total_recharge : 0,
            total_withdraw : 0,
            bet : ''
		},
		{
			id : 1002,
			account : '73457845',
			nickname : '点点点',
			balance : 29384,
			avatar : 2,
			profit : 0,
            amount : 0,
			is_robot : true,
            total_recharge : 0,
            total_withdraw : 0,
            bet : ''
		},
		{
			id : 1003,
			account : '83475483',
			nickname : '出啥买啥',
			balance : 1873484,
            amount : 0,
			avatar : 8,
			profit : 0,
			is_robot : true,
            total_recharge : 0,
            total_withdraw : 0,
            bet : ''
		},
		{
			id : 1004,
			account : '49594853',
			nickname : '我是赌神',
			balance : 76540,
            amount : 0,
			avatar : 3,
			profit : 0,
			is_robot : true,
            total_recharge : 0,
            total_withdraw : 0,
            bet : ''
		},
		{
			id : 1005,
			account : '20343435',
			nickname : '林发进',
			balance : 760945,
			avatar : 9,
			profit : 0,
            amount : 0,
			is_robot : true,
            total_recharge : 0,
            total_withdraw : 0,
            bet : ''
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
        round: roominfo.round,        			// 第几期
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
            small_limit : 0,
            big_player : 0,
            small_player : 0,
            big_robot : 0,
            small_robot : 0
        },

		robs : [],
        banker : {
        	id : 0,
        	account : '0',
        	nickname : '0',
        	balance : 0,
        	avatar : 0,
        	profit : 0,
        	is_robot : false,
            amount : 0,
            bet : 'banker',
            total_recharge : 0,
            total_withdraw : 0
        },

        last_leopard : 0,

        rob_name : {
            nickname : '',
            avatar : 0
        },
        small_names : [],
        big_names : [],

        big_next : 0,
        small_next : 0,

        last : null,

        balance : roominfo.balance
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
	let now = Date.now();

    if (room.stage == RoomStage.ROOM_STAGE_BET) {
        if (room.big_next != 0 && room.big_next < now)
            robot_bet(room, 'big');

        if (room.small_next != 0 && room.small_next < now)
            robot_bet(room, 'small');
    }

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

    let now = Date.now();
    if (now < room.expire && room.expire - now < 1000)
        return;

    let small = bet.bet == 'small';
    let amount = bet.amount;
    let quick = bet.quick === true;

	let total = player.amount;
    let bos = player.bet;

    if (total > 0 && bos != bet.bet) {
        mroom.sendMsg(player, 'player_bet_push', { bet : bet, valid : false, tips : '您不能同时下注大和小' });
        return;
    }

	if (!quick) {
        if (amount > player.balance) {
		    mroom.sendMsg(player, 'player_bet_push', { bet : bet, valid : false, tips : '您的余额不足' });
		    return;
        }
	} else {
        if (total >= amount) {
            mroom.sendMsg(player, 'player_bet_push', { bet : bet, valid : false, tips : '您的下注已达快押上限' });
            return;
        } else if (amount - total > player.balance) {
		    mroom.sendMsg(player, 'player_bet_push', { bet : bet, valid : false, tips : '您的余额不足' });
            return;
        }

        amount = amount - total;
    }

    let stat = room.stat;
    let status = room.status;
    let banker_amount = room.banker.amount;
    if (!quick && ((small && amount + status.small_total > status.big_total + banker_amount) ||
        (!small && amount + status.big_total > status.small_total + banker_amount)))
    {
        mroom.sendMsg(player, 'player_bet_push', { bet : bet, valid : false, tips : '超过下注上限' });
        return;
    }

    if (quick) {
        let limit = 0;
        if (small)
            limit = status.big_total + banker_amount - status.small_total;
        else
            limit = status.small_total + banker_amount - status.big_total;

        if (limit == 0) {
            mroom.sendMsg(player, 'player_bet_push', { bet : bet, valid : false, tips : '已达下注上限' });
            return;
        }

        if (amount > limit)
            amount = limit;
    }

    bet.amount = amount;

    room.bets.push(bet);

    return userDao.addMoney(bet.uid, 0 - amount)
    .then(() => {
        if (small) {
            stat.small_bet_total += amount;
            status.small_total += amount;
            status.small_player += amount;
        } else {
            stat.big_bet_total += amount;
            status.big_total += amount;
            status.big_player += amount;
        }
    
        status.small_limit = status.big_total + banker_amount - status.small_total;
        status.big_limit = status.small_total + banker_amount - status.big_total;

        player.balance -= amount;
        player.amount += amount;
        player.bet = bet.bet;
    
        let data = {
            bet : bet,
    		valid : true,
            status : status,
            balance : player.balance
        };
    
        data.bet.nickname = player.nickname;
    
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
    let op : Player | null = null;
    for (let i = 0; i < players.length; i++) {
        let p = players[i];

        if (p.id == id) {
            op = p;
            break;
        }
    }

    if (!op) {
        let amount = 0;
        let bet = '';

        room.bets.forEach(x => {
            if (x.uid == player.id) {
                amount += x.amount;
                bet = x.bet;
            }
        });

        player.amount = amount;
        player.profit = 0;
        player.bet = bet;

        let banker = room.banker;

        if (banker.id == player.id) {
            player.amount = banker.amount;
            player.profit = banker.profit;
            player.bet = banker.bet;

            room.banker = player;
        }

        players.push(player);
        op = player;
    } else {
        op.balance = player.balance;
    }

    let data = getRoomDetail(room, op);

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




