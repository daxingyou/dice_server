
import { Tedis } from "redis-typescript";

const tedis = new Tedis({
    port: 6379,
    host: '127.0.0.1'
});

export default tedis;

