
import * as crypto from 'crypto';

export function create(uid : number, timestamp : number, pwd : string) {
	let msg = uid + '|' + timestamp;
	let cipher = crypto.createCipher('aes256', pwd);
	let enc = cipher.update(msg, 'utf8', 'hex');

	enc += cipher.final('hex');
	return enc;
};

export function parse(token : string, pwd : string) {
	let decipher = crypto.createDecipher('aes256', pwd);
	let dec;
	try {
		dec = decipher.update(token, 'hex', 'utf8');
		dec += decipher.final('utf8');
	} catch (err) {
		console.error('[token] fail to decrypt token. %j', token);
		return null;
	}

	let ts = dec.split('|');
	if (ts.length !== 2)
		return null;

	return { uid: Number(ts[0]), timestamp: Number(ts[1]) };
};

