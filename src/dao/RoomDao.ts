
import sequelize from '../db/db';

const Room = sequelize.models['Room'];

export function list_rooms(enabled : boolean | undefined) {
	if (enabled == undefined)
		return Room.all();
	else
		return Room.all({ where : { enabled : enabled } });
}

export function updateResult(id : number, score : number, round : number, tax : number) {
    return Room.update({
        balance : sequelize.literal('balance + ' + score),
        tax : sequelize.literal('tax + ' + tax),
        round : round
    }, { where : { id : id } });
}

