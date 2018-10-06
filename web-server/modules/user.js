var db = require("../shared/sql_models");
var userDao = require("../shared/sql_dao/userDao.js");
var shopDao = require("../shared/sql_dao/shopDao.js");
var Code = require("../shared/code.js");
var dealerDao = require("../shared/sql_dao/dealerDao.js");
var sysDao = require("../shared/sql_dao/sysDao.js");
let dateformat = require('dateformat');

let exp = module.exports;

exp.login = function(data){

    var crypto = require('crypto');
    var shasum = crypto.createHash('sha1');
    shasum.update(data.password);
    var digest = shasum.digest('hex');

    return db["adminuser"].findOne({ where :
        {
            "username" : data.username ,
            "password" : digest
        }
    })
    .then(u=>{
        if ( !u )
            return Promise.reject("not exist");
        else {
            var ret = { errcode : Code.OK , uid : u.id };
            return ret;
        }
    });
};

exp.logout = function(data, callback){
    return new Promise(function(resolve,reject){
        resolve(true);
    });
};

exp.list_game_config = function(data){
    return db["gameconfig"].findAll()
    .then(gs=>{
        return gs.map(function(gc){
            return {
                id : gc.id,
                type : gc.type,
                game : gc.game,
                desc : gc.desc,
                code : gc.code,
                round : gc.round,
                need_gem : gc.need_gem,
                fan_score : gc.fan_score,
                fan_gold : gc.fan_gold
            }
        });
    })

};

exp.update_game_config = function(data){
    return db["gameconfig"].findOne({
        where : { id : data.id }
    })
    .then(gc=>{
        var up = {};
        if ( gc.type == "cost_of_room")
            up = { need_gem : data.need_gem };
        else {
            up = {
                fan_score : data.fan_score,
                fan_gold : data.fan_gold
            };
        }
        return gc.update(up);
    })
    .then(ret=>{
        if ( ret )
            return true;
        else
            return Promise.reject("update wrong");
    })
};

exp.add_game_config = function(data) {
    return db['gameconfig'].create({
        type: 'fan',
        code: data.code,
        desc: data.desc,
        round: 0,
        need_gem: 0,
        fan_score: data.fan_score,
        fan_gold: data.fan_gold
    })
    .then(ret=>{
        if ( ret )
            return true;
        else
            return Promise.reject("add wrong");
    })
    .catch(err=>{
        console.log(err);
    });
};

exp.update_shopmall_config = function(data){
    return db["shopmall"].findOne({
        where : { id : data.id }
    })
    .then(gc=>{
        var up = {
            product_desc : data.product_desc,
            price : data.price,
            quantity : data.quantity,
            enabled : data.enabled
        };
        return gc.update(up);
    })
    .then(ret=>{
        if ( ret )
            return true;
        else
            return Promise.reject("update wrong");
    })
};

exp.add_shopmall_config = function(data){
    return db["shopmall"].create({
        product_desc : data.product_desc,
        price : data.price,
        currency : "RMB",
        total_quantity : 9999999,
        logo: "local://gem",
        quantity : data.quantity,
        enabled : data.enabled,
        add_money_currency : "gem",
        dealer : data.dealer
    })
    .then(ret=>{
        if ( ret )
            return true;
        else
            return Promise.reject("add wrong");
    })
};


exp.list_goods_from_shop = function(data){

    return db["shopmall"].findAll({ where : { currency : "RMB" } })
    .then(all_goods => {
        return all_goods.map(function(goods){
            return {
                id : goods.id,
                product_desc : goods.product_desc,
                price : goods.price,
                currency : goods.currency,
                quantity : goods.quantity,
                add_money_currency : goods.add_money_currency,
                logo : goods.logo,
                dealer : goods.dealer,
                enabled : goods.enabled
            };
        });
    })
};

exp.list_daily_task_type = function(data){

    return db["task_type"].findAll({where:{type :"daily"}})
    .then(all_types=>{
        return all_types.map(t=>t.dataValues);
    })
};


exp.update_task_config = function(data){
    return db["task_type"].update(
        {
            desc : data.desc ,
            logo : data.logo,
            max_count : data.max_count,
            reward : data.reward,
            currency_code : data.currency_code,
            enabled : data.enabled
        },
        { where : { id : data.id }}
    )
    .then(ret=>{
        if ( ret )
            return true;
        else
            return Promise.reject("add wrong");
    })
};

