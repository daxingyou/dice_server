
import { Router, Request, Response, NextFunction } from 'express';
import loginModule from '../modules/login';

const router : Router = Router();

function write_response(res: Response, result:any) : void {
    res.writeHead(200, {"Content-Type": "application/json; charset=utf-8"});
    let json = JSON.stringify(result);
    res.end(json);
}

router.post('/:method', (req: any, res: any, next: any) => {
    let action = req.params.method;
    let body = req.body;

	let cb = loginModule[action];

	if (!cb) {
		write_response(res, { code: 500, msg: 'method not found ' + action });
		return;
	}

    cb(body)
    .then((ret : any) => {
        write_response(res, ret);
    })
    .catch( (err:any) => {
        console.log(action, err.toString());
        if (err.code)
			write_response(res, err);
        else
			write_response(res, { code: 500, msg: err.toString()} );
    });
});

export default router;

