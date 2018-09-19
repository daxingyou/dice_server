'use strict';

import dao from '../dao';
import * as mroom from './room';

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

export function calculateResult(room) {
    // calculate player score
    // TODO
    

    // reset player bets
    // TODO
}

export function nextRound(room) {
	room.round++;

	shuffle(room);

	resetExpired(room, room.interval);
}

function enter_rob(room) {
	// 进入抢庄阶段
}

function leave_rob(room) {
	// 离开抢庄阶段
}

function enter_bet(room) {
	// 开始下注阶段
}

function leave_bet(room) {
	// 离开下注阶段
}

function enter_open(room) {
	// 进入开牌阶段

	/* 1. 摇骰子 */
	shuffle(room);

	/* 2. 计算结果 */
	settle(room);

	/* 3. 广播结果  */
	let banker = room.banker;
	let content = {
		round : room.round,
		dices : room.dices,
		records : room.records,
		result : room.result,
		banker : {
			balance : banker.balance,
			profit : banker.profit
		}
	};

	let players = room.players;
	players.forEach(p => {
		let self = {
			balance : p.balance,
			profit : p.profit
		};

		content.self = self;

		mroom.sendMsg(p, 'room_result_push', content);
	});
}

function leave_open(room) {
	// 离开开牌阶段

	/* 1. 清空玩家下注信息 */
	

	/* 2. 更新Round信息 */
	room.round++;
}

let listStage = [
	{
		stage : RoomStage.ROOM_STAGE_ROB,
		timeout : ROOM_TIMEOUT_ROB,
		enter : enter_rob,
		leave : leave_rob
	},
	{
		stage : RoomStage.ROOM_STAGE_BET,
		timeout : ROOM_TIMEOUT_BET,
		enter : enter_bet,
		leave : leave_bet
	},
	{
		stage : RoomStage.ROOM_STAGE_OPEN,
		timeout : ROOM_TIMEOUT_OPEN,
		enter : enter_open,
		leave : leave_open
	}
];

function shuffle(room) {
	let dices = [];
	let p = Math.floor(Math.random() * 10000);
	dices.push(p % 6 + 1);

	p = Math.floor(Math.random() * 2000);
	dices.push(p % 6 + 1);

	p = Math.floor(Math.random() * 1000);
	dices.push(p % 6 + 1);

	room.dices = dices;
}

function settle(room) {
	let dices = room.dices;
	let stat = room.stat;

	let flag = '';
	let count = 0;

	dices.forEach(x => {
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
	let scores = {};
	let banker_sc = 0;

	bets.forEach(x => {
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

	players.forEach(x => {
		let uid = x.uid;
		let sc = scores[uid];

		x.profit = 0;

		if (sc != null) {
			x.balance += sc;
			x.profit = sc;
		}
	});

	let banker = room.banker;

	banker.profit = banker_sc;
	banker.balance += banker_sc;

	let sequelize = dao['sequelize'];
	let UserDao = dao['UserDao'];
	let works = [];

	for (let uid in scores)
		works.push({ uid : uid, score : scores[uid] });

	sequelize.Promise.each(works, wk => {
		return UserDao.add_money(wk.uid, wk.score);
	});
}

function initBanker(room) {
	let banker = {
		account : '3492934349',
		name : '呵呵',
		avatar : 2,
		balance : 9274612788,
		is_robot : true
	};

	room.banker = banker;
}

function resetExpired(room, timeout) {
	room.expired = Math.floor(Date.now() / 1000) + timeout;
}

export function createRoom(roominfo) {
    let room = {
        id: roominfo.room_id,     	// 桌子ID
        name: roominfo.name,      	// 桌名
		config: roominfo.config,
        expired: 0,      			// 本期即将开牌时间点
        round: 1,        			// 第几期
		dices: [],
        result: '',      			// 当期胜负, R: 大, G: 豹子, B: 小; 如 R12, G6, B4
        records: [],     			// 所有的 result
        players: [],      			// 玩家列表
		robot : [],
		bets : [],					// 真实玩家下注: { uid : uid, bet : 'small', amount : amount }
		robot_bets : [],			// 机器人下注
		stat : {
			triple : 0,
			big : 0,
			small : 0,
			big_total: 0,
			small_total: 0
		},
		banker : null,
		stage : RoomStage.ROOM_STAGE_ROB
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

export function tick(room) {
	let now = Math.floor(Date.now() / 1000);

	if (now < room.expired)
		return;

	let stage = room.stage;
	let old = listStage[stage];
	let leave = old.leave;

	if (leave)
		leave(room);

	stage = (stage + 1) % RoomStage.ROOM_STAGE_MAX;
	room.stage = stage;

	let nw = listStage[stage];
	let enter = nw.enter;
	if (enter)
		enter(room);

	resetExpired(room, nw.timeout);
}