exp.list_all_prize = function(data){

    return db["prize_type"].findAll({})
    .then(ret=>{
        return ret.map(t=>t.dataValues);
    })
};

exp.update_wheel_prize = function(data) {

    return db["prize_type"].update(
        {
            prize_desc: data.prize_desc,
            prize_logo: data.prize_logo,
            prize_currency: data.prize_currency,
            prize_amount: data.prize_amount,
            possibility: data.possibility,
            enable: data.enable
        },
        { where : { id : data.id } }
    )
    .then(ret=>{
        if ( ret )
            return true;
        else
            return Promise.reject("update wrong");
    })
};

exp.update_lottery_prize = function(data) {

    return db["prize_type"].update(
        {
            prize_desc: data.prize_desc,
            prize_logo: data.prize_logo,
            prize_currency: data.prize_currency,
            prize_amount: data.prize_amount,
            exchange_price: data.exchange_price,
            exchange_currency: data.exchange_currency,
            enable: data.enable
        },
        { where : { id : data.id } }
    )
    .then(ret=>{
        if ( ret )
            return true;
        else
            return Promise.reject("update wrong");
    })
};

exp.list_messages = function(data) {

    return db['message'].all({})
    .then(ret=>{
        return ret.map(t=>t.dataValues);
    });
};

exp.update_message = function(data) {

    return db['message'].update(
        {
            type: data.type,
            msg: data.msg
        },
        { where : { id: data.id } }
    )
    .then(ret=>{
        if ( ret )
            return true;
        else
            return Promise.reject("update wrong");
    });
};

exp.add_message = function(data) {

    return db['message'].create({
        type: data.type,
        msg: data.msg
    })
    .then(ret=>{
        if ( ret )
            return true;
        else
            return Promise.reject("add wrong");
    });
};

exp.list_all_dealers = () => {
    return db['dealer'].all()
    .then(ds => {
        return ds.map(d => d.dataValues);
    });
};

exp.update_dealer = data => {
    return db['dealer'].update({
        enable : data.enable,
        upper : data.upper
    }, {
        where : { id : data.id }
    });
};

exp.list_all_user_and_config = function() {
    var all_users = null;
    var sysconfig = null;
    return db["user"].findAll({
        where : { id : { $gte : 0 }}
    })
    .then(us=>{
        all_users = us.map(u=>u.dataValues);
    })
    .then(()=>{
        return db["sysconfig"].findAll({
            where : { $or :[
                {name : db["sysconfig"].CONFIG_KEY.NEW_USER_PRIZE},
                {name : "foobar"},
            ]}
        });
    })
    .then(ss=>{
        sysconfig = ss.map(s=>s.dataValues);
        return {
            users : all_users,
            sysconfig : sysconfig
        };
    })
};

exp.update_user_info = function(data) {
    return db['user'].update({
        cheat_lvl : data.cheat_lvl,
    }, {
        where : { id : data.id }
    });
};

exp.update_sysconfig = function(data){
    return db["sysconfig"].update({
        value : data.value
    },{ where : {
        id : data.id
    }})
};

exp.list_activity_configs = function(data){
    return db["sysconfig"].findOne({
        where : {
            name : "activity_configs"
        }
    });
};

exp.update_activity_configs = function(data){
    return db["sysconfig"].findOne({
        where : {
            name : "activity_configs"
        }
    })
    .then(config=>{
        var val = JSON.parse(config.value);        
        val[data.key] = data.value;
        return config.update({
            value : JSON.stringify(val)
        });
    })
};

exp.set_cheat = function(data){
    let val = JSON.stringify(data);
    return db["sysconfig"].findOne({where : {name : "user_cheat"}})
    .then(x=>{
        var id = null;
        if (x)
            id = x.id;

        return db["sysconfig"].upsert({
            id: id,
            name : "user_cheat",
            value : val
        });
    })
    .then(ret=>{
        if (ret)
            return true;
    });
};

exp.clear_cheat = function(data){
    return db["sysconfig"].destroy({
        where : {
            name : "user_cheat"
        }
    })
    .then(x=>{
        return true;
    })
};

