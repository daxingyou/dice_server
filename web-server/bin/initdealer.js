#!/usr/bin/env node

let db = require("../shared/sql_models");

return db.sequelize.transaction(t => {
    return db['dealer'].bulkCreate([
        {
            auth_id : 'test2'
        }
    ]);
})
.then(() => {
    return db.sequelize.close();
});

