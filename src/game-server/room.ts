
'use strict';

import specs from './specs';

function sendMsg(player, type, content) {
	let ret = {
		type : type,
		content : content
	};

	player.ws.send(JSON.stringify(ret));
}

export sendMsg;

function broadcast(room, type, content) {
	let ret = {
		type : type,
		content : content
	};

	let msg = JSON.stringify(ret);

	room.players.forEach(x => {
		x.ws.send(msg);
	});
}

export broadcast;

export function getPlayers(room) {
	let players = room.players.map(x => {
		return {
			id : x.id,
			avatar : x.avatar,
			account : account,
			nickname : nickname,
			bets : bets
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
    console.log('enterRoom id', desk.id, 'account', player.account);
    
	room.players.push(player);

	player.room_id = room.id;

    let content = {
        as_spec: false, 
        player_id: player.account,
        room: {
            id: room.id,
            name: room.name,
            players: getPlayers(room)
        }
    };

	sendMsg(player, 'JoinRoomRe', content);
}

export function leaveRoom(room, player) {
    console.log('leaveRoom id', room.id, 'account', player.account);

    let pos = -1;
	let players = room.players;

    for (let i = 0 ; i < players.length ; i++) {
        if (players[i].account == player.accout) {
			pos = i;
			break;
		}
	}

	if (pos >= 0)
    	players.splice(pos, 1);

	player.room_id = 0;

    let content = {
            player_id: player.id,
            as_spec: player.as_spec,
            room: {
                id: room.id
            }
        }
    };

	sendMsg(player, 'LeaveRoomRe', content);

	// TODO
	//broadcast(room, 'LeaveRoomRe');
}

export function playerBet(room, player, bets) {
    for (let key in bets) {
        if (player.bets[key])
			player.bets[key] += bets[key];
        else
			player.bets[key] = bets[key];
    }

    let content = {
            player_id: player.id,
            result: 1, 
            bet: bets
    };

	broadcast(room, 'PlayerBetRe', content);
}

export function getRecords(room, player) {
    let content = {
            room_id: room.id,
            records: room.records,
    };

	sendMsg(player, 'GetRoomRecordRe', content);
}

export function getRoomRecords(room, player) {
    let now = Math.floor(Date.now() / 1000);

    let content = {
        remaining: room.expired - now,
        current: {
            id: room.round,
            open_round: room.round - 1
        },
        records: room.records,
        bets: [] // TODO
    };

	sendMsg(player, 'GetRoomBaccaratResultRe', content);
}

export function syncClock(room, player) {
    let now = Math.floor(Date.now() / 1000);

    let content = {
        round: room.round,
        remaining: room.expired - now
    };

	sendMsg(player, 'SyncClockRe', content);
}

export function resultPush(room) {

	let content = {
    	remaining : room.interval,
    	next_round : room.round + 1,
    	result : room.result
	};

	broadcast(room, 'RoomResult', content);
}