exp.list_all_invest_and_feedback = function() {
    var ret = {};

    return db["invest"].all()
    .then(x=>{
        ret["invest"] = x;
        return db["feedback"].all();
    })
    .then(x=>{
        ret["feedback"] = x;
        return ret;
    });
}

exp.delete_feedback = function(data){
    return sysDao.delete_feedback(data.id);
}

exp.delete_invest = function(data){
    return sysDao.delete_invest(data.id);
}

exp.update_invest = function(data) {
    let state = data.state;
    let auth_id = data.wechat;

    return db.sequelize.transaction(t => {
        let work = null;

        if (state == 'approved')
            work = dealerDao.create_1st_dealer(auth_id, t);
        else if (state == 'rejected')
            work =  dealerDao.disable_dealer(auth_id, t);
        
        if (!work)
            return Promise.reject('invalid state: ' + state);

        return work
        .then(() => {
            return sysDao.update_invest(data.id, state, t);
        });
    });
}

exp.query_transfer_deal = function(data){
    var uid = data.uid;
    var type = data.type ;
    if (type == "deposit")
    {
        var opt = { got : true };
        if (uid)
            opt.user_id = uid ;
        return db["pay_order"].findAll({
            where : opt,
            order: [ ["id", "DESC"] ]
        })
        .then(ret=>{
            return ret;
        })
    } else {
        var opt = { type : "transfer" };
        if (uid)
            opt.user_id = uid;
        return db["userlog"].findAll({
            where : opt,
            order: [ ["id", "DESC"] ]
        })
        .then(x=>{
            return x;
        });
    }
};

function query_cost_stat(range) {
    let sequelize = db.sequelize;
    let format = '';

    if (range == 'daily')
        format = '%Y-%m-%d';
    else if (range == 'monthly')
        format = '%Y-%m';

    return db['game_history'].all({
        attributes: [ [ sequelize.fn('COUNT', sequelize.col('id')), 'quantity' ], [ sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), format), 'range' ] ],
        group : '`range`',
        order : [ [ sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), format), 'DESC' ] ]
    });
}

function query_deposit_stat(range) {
    let sequelize = db.sequelize;
    let format = '';

    if (range == 'daily')
        format = 'yyyy-mm-dd';
    else if (range == 'monthly')
        format = 'yyyy-mm';

    let goods = null;

    return db['shopmall'].all()
    .then(ret => {
        goods = ret;
        
        return db["pay_order"].all({
            where: { got : true }
        });
    })
    .then(items => {
        let data = {};

        items.forEach(x => {
            let good = goods[x.shopmall_id - 1];
            let tm = dateformat(x.created_at, format);

            if (data[tm] == null)
                data[tm] = { money: 0, quantity: 0, range : tm };
            
            let ob = data[tm];

            ob.money += good.price / 100;
            ob.quantity += good.quantity;
        });

        let ret = [];
        for (let k in data) {
            let ob = data[k];
            ret.push(ob);
        }

        ret.sort((a, b) => b.range - a.range);

        return ret;
    });
}

exp.query_stat = (data) => {
    let range = data.range;
    let type = data.type;

    if (type == 'cost')
        return query_cost_stat(range);
    else if (type == 'deposit')
        return query_deposit_stat(range);
};

exp.get_online_count = () => {
    return db['user'].count({
        where : { is_login : true }
    })
    .then(x=>{
        return x;
    });
};

exp.revert_user = (data) => {
    let userid = data.userid;

    let old_user = null;
    let new_user = null;

    return db.sequelize.transaction(t => {
        return db['user'].findOne({ where : { id: userid } })
        .then(u => {
            if (!u)
                return Promise.reject('user not found: ' + userid);
        
            new_user = u;
        
            return db['user'].all({
                where : { nickname: u.nickname, id : { $ne : userid } }
            });
        })
        .then(us => {
            if (!us)
                return Promise.reject('user not found: ' + new_user.nickname);
        
            if (us.length != 1)
                return Promise.reject('user found more: ' + us.length);
        
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
            return db['dealer'].update({ upper : new_user.auth_id }, { where : { upper : old_user.auth_id }, transaction: t });
        })
        .then(() => {
            return db['invest'].update({ wechat : new_user.auth_id }, { where : { wechat : old_user.auth_id }, transaction: t });
        })
        .then(() => {
            return true;
        });
    });
};



