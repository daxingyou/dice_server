
import sequelize from '../db/db';

const Admin = sequelize.models['Admin'];
const Promise = sequelize.Promise;

export function getAdmin(username : string, password : string) {
    return Admin.findOne({ where : { username : username, password : password } });
}

export function passwd(pass : string) {
    return Admin.update({
        password : pass
    }, { where : { id : 1 } });
}

