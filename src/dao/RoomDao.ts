
import sequelize from '../db/db';

const Room = sequelize.models['Room'];

export function list_rooms(enable : boolean | undefined) {
	if (enable == undefined)
		return Room.all();
	else
		return Room.all({ where : { enable : enable } });
}


