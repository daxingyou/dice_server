#!/usr/bin/env node

var models = require("../shared/sql_models");
var userDao = require("../shared/sql_dao/userDao");


models.sequelize.sync({force: true}).then(()=>{

    var user_tbl = models["user"];

    console.log(models["usertask"].TASK);

}).then(()=>{
    return models["sysconfig"].bulkCreate([
        {
            name : models["sysconfig"].CONFIG_KEY.NEW_USER_PRIZE,
            value : JSON.stringify({gem: 100, gold: 5, lottery: 5}),
        },
    ]);
}).then(()=>{
    var crypto = require('crypto');
    var shasum = crypto.createHash('sha1');
    shasum.update("free520520");
    var digest = shasum.digest('hex');

    return models["adminuser"].create({
        username : "adminmj",
        password : digest
    });
}).then(()=>{
    return models["gameconfig"].bulkCreate([
        {
            type :"cost_of_room",
            game : "shmj",
            code : "r4-2",
            desc : "4局2人",
            round : 4,
            players_num : 2,
            need_gem : 1,
        },
        {
            type :"cost_of_room",
            game : "shmj",
            code : "r4-4",
            desc : "4局4人",
            round : 4,
            players_num : 4,
            need_gem : 1,
        },
        {
            type :"cost_of_room",
            game : "shmj",
            code : "r8-2",
            desc : "8局2人",
            round : 8,
            players_num : 2,
            need_gem : 2,
        },
        {
            type :"cost_of_room",
            game : "shmj",
            code : "r8-4",
            desc : "8局4人",
            round : 8,
            players_num : 4,
            need_gem : 2,
        },
        {
            type :"cost_of_room",
            game : "shmj",
            code : "r16-2",
            desc : "16局2人",
            round : 16,
            players_num : 2,
            need_gem : 4,
        },
        {
            type :"cost_of_room",
            game : "shmj",
            code : "r16-4",
            desc : "16局4人",
            round : 16,
            players_num : 4,
            need_gem : 4,
        },
        {
            type :"cost_of_room",
            game : 'gzmj',
            code : "g4-2",
            desc : "4局2人",
            round : 4,
            players_num : 2,
            need_gem : 1,
        },
        {
            type :"cost_of_room",
            game : 'gzmj',
            code : "g4-3",
            desc : "4局3人",
            round : 4,
            players_num : 3,
            need_gem : 1,
        },
        {
            type :"cost_of_room",
            game : "gzmj",
            code : "g4-4",
            desc : "4局4人",
            round : 4,
            players_num : 4,
            need_gem : 1,
        },
        {
            type :"cost_of_room",
            game : "gzmj",
            code : "g8-2",
            desc : "8局2人",
            round : 8,
            players_num : 2,
            need_gem : 2,
        },
        {
            type :"cost_of_room",
            game : "gzmj",
            code : "g8-3",
            desc : "8局3人",
            round : 8,
            players_num : 3,
            need_gem : 2,
        },
        {
            type :"cost_of_room",
            game : "gzmj",
            code : "g8-4",
            desc : "8局4人",
            round : 8,
            players_num : 4,
            need_gem : 2,
        },
        {
            type :"cost_of_room",
            game : "gzmj",
            code : "g16-2",
            desc : "16局2人",
            round : 16,
            players_num : 2,
            need_gem : 4,
        },
        {
            type :"cost_of_room",
            game : "gzmj",
            code : "g16-3",
            desc : "16局3人",
            round : 16,
            players_num : 3,
            need_gem : 4,
        },
        {
            type :"cost_of_room",
            game : "gzmj",
            code : "g16-4",
            desc : "16局4人",
            round : 16,
            players_num : 4,
            need_gem : 4,
        }
    ]);
}).then(()=>{
    return models["shopmall"].bulkCreate([
         {
            product_desc : "钻石10颗",
            price : 1000,
            currency : "RMB",
            total_quantity : 9999999,
            logo : "local://gem",
            enabled : true,
            quantity : 10,
            add_money_currency : "gem",
            product_id : 'com.dinosaur.shmj.gem6'
        },
        {
            product_desc : "钻石35颗",
            price : 3000,
            currency : "RMB",
            total_quantity : 9999999,
            logo : "local://gem",
            enabled : true,
            quantity : 35,
            add_money_currency : "gem",
            product_id : 'com.dinosaur.shmj.gem18'
        },
        {
            product_desc : "钻石60颗",
            price : 5000,
            currency : "RMB",
            total_quantity : 9999999,
            logo : "local://gem",
            enabled : true,
            quantity : 60,
            add_money_currency : "gem",
            product_id : 'com.dinosaur.shmj.gem30'
        },
        {
            product_desc : "钻石150颗",
            price : 10000,
            currency : "RMB",
            total_quantity : 9999999,
            logo : "local://gem",
            enabled : true,
            quantity : 150,
            add_money_currency : "gem",
            product_id : 'com.dinosaur.gem68'
        },
        {
            product_desc : "钻石150颗",
            price : 5000,
            currency : "RMB",
            total_quantity : 9999999,
            logo : "local://gem",
            enabled : true,
            quantity : 150,
            add_money_currency : "gem",
            product_id : 'com.dinosaur.gem68',
            dealer : true
        },
        {
            product_desc : "钻石320颗",
            price : 10000,
            currency : "RMB",
            total_quantity : 9999999,
            logo : "local://gem",
            enabled : true,
            quantity : 320,
            add_money_currency : "gem",
            product_id : 'com.dinosaur.gem68',
            dealer : true
        },
        {
            product_desc : "钻石650颗",
            price : 20000,
            currency : "RMB",
            total_quantity : 9999999,
            logo : "local://gem",
            enabled : true,
            quantity : 650,
            add_money_currency : "gem",
            product_id : 'com.dinosaur.gem68',
            dealer : true
        },
        {
            product_desc : "钻石1000颗",
            price : 30000,
            currency : "RMB",
            total_quantity : 9999999,
            logo : "local://gem",
            enabled : true,
            quantity : 1000,
            add_money_currency : "gem",
            product_id : 'com.dinosaur.gem68',
            dealer : true
        }
    ]);
})
.then(()=>{
    return models["currency"].bulkCreate([
        {
            code : "RMB",
            desc : "人民币"
        },
        {
            code : "lottery",
            desc : "奖券"
        },
        {
            code : "active_day",
            desc : "日活跃值"
        },
        {
            code : "active_week",
            desc : "周活跃值"
        },
        {
            code : "active",
            desc : "活跃值"
        },
        {
            code : "gem",
            desc : "钻石"
        },
        {
            code : "gold",
            desc : "金币"
        }
    ]);
})
.then(()=>{
    return models["prize_type"].bulkCreate([
        {
            prize_desc : "1等奖",
            prize_logo : "http://lv1.jpg",
            prize_currency : "gem",
            prize_amount : 1,
            is_wheel : true,
            possibility : 100,
            enabled: true
        },
        {
            prize_desc : "2等奖",
            prize_logo : "http://lv1.jpg",
            prize_currency : "gem",
            prize_amount : 2,
            is_wheel : true,
            possibility : 50,
            enabled: true
        },
        {
            prize_desc : "3等奖",
            prize_logo : "http://lv1.jpg",
            prize_currency : "gem",
            prize_amount : 3,
            is_wheel : true,
            possibility : 10,
            enabled: true
        },
        {
            prize_desc : "4等奖",
            prize_logo : "http://lv1.jpg",
            prize_currency : "gem",
            prize_amount : 4,
            is_wheel : true,
            possibility : 5,
            enabled: true
        },
        {
            prize_desc : "5等奖",
            prize_logo : "http://lv1.jpg",
            prize_currency : "gem",
            prize_amount : 5,
            is_wheel : true,
            possibility : 2,
            enabled: true
        },
        {
            prize_desc : "6等奖",
            prize_logo : "http://lv1.jpg",
            prize_currency : "gem",
            prize_amount : 6,
            is_wheel : true,
            possibility : 1,
            enabled: true
        },
        {
            prize_desc : "7等奖",
            prize_logo : "http://lv1.jpg",
            prize_currency : "gem",
            prize_amount : 7,
            is_wheel : true,
            possibility : 1,
            enabled: true
        },
        {
            prize_desc : "8等奖",
            prize_logo : "http://lv1.jpg",
            prize_currency : "gem",
            prize_amount : 8,
            is_wheel : true,
            possibility : 1,
            enabled: true
        },
        {
            prize_desc : "电饭锅",
            prize_logo : "http://lv1.jpg",
            prize_currency : null,
            prize_amount : 1,
            is_wheel : false,
            possibility : 0,
            exchange_price : 100,
            exchange_currency : "lottery",
            enabled: true
        },
        {
            prize_desc : "钻石2个",
            prize_logo : "local://gem",
            prize_currency : "gem",
            prize_amount : 2,
            is_wheel : false,
            possibility : 0,
            exchange_price : 10,
            exchange_currency : "lottery",
            enabled: true
        },
        {
            prize_desc : "钻石10个",
            prize_logo : "local://gem",
            prize_currency : "gem",
            prize_amount : 10,
            is_wheel : false,
            possibility : 0,
            exchange_price : 50,
            exchange_currency : "lottery",
            enabled: true
        }

    ]);
})
.then(()=>{
    return models["message"].bulkCreate([
        {
            type: 'notice',
            msg: '用户应依法在游戏平台中合理、健康的进行游戏娱乐，若在游戏过程中发现诈骗、赌博等违法行为，有义务向官方或警方举报。'
        },
        {
            type: 'invest',
            msg: '招商信息请填写'
        }
    ]);
})
.then(()=>{
    return models.sequelize.close();
});
