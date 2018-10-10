
import { Model, Table, Column, ForeignKey, BelongsTo, DataType } from 'sequelize-typescript'
import User from './User';
import Game from './Game';

@Table({
	tableName : 'game_log'
})
export default class GameLog extends Model<GameLog> {

    @Column({
       type : DataType.ENUM('small','big','banker'),
       allowNull : false
    })
    bet : string;

    @Column({
        allowNull : false
    })
    amount : number;

    @Column({
        allowNull : false
    })
    result : number;

    @Column
    desc : string;

    @ForeignKey(() => User)
    @Column
    user_id : number;

    @BelongsTo(() => User)
    user : User;

    @ForeignKey(() => Game)
    @Column
    game_id : number;

    @BelongsTo(() => Game)
    game : Game;
}

