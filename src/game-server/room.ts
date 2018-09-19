
'use strict';

import specs from './specs';

export function sendMsg(player, type, content) {
	let ret = {
		type : type,
		content : content
	};

	player.ws.send(JSON.stringify(ret));
}

export function broadcast(room, type, content) {
	let ret = {
		type : type,
		content : content
	};

	let msg = JSON.stringify(ret);

	room.players.forEach(x => {
		x.ws.send(msg);
	});
}

export function getPlayers(room) {
	let players = room.players.map(x => {
		return {
			id : x.id,
			avatar : x.avatar,
			account : x.account,
			nickname : x.nickname,
			bets : x.bets
		};
	});

    return players;
}

export function createRoom(roominfo) {
	let spec = specs[roominfo.type];

	if (!spec)
		return null;

	let room = spec.createRoom(roominfo);

	room.spec = spec;
	return room;
}

export function tick(room) {
	let spec = room.spec;

	spec.tick(room);
}

export function enterRoom(room, player) {
    console.log('enterRoom id', room.id, 'account', player.account);
    
    let spec = room.spec;
    
    spec.enterRoom(room, player);
}

export function leaveRoom(room, player) {
    let spec = room.spec;

    spec.leaveRoom();
}

export function playerBet(room, player, bet) {
    let spec = room.spec;

    spec.playerBet(room, player, bet);
}


