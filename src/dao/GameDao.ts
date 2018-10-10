
import sequelize from '../db/db';

const Game = sequelize.models['Game'];
const GameLog = sequelize.models['GameLog'];
const Promise = sequelize.Promise;

export function createGameLog(uid : number, gid : number, bet : string, amount : number, result : number, desc : string) {
    return GameLog.create({
        user_id : uid,
        game_id : gid,
        bet : bet,
        amount : amount,
        result : result,
        desc : desc
    });
}

export function createGame(rid : number, round : number, result : string) {
    return Game.create({
        room_id : rid,
        round : round,
        result : result  
    });
}

