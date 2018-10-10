
import md5 from '../../utils/md5';
import * as crypto from 'crypto';
import dao from '../../dao';
import redis from '../../utils/redis';

const adminDao = dao['AdminDao'];
const userDao = dao['UserDao'];
const roomDao = dao['RoomDao'];
const sequelize = dao.sequelize;
const Promise = sequelize.Promise;
const models = sequelize.models;

interface LoginParam {
    username : string;
    password : string;
}

export function login(param : LoginParam) {
    let pass = crypto.createHash('sha1').update(param.password).digest('hex');

    return adminDao.getAdmin(param.username, pass)
    .then((u : any) => {
        if (!u)
            return Promise.reject("user not exist");
        else
            return { errcode : 0, uid : u.id };
    });
}

export function logout(data : any) {
    return new Promise((resolve : any, reject : any) => {
        return resolve(true);
    });
}

interface passwdParam {
    password : string;
}

export function passwd(param : passwdParam) {
    let pass = crypto.createHash('sha1').update(param.password).digest('hex');

    console.log('password: ' + param.password);

    return adminDao.passwd(pass)
    .then(() => {
        console.log('passwd done');
        return { errcode : 0 };
    })
    .catch((err : any) => {
        console.log('passwd err=' + err);
        return { errcode : 500, errmsg : '修改失败' };
    });
}

export function list_all_user() {
    return userDao.listAllUser()
    .then((us : any[]) => {
        return {
            users : us.map(u=>u.dataValues)
        };
    });
}

export function list_all_room() {
    return roomDao.list_rooms()
    .then((rs : any[]) => {
        return {
            rooms : rs.map(r => r.dataValues)
        };
    });
}

export function update_user_info(data : any) {
    let id = data.id; 
    let balance = data.balance;   
    let account : string;
    let off = 0;

    return sequelize.transaction((t : any) => {
        return models['User'].findById(id)
        .then((u : any) => {
            if (!u)
                return Promise.reject('user not exist');

            account = u.account;
            off = balance - u.balance;

            let up : any = {
                balance : balance,
                is_agent : data.is_agent,
                wechat : data.wechat,
            };

            if (data.password != u.password)
                up['password'] = md5(data.password);

            if (off > 0)
                up['total_recharge'] = sequelize.literal('total_recharge + ' + off);
            else if (off < 0)
                up['total_withdraw'] = sequelize.literal('total_withdraw + ' + (0 - off));

            return u.update(up, { transaction : t });
        })
        .then(() => {
            if (off == 0)
                return true;

            return models['UserLog'].create({
                type : 'transfer',
                account : '100001',
                target : account,
                amount : off
            }, { transaction : t });
        });
    });
}

function list_transfer_records(account : string) {
    let where_opt : any = {
        '$or' : [
            { target : account },
            { account : account }
        ]
    };

    return models['UserLog'].all({
        where : where_opt,
        order :[ [ 'created_at', 'DESC' ] ]
    });
}

function list_game_records(uid : number) {
    return models['GameLog'].all({
        where : { user_id :uid },
        order :[ [ 'created_at', 'DESC' ] ],
        include : [ models['User'], models['Game'] ]
    })
    .then((gs : any) => {
        return gs.map((x : any) => {
            return {
                bet : x.bet,
                amount : x.amount,
                result : x.result,
                desc : x.desc,
                created_at : x.created_at,
                room_id : x.game ? x.game.room_id : 0,
                round : x.game ? x.game.round : 0,
                game_result : x.game ? x.game.result : '',
                account : x.user ? x.user.account : '',
                nickname : x.user ? x.user.nickname : ''
            };
        });
    });
}

export function query_records(data : any) {
    let type = data.type;
    let account = data.account;

    return userDao.getByAccount(account)
    .then((u : any) => {
        if (!u)
            return Promise.reject('玩家未找到' + account);

        let uid = u.id;
        if (type == 'transfer')
            return list_transfer_records(account);
        else
            return list_game_records(uid);
    });
}

interface SetParamParam {
    name : string;
    value : number;
}

export function set_param(param : SetParamParam) {
    
}

export function next_result(data : any) {
    const KEY = 'next_result';

    return redis.set(KEY, data.result)
    .then(() => {
        return { errcode : 0 };
    })
    .catch(err => {
        console.log('set err: ' + err);
    });
}

const exp : any = {
	'login' : login,
    'logout' : logout,
    'passwd' : passwd,
    'list_all_user' : list_all_user,
    'list_all_room' : list_all_room,
    'update_user_info' : update_user_info,
    'query_records' : query_records,
    'next_result' : next_result
};

export default exp;

