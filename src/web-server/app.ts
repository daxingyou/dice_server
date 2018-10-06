
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import express from "express";
import logger from "morgan";
import sess from "express-session";
import path from "path";

const app: express.Application = express();

app.use(sess({
    secret: 'hoho',
    resave: false,
    saveUninitialized: true
}));
app.set('views', 'views');
app.set('view engine', 'ejs');
app.use(cookieParser());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/admin', express.static(path.join(__dirname, '../../admins')));

import loginRouter from './routes/login';
app.use('/login', loginRouter);

import dealerRouter from './routes/dealer';
app.use('/dealer', dealerRouter);

import adminRouter from './routes/admin';
app.use('/adminapi', adminRouter);

const port: string = process.env.PORT || '4000';
app.listen(port, function () {
    console.log('Express server listening on port', port);
});
