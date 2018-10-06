var express = require('express');
var router = express.Router();
var parseString = require('xml2js').parseString
var db = require("../shared/sql_models");
var userDao = require("../shared/sql_dao/userDao.js");
var dealerDao = require("../shared/sql_dao/dealerDao.js");
var appinfo = require('../shared/config/appinfo.json')
var Code = require("../shared/code");


function add_gem(auth_id, out_trade_no, t )
{
    var user;
    var order;
    return userDao.get_by_auth_id( auth_id, t )
    .then(u => {
        if ( !u )
            return Promise.reject("auth id is wrong");
        user = u;
        return db["pay_order"].findOne({ where: { out_trade_no : out_trade_no, user_id : user.id }, transaction : t })
    })
    .then(x=>{
        order = x;
        if ( !order )
            return Promise.reject({ mjerr: Code.ORDER.ORDER_NOT_EXIST });
        return db["shopmall"].findOne({ where : { id : order.shopmall_id }, transaction : t })
    })
    .then(goods=>{
        if ( !goods )
            return Promise.reject("shopmall id is wrong");

        let count = goods.quantity;
        let dealer = goods.dealer;
        return dealer ?  dealerDao.add_gems(auth_id, count, t) : userDao.add_user_money( user.id, count, "gem", t);
    })
    .then(()=>{
        return db["pay_order"].update(
            {
                got : true
            },
            {
                where : {
                    id : order.id,
                    got : false
                },
                transaction : t
            }
        );
    })
    .then(x=>{
        if ( x[0] !== 1 )
            return Promise.reject(Code.ORDER.ORDER_ALREADY_GOT);
    })
}

router.post('/', function(req, res) {

    parseString(req.body, function (err, result) {
        //console.dir(result);
        var fail = "<xml>"
        fail += "<return_code>" + "FAIL" + "</return_code>";
        fail += "</xml>"

        var done = "<xml>"
        done += "<return_code>" + "SUCCESS" + "</return_code>";
        done += "</xml>"

        if ( !result.xml || !result.xml.out_trade_no )
        {
            res.end(fail);
            return ;
        }

        var auth_id = result.xml.openid;
        var out_trade_no = result.xml.out_trade_no;

        return db.sequelize.transaction(function(t){
            return add_gem(auth_id, out_trade_no, t)
        })
        .then(x=>{
            res.end(done);
            return ;
        })
        .catch(err=>{
            if ( err == Code.ORDER.ORDER_ALREADY_GOT )
            {
                console.log("wechat callback , already got");
                res.end(done);
            }
            else {
                console.log(err);
                res.end(fail);
            }
            return;
        });
    });
});

module.exports = router;
