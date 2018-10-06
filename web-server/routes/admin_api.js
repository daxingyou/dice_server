var express = require('express');
var router = express.Router();
var userDao = require('../shared/sql_dao/userDao');
var Code = require("../shared/code.js");

var modules = {};
modules["user"] = require("../modules/user.js");

function write_response(res, result)
{
    res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
    });

    var json = JSON.stringify(result);
    res.end(json);
}

router.post('/', function(req, res) {

    var api = req.body.api;
    var as = api.split('.');
    var module_name = as[0];
    var method_name = as[1];

    var callback = function(ret){
        if ( ret === undefined || ret == null )
            return write_response({ errcode : Code.FAIL });

        if ( api == "user.login" )
        {
            if ( ret.errcode === Code.OK )
            {
                req.session.uid = ret.uid;
                ret = { errcode : Code.OK };
            }
        } else if ( api == "user.logout") {
            req.session.destroy();
            ret = { errcode : Code.OK };
        }
        write_response(res,ret);
    };


    if ( module_name in modules && method_name in modules[module_name ])
    {
        if ( !req.session.uid )
        {
            if ( api != "user.login")
                return callback({errcode: Code.Fail});
            else
                return modules.user.login(req.body.data)
                .then(ret=>{
                    return callback(ret);
                })
                .catch(err=>{
                    ret = { errcode : Code.FAIL, err: err.toString()  };
                    callback(ret);
                });
        }
        else {
            return modules[module_name][method_name](req.body.data)
            .then(ret=>{
                callback({errcode: Code.OK , data : ret});
            })
            .catch(err=>{
                ret = { errcode : Code.FAIL, err: err.toString() };
                callback(ret);
            });
        }
    }
});


module.exports = router;
