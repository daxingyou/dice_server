var express = require('express');
var router = express.Router();
var Token = require('../shared/token.js');
var sysversion = require('../shared/config/sysversion.json');
var appinfo = require('../shared/config/appinfo.json')
var session_config = require('../shared/config/session.json')
var http = require('../utils/http');
var userDao = require('../shared/sql_dao/userDao');

function write_response(res, result)
{
    res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
    });

    var json = JSON.stringify(result);
    res.end(json);
}

var fnFailed = function(res,err) {
    write_response(res, { errcode: 1, errmsg: err });
};

var fnSucceed = function(res) {
	write_response(res, { errcode: 0, errmsg: "ok" });
};

router.get('/get_serverinfo', function(req, res) {
    var ret = {
        version: sysversion.client_version,
        gate_host : '120.78.79.189',
        gate_port : 5005,
        hall : "120.78.79.189:3000",
        appweb: 'http://www.queda88.com/share.html'
    };
    write_response(res,ret);
});

function get_access_token(code, os, info, callback) {
/*
	var info = appinfo[os];
	if (null == info) {
		callback(false, null);
	}
*/

	var data = {
		appid: info.appid,
		secret: info.secret,
		code: code,
		grant_type: "authorization_code"
	};

	http.get2("https://api.weixin.qq.com/sns/oauth2/access_token", data, callback, true);
}

function get_state_info(access_token, openid, callback) {
	var data = {
		access_token: access_token,
		openid: openid
	};

	http.get2("https://api.weixin.qq.com/sns/userinfo", data, callback, true);
}

function create_user(account, name, sex, headimgurl, callback) {

    userDao.create_and_update(account, name, sex, headimgurl)
    .then(function(prize){
        if ( prize )
        {
            callback(prize)
        } else {
            callback();
        }

    }).catch(function (err) {
        console.log("create err=" + err);
        callback();
    });

};

router.get('/wechat_auth', function(req, res) {
	let code = req.query.code;
	let os = req.query.os;
	if (code == null || code == "" || os == null || os == "")
		return;

    let version = req.query.version;
    let info = null;

    if (version != null) {
        info = {
            "appid": "wx6ef5dcc932b989df",
            "secret": "623e0551d45f5165c66243823ad87843"
        };
    } else {
        info = {
            "appid": "wxe81ca6abef986712",
            "secret": "4a6cc90f662505b3e526cbde701ae658"
        };
    }

	get_access_token(code, os, info, function(suc, data) {
		if (suc) {
			let access_token = data.access_token;
			let openid = data.openid;
			get_state_info(access_token, openid, function(suc2, data2) {
				if (suc2) {
					let openid = data2.openid;
					let nickname = data2.nickname;
					let sex = (data2.sex == 1 ? 'male': 'female');
					let headimgurl = data2.headimgurl;

                    if (openid == null) {
                        write_response(res, { errcode: 500, errmsg: "openid null" });
                        return;
                    }

					create_user(openid, nickname, sex, headimgurl, function(prize) {
                        let sign = Token.create(openid, Date.now(), session_config.secret);
						let ret = {
							errcode: 0,
							errmsg: "ok",
                            account : openid,
							token: sign
						};

                        if (prize)
                            ret.prize = prize;

						write_response(res, ret);
					});
				}
			});
		} else {
			write_response(res, { errcode: -1, errmsg: "unknown err." });
		}
	});
});

router.post('/check_upgrade', function(req, res) {
    let os = req.body.os;

    let android = {
        code : 0,
        url : 'https://fir.im/3hzm',
        changelog : 'version: 1.23\n1.切换微信开发者登录帐号\n2.修正1.22不能回放的问题\n3.新的距离显示策略',
        version : '1.23'
    };

    let ios = {
        code : 0,
        url : 'https://fir.im/3hzm',
        changelog : 'version: 1.23\n1.切换微信开发者登录帐号\n2.修正1.22不能回放的问题\n3.新的距离显示策略',
        version : '1.24'
    };

    let ret = { code : 1 };

    if (os == 'iOS')
        ret = ios;
    else if (os == 'Android')
        ret = android;

    write_response(res, ret);
});

router.get('/base_info', function(req, res) {
	var userid = req.query.userid;
    /*TODO:
	db.get_user_base_info(userid, function(data) {
		var ret = {
			errcode: 0,
			errmsg: "ok",
			name: data.name,
			sex: data.sex,
			headimgurl: data.headimg
		};

		write_response(res, ret);
	});
    */
});


module.exports = router;
