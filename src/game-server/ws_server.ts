
import * as Token from '../utils/token';
import session_config from '../config/session';
import dao from '../dao';
import * as mroom from './room';
import * as WebSocket from 'ws';

const userDao = dao['UserDao'];
const roomDao = dao['RoomDao'];
const secret = session_config.secret;

interface Player {
	id : number;
	account : string;
	avatar : number;
	room_id : number;
	ws : any;
}

let g_rooms : { [key : number] : any } = {};
let g_players : { [key : number] : Player } = {};

const port : string = process.env.PORT || '4001';
const wss = new WebSocket.Server({ port: Number(port) });

console.log('Listen on ws ' + port);

let handler : any = {};

interface EnterRoomData {
	token : string;
}

handler['enter_room'] = function(data : EnterRoomData, ws : any) {
	
	let token = data.token;
	let ret = Token.parse(token, secret);
	if (!ret) {
		console.log('invalid token');
		return;
	}

	return userDao.getById(ret.uid)
    .then((p : any) => {
        if (!p)
            return true;

        let room_id = 1;
        let player = {
            id : p.id,
            account : p.account,
			nickname : p.nickname,
			balance : p.balance,
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

interface PlayerBetData {
	bet : any;
}

handler['player_bet'] = function(data : PlayerBetData, ws : any) {
    let uid = ws.uid;
    let player = g_players[uid];

    if (!player)
        return;

	let room_id = player.room_id;
    let room = g_rooms[room_id];

	if (room)
		mroom.playerBet(room, player, data.bet);
};

interface PlayerRobData {
    rob : any;
}

handler['player_rob'] = function(data : PlayerRobData, ws : any) {
    let uid = ws.uid;
    let player = g_players[uid];

    if (!player)
        return;

	let room_id = player.room_id;
    let room = g_rooms[room_id];

	if (room)
		mroom.playerRob(room, player, data.rob);
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
        let content = data.data;

		if (!type || !content)
			return;

		let cb = handler[type];
		if (cb)
			cb(content, ws);
    });

    ws.on('close', () => {
		userLeave(ws);
		console.log('user leave');
    });

	console.log('new connection');
});

function loadDeskFromDB() {
	return roomDao.list_rooms(true)
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
    for (let room_id in g_rooms) {
        let room = g_rooms[room_id];
		mroom.tick(room);
    }
}

loadDeskFromDB()
.then(() => {
	setInterval(mainLoop, 100);
	console.log('Start dice main loop');
});


