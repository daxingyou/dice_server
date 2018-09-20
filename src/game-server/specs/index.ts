
import * as fs from 'fs';
import * as path from 'path';

let specs:any = {};

fs.readdirSync(__dirname)
.filter(file => {
	return (file.indexOf('.') !== 0) && (file !== 'index.js');
})
.forEach(file => {
	let content = require(path.join(__dirname, file));
	let base = path.basename(file, '.js');

	specs[base] = content;
});

export default specs;

