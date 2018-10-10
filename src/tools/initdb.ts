
import * as crypto from 'crypto';
import sequelize from '../db/db';

const models = sequelize.models;

sequelize.sync({ force : true })
.then(() => {
	return models['User'].create({
        account : '100001',
        password : 'beeef10d70fa32ae25ea739740d19cd0',
        nickname : '888娱乐城',
        phone : '',
        balance : 0,
		is_agent : true,
		wechat : ''
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

