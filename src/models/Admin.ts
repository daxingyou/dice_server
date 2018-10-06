
import { Model, Table, Column } from 'sequelize-typescript'

@Table({
	tableName : 'admin'
})
export default class Admin extends Model<Admin> {
    @Column({
        unique : true
    })
    username : string;

    @Column
    password : string;

    @Column
    last_login : Date;
}

