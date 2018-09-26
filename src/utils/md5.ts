
import * as crypto from 'crypto';

export default function md5(ss: string) : string {
    return crypto.createHash('md5').update(ss).digest('hex');
}


