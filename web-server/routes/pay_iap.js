var express = require('express');
var router = express.Router();
var appinfo = require('../shared/config/appinfo.json')
var crypto = require('crypto');
var db = require("../shared/sql_models");
var Promise = db.Sequelize.Promise;
var userDao = require("../shared/sql_dao/userDao.js");
var shopDao = require("../shared/sql_dao/shopDao.js");
var request = require("request");
var rp = require("request-promise");
var tokenService = require('../shared/token.js');
var session_config = require('../shared/config/session.json')
var Code = require("../shared/code");
const iap = require('in-app-purchase');

function write_response(res, result)
{
    res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
    });

    var json ;
    if ( typeof(result) == 'string' )
    {
        json = result;
    } else {
        json = JSON.stringify(result);
    }
    res.end(json);
}

function checkExpire(token, expire) {
    if (expire < 0) {
        return true;
    }
    return (Date.now() - token.timestamp) < expire;
}

function get_token(token)
{
    var token_res = tokenService.parse(token, session_config.secret);
    var expire = 3600*24*365*1000;
    if (!token_res || !checkExpire(token_res, expire) ) {
        return null;
    }
    return token_res;
}

router.post('/query_order', function(req, res) {

    var app_share_key = "0b71da6ba04a48128683bc4ba8220878";

    var receipt = req.body.receipt;
    var token_res = get_token(req.body.token);
    if (!token_res) {
        return write_response( res, { errcode : Code.FAIL , errmsg: "token error" } );
    }
    var user_auth_id = token_res.uid;
    var data  ;
return db.sequelize.transaction(function(t){

    var user;
    var all_apple_goods = {};

    return shopDao.list_goods_from_shop('RMB')
    .then(goods=>{
        if (!goods)
            return Promise.reject("get goods wrong");

        goods.forEach(x=>{
            all_apple_goods[x.product_id] = {
                currency: x.add_money_currency,
                amount: x.quantity
            };
        });

        return userDao.get_by_auth_id( user_auth_id, t);
    })
    .then(u => {
        if ( !u )
            return Promise.reject("auth id is wrong");
        user = u;
        return new Promise(function(resolve,reject){
            iap.validate(receipt, (error,x) => {
                if ( error || x.status != 0 )
                {
                    reject({ mjerr: Code.ORDER.ORDER_NOT_EXIST });
                    return;
                }
                resolve(x.receipt.in_app);
            });
        })
    })
    .then(x=>{
        var orders = x;
        if ( !orders  )
            return Promise.reject({ mjerr: Code.ORDER.ORDER_NOT_EXIST });

        var goods = [];
        for( var n = 0; n < orders.length; n++ )
        {
            var order = orders[n];
            var good = all_apple_goods[order.product_id];
            if (good)
            {
                goods.push(good);
            }
        }
        return goods;
    })
    .then(goods=>{
        //for ( let n = 0; n < goods.length; n++ )
        if ( goods.length  > 0 )
        {
            data = goods[0];
            return userDao.add_user_money( user.id, data.amount, data.currency, t)
        }
    })
    .then(x=>{
        write_response(res, {
            errcode : Code.ORDER.ORDER_SUCCESS,
            currency : data.currency,
            quantity : data.amount
        });
    });
})
.catch(err=>{
    if ( err.mjerr )
    {
        if ( err.mjerr == Code.ORDER.ORDER_ALREADY_GOT )
        {
            write_response(res, {
                errcode : Code.ORDER.ORDER_SUCCESS,
                currency : "gem",
                quantity : goods.quantity
            });
        } else
            write_response(res,{errcode: err.mjerr});
    }
    else
        write_response(res, { errcode : Code.FAIL, errmsg : err } );
});

});


module.exports = router;
