#!/usr/bin/env node

let db = require("../shared/sql_models");
let Promise = db.Promise;

let uid = process.argv[2];
let count = process.argv[3];

return db.sequelize.transaction(t => {
    return db['user'].findById(uid)
    .then(u => {
        if (!u)
            return Promise.reject('玩家未找到' + uid);

        return db['dealer'].update({
            gem_coin : db.sequelize.literal('gem_coin + ' + count)
        }, { where : { auth_id : u.auth_id }, transaction : t });
    });
})
.then(() => {
    console.log('add success!');
    return db.sequelize.close();
})
.catch (err => {
    console.log('err : ' + err);
    return db.sequelize.close();
});

