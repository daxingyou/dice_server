
import { Model, Table, Column, ForeignKey, BelongsTo, DataType, HasMany } from 'sequelize-typescript'
import GameLog from './GameLog';

@Table({
	tableName : 'game'
})
export default class Game extends Model<Game> {

    @Column
    room_id : number;

    @Column({
        allowNull : false
    })
    round : number;

    @Column({
        allowNull : false
    })
    result :string;

    @HasMany(() => GameLog)
    game_logs : GameLog[];
}

