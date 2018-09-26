
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


export function addMoney(uid : number, score : number) {
	return User.update(
		{ balance : sequelize.literal('balance+' + score) },
		{ where : { id : uid } }
	 );
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
					create_at : x.created_at
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
				balance : sequelize.literal('balance - ' + amount)
			}, { where : { id : uid, balance : { $gte : amount } }, transaction : t });
		})
		.then(x => {
			if (x[0] !== 1)
				return Promise.reject('转账失败，可能是金额不足');

			return User.update({
				balance : sequelize.literal('balance + ' + amount)
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


