
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

	@Column({
		allowNull : false,
	})
	type : string;

	@Column({
		allowNull : false
	})
	config : string;

	@Column({
		defaultValue : true,
		allowNull : false
	})
	enabled : boolean;

    @Column({
        defaultValue : 0,
        allowNull : false
    })
    balance : number;

    @Column({
        defaultValue : 1,
        allowNull : false
    })
    round : number;

    @Column({
        defaultValue : 0,
        allowNull : false
    })
    tax : number;
}

