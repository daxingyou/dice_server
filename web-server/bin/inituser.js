#!/usr/bin/env node

let models = require("../shared/sql_models");
let userDao = require("../shared/sql_dao/userDao");


let head = "http://wx.qlogo.cn/mmopen/dWYcndbpDnYz1901s7WJ7dMrKtGo3eodSaZHicTTRqt1cMzwiakrcPNXRU4dRdicHZCTcTLxBrfSHEJdib8uE8Pic9MqGpjwuZPBW/0";

let new_users = [ ];

let count = 3;

for (let n = 0;n < count; n++)
{   
    let r = true ; 
    if ( n < 4 )
        r = false;
    new_users.push({
        name : "test" + n,
        nickname : "测试" + n,
        sex : "male",
        logo : head,
        is_robot : r,
    });
}

function create_user(n, t)
{
    if ( n < new_users.length )
    {
        let data = new_users[n];
        return userDao.create_and_update(data.name, data.nickname, data.sex, data.logo, t, data.is_robot)
        .then(()=>{
            return create_user(n+1,t);
        });
    } else {
        return true;
    }
}


return models.sequelize.transaction(function(t){
    return create_user(0,t);
})
.then(()=>{
    return models["user"].update({
        gem_coin : 90000000,
        gold_coin : 90000000,
        lottery : 90000000,
    },
    {
        where : {
            id : { $gt : 0 }
        }
    })
})
.then(()=>{
    return models.sequelize.close();
});
