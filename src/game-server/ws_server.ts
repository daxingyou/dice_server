
interface Player {
	id : number;
	account : string;
	avatar : number;
	room_id : number;
	ws : any;
}

let g_rooms : { [key : number] : any } = {};
let g_players : { [key : number] : Player } = {};

import * as mroom from './room';
import dao from '../dao';
import * as WebSocket from 'ws';

const wss = new WebSocket.Server({ port: 4001 });

console.log('Listen on ws 4001');

let handler : any = {};

interface EnterRoomContent {
	token : string;
}

handler['enter_room'] = function(content : EnterRoomContent, ws : any) {
    return dao['UserDao'].get_player_by_token(content.token)
    .then((p :any) => {
        if (!p)
            return true;

        let room_id = 1;

        let player = {
            id : p.id,
            account : p.account,
            avatar : p.avatar,
            room_id : room_id,
            ws : ws
        };

        g_players[p.id] = player;
        ws.uid = p.id;

        let room = g_rooms[room_id];

        if (room)
            mroom.enterRoom(room, player);
    })
    .catch((err : any)=> {
        console.log('enter_room err: ' + err);
    });
};

interface PlayerBetContent {
	bet : any;
}

handler['player_bet'] = function(content : PlayerBetContent, ws : any) {
    let uid = ws.uid;
    let player = g_players[uid];

    if (!player)
        return;

	let room_id = player.room_id;
    let room = g_rooms[room_id];

	if (room)
		mroom.playerBet(room, player, content.bet);
};

handler['player_rob'] = function(content : any, ws : any) {
	// TODO
}

handler['sync_clock'] = function() {
	// TODO
};

function userLeave(ws : any) {
	let uid = ws.uid;
	if (!uid)
		return;

	let player = g_players[uid];
	if (!player)
		return;

	delete g_players[uid];

	let room = g_rooms[player.room_id];

	if (room)
		mroom.leaveRoom(room, player);
}

wss.on('connection', (ws: WebSocket) => {
    ws.on('message', (message: string) => {
        console.log('received: %s', message);
        let data = JSON.parse(message);

		let type = data.type;
        let content = data.content;

		if (!type || !content)
			return;

		let cb = handler[type];
		if (cb)
			cb(content, ws);
    });

    ws.on('close', () => {
		userLeave(ws);
    });
});

function loadDeskFromDB() {
	return dao['RoomDao'].list_rooms(true)
    .then((rooms : any) => {
		rooms.forEach((rm : any) => {
			let room = mroom.createRoom(rm);

			if (room)
				g_rooms[rm.id] = room;
		});
    })
    .catch((err : any) => {
        console.log(err);
    });
}

function mainLoop() {
    let now = Math.floor(Date.now() / 1000);
    for (let room_id in g_rooms) {
        let room = g_rooms[room_id];
		mroom.tick(room);
    }
}

loadDeskFromDB();
setInterval(mainLoop, 1000);

console.log('Start dice main loop');

