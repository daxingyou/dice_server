
import sequelize from '../db/db';

const Room = sequelize.models['Room'];

export function list_rooms(enabled : boolean | undefined) {
	if (enabled == undefined)
		return Room.all();
	else
		return Room.all({ where : { enabled : enabled } });
}


