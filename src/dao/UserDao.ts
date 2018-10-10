
import sequelize from '../db/db';

const User = sequelize.models['User'];
const UserLog = sequelize.models['UserLog'];
const Promise = sequelize.Promise;

export function getById(uid : number) {
	let opt = { where : { id : uid } };

	return User.findOne(opt);
}

export function getByAccount(account : string) {
	let opt = { where : { account : account } };

	return User.findOne(opt);
}

interface CreateUserParams {
	account : string;
	nickname : string;
	password : string;
}

export function createUser(param : CreateUserParams) {
	return User.create({
		account : param.account,
		nickname : param.nickname,
		password : param.password
	});
}

export function setup(uid : number, nickname: string, avatar : string) {
    return User.update({
        nickname : nickname,
        avatar : avatar,
    }, { where : { id : uid } });
}

export function login(uid : number) {
    return User.update({
        last_login : Date.now(), is_login : true
    }, { where : { id : uid } });
}

export function logout(uid : number) {
    return User.update({
        is_login : false
    }, { where : { id : uid } });
}

export function addMoney(uid : number, score : number) {
    let opt : any = { id : uid };

    if (score < 0)
        opt['balance'] = { $gte : (0 - score) };

	return User.update(
		{
            balance : sequelize.literal('balance+' + score),
            total_win : sequelize.literal('total_win+' + score)
        },
		{ where : opt }
	)
    .then(x => {
        if (x[0] !== 1) {
            console.log('uid: ' + uid + ' score: ' + score);
            return Promise.reject('余额不足');
        }

        return Promise.resolve(true);
    });
}

export function listDealers() {
	return User.all({ where : { is_agent : true } })
	.then(us => {
		return us.map(u => {
			return {
				uid : u.id,
				nickname : u.nickname,
				wechat : u.wechat
			};
		});
	});
}

export function listDealerRecords(uid : number, page : number) {
	let limit = 10;
	let offset = page * limit;

	return User.findById(uid)
	.then(u => {
		if (!u)
			return { count : 0, rows : [] };

		let account = u.account;
		let where_opt : any = {
			'$or' : [
				{ target : account },
				{ account : account }
			]
		};

		return UserLog.findAndCount({
			where : where_opt,
			order : [ [ 'created_at', 'DESC' ] ],
			offset : offset,
			limit : limit
		})
		.then((ret : any) => {
			let data : any = {
				count : ret.count
			};

			data.rows = ret.rows.map((x : any) => {
				return {
					id : x.id,
					account : x.account,
					target : x.target,
					amount : x.amount,
					create_at : x.created_at.getTime() / 1000
				};
			});

			return data;
		});
	});
}

export function transfer(uid : number, to : string, amount : number) {
	let account : string;

	return sequelize.transaction((t : any) => {
		return User.findById(uid)
		.then(u => {
			if (!u)
				return Promise.reject('用户不存在' + uid);

			account = u.account;

			return User.update({
				balance : sequelize.literal('balance - ' + amount),
                total_withdraw : sequelize.literal('total_withdraw + ' + amount)
			}, { where : { id : uid, balance : { $gte : amount } }, transaction : t });
		})
		.then(x => {
			if (x[0] !== 1)
				return Promise.reject('转账失败，可能是金额不足');

			return User.update({
				balance : sequelize.literal('balance + ' + amount),
                total_recharge : sequelize.literal('total_recharge + ' + amount)
			}, { where : { account : to }, transaction : t });
		})
		.then(x => {
			if (x[0] !== 1)
				return Promise.reject('转账失败，ID不存在: ' + to);

			return UserLog.create({
				type : 'transfer',
				account : account,
				target : to,
				amount : amount
			});
		});
	});
}

export function listAllUser() {
    return User.all();
}

