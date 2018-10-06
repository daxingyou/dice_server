
import * as crypto from 'crypto';
import dao from '../../dao';

const adminDao = dao['AdminDao'];
const userDao = dao['UserDao'];
const Promise = dao.sequelize.Promise;
const models = dao.sequelize.models;

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

export function list_all_user() {
    return userDao.listAllUser()
    .then((us : any[]) => {
        console.log('us.length: ' + us.length);

        return {
            users : us.map(u=>u.dataValues)
        };
    });
}

export function update_user_info(data : any) {
    return models['User'].update({
        is_agent : data.is_agent,
        balance : data.balance
    }, {
        where : { id : data.id }
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

const exp : any = {
	'login' : login,
    'logout' : logout,
    'list_all_user' : list_all_user,
    'update_user_info' : update_user_info,
    'query_records' : query_records
};

export default exp;

