
let g_rooms = {};
let g_players = {};

import * as mroom from './room';
import dao from '../dao';
import * as WebSocket from 'ws';

const wss = new WebSocket.Server({ port: 4001 });

console.log('Listen on ws 4001');

let handler = {};

handler['entry'] = function(content, ws) {
	// 1. 取出token，并验证

	// 2. 得到uid, 获得玩家信息，绑定到ws
};

handler['enter_room'] = function(content, ws) {
/*
            return store.get_player_by_token(params.token)
            .then( item => {
                if (!item) return ;
                let desk_id = params.room_id;
                ws.account = item.account
                g_players[item.account] = {
                    ws: ws, 
                    desk_id: desk_id, 
                    id: item.id, 
                    account: item.account, 
                    avatar: 'http://wx.qlogo.cn/mmopen/dWYcndbpDnYz1901s7WJ7dMrKtGo3eodSaZHicTTRqt1cMzwiakrcPNXRU4dRdicHZCTcTLxBrfSHEJdib8uE8Pic9MqGpjwuZPBW/0',
                    bets: []
                };
                mdesk.joinDesk(g_desks[desk_id], g_players[account]);
            })
            .catch(err => {
                console.log(err);
            });
*/
};

handler['player_bet'] = function(content, ws) {
/*
	mdesk.playerBet(g_players[ws.account], params);
*/
};

handler['player_rob'] = function(content, ws) {

}

handler['sync_clock'] = function() {
/*
	mdesk.syncClock(g_desks[params.table_id], g_players[ws.account]);
*/
};

function userLeave(ws) {
/*
        let account = ws.account;
        if (!account) return;
        let player = g_players[account];
        delete g_players[account];
        mdesk.leaveDesk(g_desks[player.desk_id], player);
*/
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
    .then(rooms => {
		rooms.forEach(rm => {
			let room = mroom.createRoom(rm);

			if (room)
				g_rooms[rm.id] = room;
		});
    })
    .catch(err => {
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

