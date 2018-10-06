
import { Router, Request, Response, NextFunction } from 'express';
import adminModule from '../modules/admin';

const router : Router = Router();

function write_response(res: Response, result : any) : void {
    res.writeHead(200, {"Content-Type": "application/json; charset=utf-8"});
    let json = JSON.stringify(result);
    res.end(json);
}

router.post('/', (req: any, res: any, next: any) => {
    let body = req.body;
    let action = body.api;
    let data = body.data;

    console.log('body: ' + JSON.stringify(body));

    let callback = function(ret : any) {
        if (ret == undefined || ret == null)
            return write_response(res, { errcode : 500 });

        if (action == 'login') {
            if (ret.errcode == 0) {
                req.session.uid = ret.uid;
                ret = { errcode : 0 };
            }
        } else if (action == 'logout') {
            req.session.destroy();
            ret = { errcode : 0 };
        }

        write_response(res, ret);
    };

    let cb = adminModule[action];
	if (!cb) {
		write_response(res, { code: 500, msg: 'method not found ' + action });
		return;
	}

    if (!req.session.uid) {
        if (action != 'login')
            return callback({ errcode: 500 });
        else 
            return cb(data)
            .then((ret : any) => {
                return callback(ret);
            })
            .catch((err : any) => {
                callback({ errcode : 500, err: err.toString() });
            });
    } else {
        return cb(data)
        .then((ret : any) => {
            callback({ errcode: 0, data : ret });
        })
        .catch((err : any) => {
            callback({ errcode : 500, err: err.toString() });
        });
    }
});

export default router;

