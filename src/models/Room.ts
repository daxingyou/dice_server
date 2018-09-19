
import { Model, Table, Column } from 'sequelize-typescript'

@Table({
	tableName : 'room'
})
export default class Room extends Model<Room> {
	@Column({
		allowNull : false
	})
	name : string

	@Column
	server : string;

	@Column
	config : string;

	@Column({
		defaultValue : true,
		allowNull : false
	})
	enabled : boolean;
}

