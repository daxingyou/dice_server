
import sequelize from '../db/db';

sequelize.sync({ force : true })
.then(() => {
	return sequelize.models['User'].create({
		account : '19106276',
		password : '96e79218965eb72c92a549dd5a330112',
		nickname : '茅十八',
		phone : '13485492845',
		balance : 99923893
	});
})
.then(() => {
	return sequelize.models['User'].create({
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
	return sequelize.models['Room'].create({
		name : '一号房',
		server : '娱乐一区',
		type : 'dice',
		config : '{}'
	});
})
.then(() => {
	return sequelize.close();
})
.then(() => {
	console.log('init db done.');
});

