
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var item = require('./routes/item');
var bankrate = require('./routes/bankrate');
var flight = require('./routes/flight');

var http = require('http');
var path = require('path');
var ejs = require('ejs');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.engine('.html', ejs.__express);
app.set('view engine', 'html');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/users', user.list);

//获取当天最新的外汇牌价
app.get('/getallrate', bankrate.getallrates);

//获取指定货币的实时汇率
app.post('/getrate', bankrate.getsinglerate);

//将amazon商品在sinoair商城上架
app.post('/additem', item.addItem);

//订阅邮件推送
app.get('/flightalert', flight.setalert);

var server = http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

server.timeout = 150000;
