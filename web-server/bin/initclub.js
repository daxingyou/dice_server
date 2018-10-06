#!/usr/bin/env node

let db = require("../shared/sql_models");
let userDao = require("../shared/sql_dao/userDao");
let clubDao = require("../shared/sql_dao/clubDao");

let club_id = null;

return db['club'].bulkCreate([
    {
        name : '指上游',
        desc : '指上游私人房'
    },
    {
        name : '决战到天明',
        desc : '上海敲麻圈子',
        owner : 100002
    }
])
.then((x)=>{
    let club_id = 10002;

    return db['userclub'].bulkCreate([
        {
            user_id : 100002,
            club_id : club_id,
            is_admin : true,
        },
    ]);
})
.then(()=>{
    return db.sequelize.close();
});

