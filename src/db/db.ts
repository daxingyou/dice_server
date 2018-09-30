
import { Sequelize } from 'sequelize-typescript';
import configs from '../config/database';
import * as path from 'path';

let env = process.env.DB || 'dev';
let config = configs[env];

export default new Sequelize({
	host: config.host,
	port: config.port,
	database: config.database,
	username: config.username,
	password: config.password,
	dialect: config.dialect,

	modelPaths: [path.join(__dirname, '../models')],

	define: {
		timestamps : true,
		paranoid: true,
		underscored: true,
		charset: 'utf8mb4',
		freezeTableName: true
	},

	pool: {
		max: 5,
		min: 0,
		acquire: 300000,
		idle: 10000
	},

	timezone: '+08:00',
	operatorsAliases: true,
	logging: false 
});

