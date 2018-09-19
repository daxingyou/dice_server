
import { Model, Table, Column, HasMany } from 'sequelize-typescript'
import UserLog from './UserLog';

@Table({
	tableName : 'user'
})
export default class User extends Model<User> {
	@Column({
		unique : true,
		allowNull : false
	})
	account: string;

	@Column({
		allowNull : false
	})
	password: string;

	@Column
	nickname: string;

	@Column
	phone: string;

	@Column
	icon: number;

	@Column({
		allowNull : false,
		defaultValue : 0
	})
	balance: number;

	@Column({
		allowNull : false,
		defaultValue : 0
	})
	total_recharge: number;

	@Column
	is_agent : boolean;

	@HasMany(() => UserLog)
	userlogs : UserLog[];
}


