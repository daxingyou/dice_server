
'use strict';

import specs from './specs';

export function sendMsg(player : any, type : string, data : any) {
	let ret = {
		type : type,
		data : data
	};

	//console.log('sendMsg: ' + JSON.stringify(ret));

	player.ws.send(JSON.stringify(ret));
}

export function broadcast(room : any, type : string, data : any) {
	let ret : any  = {
		type : type,
		data : data
	};

	let msg = JSON.stringify(ret);

	//console.log('broadcast: ' + msg);

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

    spec.leaveRoom(room, player);
}

export function playerBet(room : any, player : any, bet : any) {
    let spec = room.spec;

    spec.playerBet(room, player, bet);
}

export function playerRob(room : any, player : any, rob : any) {
    let spec = room.spec;

    spec.playerRob(room, player, rob);
}


