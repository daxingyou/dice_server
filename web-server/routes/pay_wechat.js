var express = require('express');
var router = express.Router();
var appinfo = require('../shared/config/appinfo.json')
var crypto = require('crypto');
var db = require("../shared/sql_models");
var Promise = db.Sequelize.Promise;
var userDao = require("../shared/sql_dao/userDao.js");
var dealerDao = require("../shared/sql_dao/dealerDao.js");
var request = require("request");
var rp = require("request-promise");
var tokenService = require('../shared/token.js');
var session_config = require('../shared/config/session.json')
var Code = require("../shared/code");

//var key = "JIUdu111333JIUdu111333JIUdu11133";
//var _mch_id = "1510631711";

//var key = "wkl3ld0iasd9idfj4jdksejksdk23HJK";
var key = "free1231231231231231231231231231";
var _mch_id = "1514798421";

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

function createNonceStr() {
    return Math.random().toString(36).substr(2, 15);
}

function getXMLNodeValue(node_name, xml) {
    var tmp = xml.split("<" + node_name + ">");
    var _tmp = tmp[1].split("</" + node_name + ">");
    return _tmp[0];
}

function raw(args) {
    var keys = Object.keys(args);
    keys = keys.sort()
    var newArgs = {};
    keys.forEach(function(key) {
        newArgs[key] = args[key];
    });
    var string = '';
    for (var k in newArgs) {
        string += '&' + k + '=' + newArgs[k];
    }
    string = string.substr(1);
    return string;
}

function paysignjs(payload) {
    var string = raw(payload);
    string = string + '&key=' + key;
    var sign = crypto.createHash('md5').update(string, 'utf8').digest('hex');
    return sign.toUpperCase();
}


function paysignjsapi(appid, attach, body, mch_id, nonce_str, notify_url, openid, out_trade_no, spbill_create_ip, total_fee, trade_type) {
    var ret = {
        appid: appid,
        attach: attach,
        body: body,
        mch_id: mch_id,
        nonce_str: nonce_str,
        notify_url: notify_url,
        openid: openid,
        out_trade_no: out_trade_no,
        spbill_create_ip: spbill_create_ip,
        total_fee: total_fee,
        trade_type: trade_type
    };
    var string = raw(ret);
    string = string + '&key=' + key; //key为在微信商户平台(pay.weixin.qq.com)-->账户设置-->API安全-->密钥设置
    var sign = crypto.createHash('md5').update(string, 'utf8').digest('hex');
    return sign.toUpperCase();
}


