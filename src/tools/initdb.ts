
import sequelize from '../db/db';
import dao from '../dao';

sequelize.sync({ force : true })
.then(() => {
	return sequelize.transaction(t => {
		return sequelize.models['User'].create({
			account : '34598948523',
			password : '1234',
			nickname : '测试',
			phone : '13485492845',
			balance : 9999
		}, { transaction : t })
	});
})
.then(() => {
	return dao['UserDao'].getById(1);
})
.then(u => {
	if (!u) {
		console.log('user 1 not found');
		return true;
	}

	u.nickname = 'test';
	return u.save();
})
.then(() => {
	return sequelize.close();
})
.then(() => {
	console.log('init db done.');
});

