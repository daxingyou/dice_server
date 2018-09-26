
import md5 from '../../utils/md5';
import * as Token from '../../utils/token';
import dao from '../../dao';
import session_config from '../../config/session'

const userDao = dao['UserDao'];
const sequelize = dao.sequelize;

interface LoginParams {
    account: string;
    noice: string;
    sign: string;
}

export function login(params : LoginParams) {
	let account = params.account;

	return userDao.getByAccount(account)
    .then((u : any) => {
        if (!u)
            return { code: 404,  msg: 'not found' };

		let sign = md5(u.password + params.noice);
        if (sign != params.sign)
            return { code: 401,  msg: 'err password' };

		let token = Token.create(u.id, Date.now(), session_config.secret);

        return {
			code: 0,
			data: {
            	id: u.id,
            	token: token,
				account : account,
            	nickname: u.nickname,
				avatar : u.avatar,
            	balance: u.balance 
        	}
		};
    });
}

function generateAccount() {
	let ret = '';

	for (let i = 0; i < 8; i++)
		ret += Math.floor(Math.random() * 1000) % 10;

	return ret;
}

interface RegisterParams {
	account : string;
    nickname: string;
    password: string;
}

export function register(params : RegisterParams) {

	return userDao.createUser({
		account : params.account,
		nickname : params.nickname,
		password : params.password
	})
	.then(() => {
		return { code : 0 };
	})
	.catch (sequelize.UniqueConstraintError, (err : any) => {
		return { code : 500, msg : '账号已存在，请修改账号后重新注册' };
	})
	.catch ((err : any) => {
		return { code : 500, msg : err };
	});
};

export function random() {

	let doCreate = () => {
		let account = generateAccount();

		return userDao.getByAccount(account)
		.then((u : any) => {
			if (!u)
				return account;

			return doCreate();
		});
	};

	return doCreate()
	.then((account : any) => {

		return {
			code : 0,
			data : {
				account : account,
				nickname : '茅十八'
			}
		};
	})
	.catch((err : any) => {
		return { code : 500, msg : err };
	});
}

const exp : any = {
	'register' : register,
	'login' : login,
	'random' : random
};

export default exp;

