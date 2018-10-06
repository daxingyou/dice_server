#!/usr/bin/env node

let db = require("../shared/sql_models");

let userid = process.argv[2];
let old_uid = process.argv[3];

let old_user = null;
let new_user = null;

return db.sequelize.transaction(t => {
    return db['user'].findOne({ where : { id: userid } })
    .then(u => {
        if (!u) {
            console.log('user not found:' + userid);
            return false;
        }
    
        new_user = u;
 
        let opt = null;

        if (old_uid != null)
            opt = { where : { id : old_uid } };
        else
            opt = { where : { nickname: u.nickname, id : { $ne : userid } } };

        return db['user'].all(opt);
    })
    .then(us => {
        if (!us) {
            console.log('user not found: ' + new_user.nickname);
            return false;
        }
    
        if (us.length != 1) {
            console.log('user found more: ' + us.length);
            return false;
        }
    
        old_user = us[0];
    
        return db['userclub'].destroy({ where : { user_id: userid }, transaction: t });
    })
    .then(() => {
        return db['club_message'].destroy({ where : { user_id: userid }, transaction: t });
    })
    .then(() => {
        return db['user'].destroy({ where : { id: userid }, transaction: t });
    })
    .then(() => {
        return db['user'].update({ auth_id : new_user.auth_id }, { where:  { id : old_user.id }, transaction: t });
    })
    .then(() => {
        return db['dealer'].update({ auth_id : new_user.auth_id }, { where : { auth_id : old_user.auth_id }, transaction: t });
    })
    .then(() => {
        return db['dealer'].update({ upper : new_user.auth_id }, { where : { upper : old_user.auth_id }, transaction : t });
    })
    .then(() => {
        return db['invest'].update({ wechat : new_user.auth_id }, { where : { wechat : old_user.auth_id }, transaction: t });
    })
    .then(()=>{
        console.log('revert done.');
    });
})
.then(() => {
    return db.sequelize.close();
})
.catch(err=> {
    return db.sequelize.close();
});



