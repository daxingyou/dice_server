
'use strict';

import specs from './specs';

export function sendMsg(player : any, type : string, content : any) {
	let ret = {
		type : type,
		content : content
	};

	player.ws.send(JSON.stringify(ret));
}

export function broadcast(room : any, type : string, content : any) {
	let ret = {
		type : type,
		content : content
	};

	let msg = JSON.stringify(ret);

	room.players.forEach((x : any) => {
		x.ws.send(msg);
	});
}

export function getPlayers(room : any) {
	let players = room.players.map((x : any) => {
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

export function createRoom(roominfo : any) {
	let spec = specs[roominfo.type];

	if (!spec)
		return null;

	let room = spec.createRoom(roominfo);

	room.spec = spec;
	return room;
}

export function tick(room : any) {
	let spec = room.spec;

	spec.tick(room);
}

export function enterRoom(room : any, player : any) {
    console.log('enterRoom id', room.id, 'account', player.account);
    
    let spec = room.spec;
    
    spec.enterRoom(room, player);
}

export function leaveRoom(room : any, player : any) {
    let spec = room.spec;

    spec.leaveRoom();
}

export function playerBet(room : any, player : any, bet : any) {
    let spec = room.spec;

    spec.playerBet(room, player, bet);
}


