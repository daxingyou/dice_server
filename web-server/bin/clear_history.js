#!/usr/bin/env node

let db = require("../shared/sql_models");

return db.sequelize.transaction(t => {
    let today = new Date();
    let days = 7;

    today.setHours(0);
    today.setMinutes(0);
    today.setSeconds(0);
    today.setMilliseconds(0);
    
    let unix = today.getTime();

    unix -= days * 24 * 3600 * 1000;

    let wopt = { created_at : { $lt : unix } };

    return db['game_history'].destroy({
        where : wopt,
        transaction : t
    })
    .then(() => {
        return db['game_archive'].destroy({
            where : wopt,
            transaction : t
        });
    })

})
.then(()=>{
    return db.sequelize.close();
});



