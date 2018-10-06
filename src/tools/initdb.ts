
import * as crypto from 'crypto';
import sequelize from '../db/db';

const models = sequelize.models;

sequelize.sync({ force : true })
.then(() => {
	return models['User'].create({
		account : '19106276',
		password : '96e79218965eb72c92a549dd5a330112',
		nickname : '茅十八',
		phone : '13485492845',
		balance : 99923893
	});
})
.then(() => {
	return models['User'].create({
        account : '07559576',
        password : '96e79218965eb72c92a549dd5a330112',
        nickname : '888娱乐城微信',
        phone : '13485492845',
        balance : 99923334,
		is_agent : true,
		wechat : '986539376'
	});
})
.then(() => {
	return models['Room'].create({
		name : '一号房',
		server : '娱乐一区',
		type : 'dice',
		config : '{}'
	});
})
.then(() => {
    let password = 'free520520';
    let digest = crypto.createHash('sha1').update(password).digest('hex');

    return models["Admin"].create({
        username : "admin",
        password : digest
    });
})
.then(() => {
	return sequelize.close();
})
.then(() => {
	console.log('init db done.');
});

