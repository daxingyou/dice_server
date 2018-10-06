
let express = require('express');
let router = express.Router();
let Token = require('../shared/token.js');
let session_config = require('../shared/config/session.json');
let http = require('../utils/http');
let userDao = require('../shared/sql_dao/userDao');
let dealerDao = require('../shared/sql_dao/dealerDao');
let shopDao = require('../shared/sql_dao/shopDao');
let Code = require("../shared/code");
let MJResponse = require('../shared/MJResponse');

let db = require("../shared/sql_models");
let Promise = db.Sequelize.Promise;

let secret = session_config.secret;

function write_response(res, result) {
    res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
    });

    let json = JSON.stringify(result);
    res.end(json);
}

let fnFailed = (res, code, msg) => {
    write_response(res, { errcode: code, errmsg: msg });
};

let fnSucceed = res => {
	write_response(res, { errcode: 0, errmsg: "ok" });
};

/* 1. login */
router.post('/login', (req, res) => {
    let token = req.body.token;
    let ret = Token.parse(token, secret);
    if (!ret) {
        fnFailed(res, Code.ENTRY.FA_TOKEN_INVALID, 'invalid token');
        return;
    }

    let user = null;

    dealerDao.get_by_auth_id(ret.uid)
    .then(x => {
        if (!x)
            return Promise.reject('代理不存在');

        if (!x.enable)
            return Promise.reject('代理功能未开放');

        user = x;

        return dealerDao.update_token(x.id, token);
    })
    .then(() => {
        let fields = [ 'id', 'auth_id', 'gem_coin', 'score', 'upper', 'level', 'all_gems', 'all_score', 'all_subs' ];
        let data = { errcode: 0, token: token };

        fields.forEach(x => data[x] = user[x]);

        write_response(res, data);
    })
    .catch(err => {
        fnFailed(res, Code.FAIL, err);
    });
});

/* 2. 查询玩家信息 */
router.post('/get_user_info', (req, res) => {
    let token = req.body.token;
    let uid = req.body.uid;

    let ret = Token.parse(token, secret);
    if (!ret) {
        fnFailed(res, Code.ENTRY.FA_TOKEN_INVALID, 'invalid token');
        return;
    }

    userDao.get_by_id(uid)
    .then(u => {
        if (!u)
            return Promise.reject('user not exist');

        let fields = [ 'id', 'auth_id', 'nickname', 'gem_coin' ];
        let data = { errcode : 0 };

        fields.forEach(x => data[x] = u[x]);

        data.nickname = new Buffer(data.nickname, 'base64').toString();

        write_response(res, data);
    })
    .catch(err => {
        fnFailed(res, Code.FAIL, err);
    });
});

/* 3. 转钻石给玩家 */
router.post('/transfer_gems2user', (req, res) => {
    let token = req.body.token;
    let from = req.body.from;
    let uid = req.body.uid;
    let count = req.body.count;

    let ret = Token.parse(token, secret);
    if (!ret) {
        fnFailed(res, Code.ENTRY.FA_TOKEN_INVALID, 'invalid token');
        return;
    }

    if (count <= 0) {
        fnFailed(res, Code.FAIL, 'invalid count');
        return;
    }

    dealerDao.transfer_gems2user(from, uid, count)
    .then(()=>{
        fnSucceed(res);
    })
    .catch(err => {
        fnFailed(res, Code.FAIL, err);
    });
});

/* 3.1 列出转赠记录 */
router.post('/list_transfer_records', (req, res) => {
    let token = req.body.token;
    let ret = Token.parse(token, secret);
    if (!ret) {
        fnFailed(res, Code.ENTRY.FA_TOKEN_INVALID, 'invalid token');
        return;
    }

    dealerDao.list_records(ret.uid, 'transfer', req.body.uid)
    .then(rs => {
        write_response(res, new MJResponse(Code.OK, rs));
    })
    .catch(err => {
        fnFailed(res, Code.FAIL, err);
    });

});

/* 4. 列出下线代理 */
router.post('/list_sub_dealers', (req, res) => {
    let token = req.body.token;
    let ret = Token.parse(token, secret);
    if (!ret) {
        fnFailed(res, Code.ENTRY.FA_TOKEN_INVALID, 'invalid token');
        return;
    }

    dealerDao.list_sub_dealers(ret.uid)
    .then(us => {
        write_response(res, new MJResponse(Code.OK, us));
    })
    .catch(err => {
        fnFailed(res, Code.FAIL, err);
    });
});

/* 5. 创建下线代理 */
router.post('/create_sub_dealer', (req, res) => {
    let token = req.body.token;
    let ret = Token.parse(token, secret);
    if (!ret) {
        fnFailed(res, Code.ENTRY.FA_TOKEN_INVALID, 'invalid token');
        return;
    }

    let uid = req.body.uid;

    dealerDao.create_sub_dealer(ret.uid, uid)
    .then(() => {
        fnSucceed(res);
    })
    .catch(err => {
        fnFailed(res, Code.FAIL, err);
    });
});

/* 6. 列出返点记录 */
router.post('/list_rebate_records', (req, res) => {
    let token = req.body.token;
    let ret = Token.parse(token, secret);
    if (!ret) {
        fnFailed(res, Code.ENTRY.FA_TOKEN_INVALID, 'invalid token');
        return;
    }

    dealerDao.list_records(ret.uid, 'rebate')
    .then(rs => {
        write_response(res, new MJResponse(Code.OK, rs));
    })
    .catch(err => {
        fnFailed(res, Code.FAIL, err);
    });
});

/* 7. 列出代理商品 */
router.post('/list_goods', (req, res) => {
    let token = req.body.token;
    let ret = Token.parse(token, secret);
    if (!ret) {
        fnFailed(res, Code.ENTRY.FA_TOKEN_INVALID, 'invalid token');
        return;
    }

    return shopDao.list_goods_from_shop('RMB', true)
    .then(x=>{
        let ret = x.map(goods => {
            return {
                id: goods.id,
                quantity : goods.quantity,
                logo: goods.logo,
                price : goods.price,
                currency : goods.currency,
                product : goods.product_id
            };
        });

        write_response(res, new MJResponse(Code.OK, ret));
    })
    .catch(err => {
        fnFailed(res, Code.FAIL, err);
    });
});

/* 8. 购买代理商品 */
router.post('/buy_goods', (req, res) => {

});

/* 9. 列出购买记录 */
router.post('/list_buy_records', (req, res) => {
    let token = req.body.token;
    let ret = Token.parse(token, secret);
    if (!ret) {
        fnFailed(res, Code.ENTRY.FA_TOKEN_INVALID, 'invalid token');
        return;
    }

    dealerDao.list_records(ret.uid, 'recharge')
    .then(rs => {
        write_response(res, new MJResponse(Code.OK, rs));
    })
    .catch(err => {
        fnFailed(res, Code.FAIL, err);
    });

});

module.exports = router;

