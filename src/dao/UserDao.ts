
import sequelize from '../db/db';

const User = sequelize.models['User'];

export function getById(uid : number) {
	let opt = { where : { id : uid } };

	return User.findOne(opt);
}