function do_prepay(req, res, user, goods) {

    var os = req.body.os;
    var info = appinfo[os];

    //return write_response(res, { name : "hello" } );
    var body = goods.product_desc;
    var openid = user.auth_id;
    var timeStamp = parseInt(new Date().getTime() / 1000).toString();
    var package = "Sign=WXPay";

    var bookingNo = user.id + "-" + parseInt(Date.now()/1000).toString();
    var appid = info.appid;
    var attach = JSON.stringify({goods_id : goods.id});
    var mch_id = _mch_id;
    var nonce_str = createNonceStr();
    var total_fee = goods.price;
    var notify_url = "http://ip2.queda88.com:9001/pay_callback";
    var url = "https://api.mch.weixin.qq.com/pay/unifiedorder";
    var client_ip = '127.0.0.1';
    var formData  = "<xml>";
    formData  += "<appid>"+appid+"</appid>";  //appid
    formData  += "<attach>"+attach+"</attach>"; //附加数据
    formData  += "<body>" + body + "</body>";
    formData  += "<mch_id>"+mch_id+"</mch_id>";  //商户号
    formData  += "<nonce_str>"+nonce_str+"</nonce_str>"; //随机字符串，不长于32位。
    formData  += "<notify_url>"+notify_url+"</notify_url>";
    formData  += "<openid>"+openid+"</openid>";
    formData  += "<out_trade_no>"+bookingNo+"</out_trade_no>";
    formData  += "<spbill_create_ip>" + client_ip + "</spbill_create_ip>";
    formData  += "<total_fee>"+total_fee+"</total_fee>";
    formData  += "<trade_type>APP</trade_type>";
    formData += "<sign>" + paysignjsapi(appid, attach, body, mch_id, nonce_str, notify_url, openid, bookingNo, client_ip, total_fee, 'APP') + "</sign>";
    formData  += "</xml>";

    return rp({url:url,method:'POST',body: formData})
    .then(body=>{
        console.log("get response from wechat server : " + body);
        var prepay_id = getXMLNodeValue('prepay_id',body.toString("utf-8"));
        var tmp = prepay_id.split('[');
        var tmp1 = tmp[2].split(']');

        var ret = {
            appid : appid ,
            prepayid : tmp1[0],
            package : package,
            partnerid : mch_id,
            timestamp : timeStamp,
            noncestr: nonce_str,
        };
        ret.sign = paysignjs(ret);

        ret.out_trade_no = bookingNo;
        ret.errcode = Code.OK;
        return ret;
    })
    .catch(err=>{
        console.log('do_prepay err:' + err);
        return {
            errcode : Code.FAIL
        };
    });
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
    var out_trade_no = req.body.out_trade_no;
    var token_res = get_token(req.body.token);
    if (!token_res)
        return write_response( res, { errcode : Code.FAIL , errmsg: "token error" } );

    var user_auth_id = token_res.uid;
    var goods;

return db.sequelize.transaction(function(t){

    var user;
    var order = null;
    var data = { out_trade_no : out_trade_no };
    return userDao.get_by_auth_id( user_auth_id, t )
    .then(u => {
        if ( !u )
            return Promise.reject("auth id is wrong");
        user = u;
        return db["pay_order"].findOne({ where: { out_trade_no : data.out_trade_no, user_id : user.id }, transaction : t })
    })
    .then(x=>{
        order = x;
        if ( !order )
            return Promise.reject({ mjerr: Code.ORDER.ORDER_NOT_EXIST });
        return db["shopmall"].findOne({ where : { id : order.shopmall_id }, transaction : t })
    })
    .then(x=>{
        goods = x;
        if ( order.got )
        {
            return Promise.reject({ mjerr : Code.ORDER.ORDER_ALREADY_GOT });
        }

        data.appid = appinfo["Android"].appid;
        data.mch_id = _mch_id;
        data.nonce_str = order.nonce_str;
        var formData  = "<xml>";
        formData += "<appid>"+ data.appid + "</appid>";  //appid
        formData += "<mch_id>"+ data.mch_id + "</mch_id>";  //商户号
        formData += "<nonce_str>" + data.nonce_str + "</nonce_str>";
        formData += "<out_trade_no>" + data.out_trade_no + "</out_trade_no>";
        formData += "<sign>" + paysignjs(data) + "</sign>";
        formData += "</xml>";

        var url = "https://api.mch.weixin.qq.com/pay/orderquery";
        return rp({url:url,method:'POST',body: formData});
    })
    .then(body=>{
        var msg = getXMLNodeValue('return_msg',body.toString("utf-8"));
        var tmp = msg.split('[');
        msg = tmp[2].split(']')[0];
        if ( msg != "OK" )
            return Promise.reject({ mjerr : Code.ORDER.ORDER_NOT_PAY});

        var attach = getXMLNodeValue('attach',body.toString("utf-8"));
        tmp = attach.split('[');
        attach = tmp[2].split(']')[0];
        attach = JSON.parse(attach);
        if ( attach.goods_id )
        {
            let count = goods.quantity;
            let dealer = goods.dealer;
            return dealer ? dealerDao.add_gems(user_auth_id, count, t) : userDao.add_user_money(user.id, count, "gem", t)
            .then(x=>{
                return db["pay_order"].update(
                    {
                        got : true
                    } ,
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
                    return Promise.reject("update error");
                write_response(res, {
                    errcode : Code.ORDER.ORDER_SUCCESS,
                    currency : "gem",
                    quantity : goods.quantity,
                    dealer : dealer
                });
            })
        } else {
            return Promise.reject("goods id is wrong");
        }
    });
})
.catch(err=>{
    if (err.mjerr) {
        if (err.mjerr == Code.ORDER.ORDER_ALREADY_GOT) {
            write_response(res, {
                errcode : Code.ORDER.ORDER_SUCCESS,
                currency : "gem",
                quantity : goods.quantity
            });
        } else
            write_response(res,{errcode: err.mjerr});
    } else
        write_response(res, { errcode : Code.FAIL, errmsg : err } );
});

});


router.post('/prepay', function(req, res) {
    var goods_id = req.body.goods_id ;
    let token = req.body.token;

    if (token == null)
        return write_response( res, { errcode : Code.FAIL , errmsg: "token null" } );

    var token_res = get_token(token);
    var ret ;
    if (!token_res) {
        return write_response( res, { errcode : Code.FAIL , errmsg: "token error" } );
    }

    if ( !goods_id )
        return write_response( res, { errcode : Code.FAIL, errmsg : "goods id is empty" } );

    var user;
    var goods;
    return db["user"].findOne({where: { auth_id : token_res.uid } })
    .then(u=>{
        if ( !u )
        {
            return Promise.reject("uid is wrong");
        }
        user = u;
        return db["shopmall"].findOne({where: { id : goods_id } })
    })
    .then(x=>{
        goods = x;
        return do_prepay(req, res, user, goods );
    })
    .then(x=>{
        ret = x;
        return db["pay_order"].create({
            nonce_str : ret.noncestr,
            out_trade_no : ret.out_trade_no,
            shopmall_id : goods.id ,
            shopmall_desc: goods.product_desc,
            currency : goods.add_money_currency ,
            quantity : goods.quantity,
            got : false,
            user_id : user.id
        });
    })
    .then(()=>{
        write_response(res,ret);
    })
    .catch(err=>{
        console.log("prepay err=" + err);
        if ( err.mjerr )
            write_response(res,{errcode: err.mjerr});
        else
            write_response(res,{errcode: Code.FAIL});
    });

});


module.exports = router;
