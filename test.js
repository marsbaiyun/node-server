/**
 * Created by Mars on 14-5-19.
 */
var request = require('request');
var httputil = require('./util/HttpUtil');
var async = require('async');
var redis = require('redis');
var client = redis.createClient(6379, '192.168.0.218');
var t = require('./util/t');
var log = t.log;
var domain = require('domain');


var d = domain.create();

d.run(domeintest('haha'));

function domeintest (temp) {
    console.log('this is ' + temp);
    throw Error(temp);
}




//async demo
/*var arr = [{name:'Jack', delay:200}, {name:'Mike', delay: 100}, {name:'Freewind', delay:300}, {name:'Test', delay: 50}];

async.map(arr, function(item, callback) {
    log('1.1 enter: ' + item.name);
    setTimeout(function() {
        log('1.1 handle: ' + item.name);
        callback(null, item.name + '!!!');
    }, item.delay);
}, function(err,results) {
    log('1.1 err: ', err);
    log('1.1 results: ', results);
});*/

//redis demo
/*// lpush
//链表插入，插入多值，存储数据如同栈，最后进入的获取时在最上方
client.lpush('userlist', JSON.stringify({
    'name': 'tom',
    'age': 13
}));


// lrange
//获取list链表中所有的数据，-1表示所有，也可为其他值，代表第0个到第X个
client.lrange('userlist', '0', '-1', function (error, res) {
    if (error) {
        console.log(error);
    } else {
        console.log(res);
    }

    // 关闭链接
    client.end();
});*/

function a() {
    var str = new b();
    //调用时
    console.log(str.res);
}

function b(){
    var _this = this;
    request('http://www.baidu.com',function(err, res, body){
        if (res.statusCode == 200) {
            console.log(1111);
            _this.res = 'hahaha';
        }
    });

}

function test (){
    for(var i=0;i < 6;i ++){
        request('http://www.baidu.com',function(err, res, body){
            if (res.statusCode == 200) {
                check();
            }
        });
    }
}


function check(){
    num --;
    console.log(num);
    if (num === 0) {
        console.log('hahahah' + num);
    }
}
