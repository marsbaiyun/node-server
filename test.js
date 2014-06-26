/**
 * Created by Mars on 14-5-19.
 */
var request = require('request');
var httputil = require('./util/HttpUtil');
var async = require('async');
var later = require('later');
var redis = require('redis');
var client = redis.createClient(6379, '192.168.0.218');
var t = require('./util/t');
var log = t.log;
var domain = require('domain');
var mailUtil = require('./util/MailUtil');
var Q = require('q');

var promise = getPushmsgKeys();
promise
    .then(function(data){
        data.forEach(function (reply, i) {
            client.hget("pushmsg",reply,function(err, reply){
                if(err){
                    console.log('this is err : ' + err);
                } else {
                    console.log('this is reply : ' + reply);
                }

            });
        });
    })
    .then(function(obj){
        console.log(' this is : ' + obj);
    },function(err){
        console.log(err);
    })


function getPushmsgKeys(){
    var deferred = Q.defer();
    client.hkeys("pushmsg", function (err, reply) {
        if(err){
            deferred.reject(err);
        } else {
            deferred.resolve(reply);
        }

    });
    return deferred.promise;
}

function getPushmsg(keys){
    var deferred = Q.defer();
    keys.forEach(function (reply, i) {
        client.hget("pushmsg",keys,function(err, reply){
            if(err){
                deferred.reject(err);
            } else {
                deferred.resolve(reply);
            }

        });
    });
    return deferred.promise;
}

/*request.post({
    uri: 'http://192.168.0.218:8001/HttpEngine',
    form: {
        'serviceXml': '<Service><ServiceURL>RealQuery</ServiceURL><ServiceAction>updateFlightDate</ServiceAction><ServiceData><flight><flightno>SQ0328</flightno><flightdate>2014-06-23</flightdate><realflightdate>2014-06-23 06:32:00</realflightdate></flight></ServiceData></Service>'
    }
},function(err, response, body){
    if (err) {
        console.log(err);
    } else {
        console.log(body);
        mailUtil.send({
            'reciever': 'marsbaiyp@gmail.com',
            'subject': 'falightstat timertask alert',
            'content': body
        });
    }

});*/

/*client.hset('flight', 'SQ237', '2014-06-16',function(err, reply){
    if (err) {
        console.log('err',err);
    } else {
        console.log(reply);
        console.log(reply == null);

    }
    client.quit();
});*/


//client.hset("flights", "SQ0807|2014-06-13", "618-80906840", redis.print);
//client.quit();

/*client.hexists("flights", "999-12345675|CA2003", function (err, replies) {
    if (err) {
        console.log('err', err);
    } else {
        console.log('replies', replies);
        if (replies == 1) {
            client.hdel('flights', '999-12345675|CA2003', function(err, replies){
                if (err) {
                    console.log('err', err);
                } else {
                    console.log('replies', replies);
                }
            });
        }
    }
});*/

/*client.hkeys("pushmsg", function (err, replies) {
    console.log(replies.length + " replies:");
    replies.forEach(function (reply, i) {
        console.log("    " + i + ": " + reply);

        client.hget("pushmsg",reply,function(err, reply){
            console.log(reply);
        });
        *//*client.hdel("pushmsg",reply,function(err, reply){
            console.log(reply);
        });*//*
    });
    client.quit();
});*/


//var cronJob = require('cron').CronJob;
//var myJob = new cronJob('0 */10 * * * *', function(){
//    console.log(new Date().toLocaleString());
//},function(){
//
//},null,true);
//console.log('now is ' + new Date().toLocaleString());
//myJob.start();

//var CronJob  = require('cron').CronJob;
//var myJob = new CronJob('*/10 * * * * *', function(){
//    console.log(new Date().toLocaleString());
//},function(){
//    console.log(new Date().toLocaleString() + ' task stop!');
//}, function(){
//
//},true);
//console.log('now is ' + new Date().toLocaleString());
//setTimeout(function(){
//    myJob.stop();
//},20000);
//myJob.start();



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


function getFullDate(str){
    var today = new Date();
    var year = today.getFullYear();

    var arr = [],
        thisyear = new Date(year + ' ' + str),
        lastyear = new Date((year-1) + ' ' + str),
        nextyear = new Date((year+1) + ' ' + str),
        tempdate,
        s = 10000000000000000000;

    arr.push(thisyear);
    arr.push(lastyear);
    arr.push(nextyear);
    var todayms = today.getTime();
    for (var i = 0; i < 3; i ++) {
        var ms = Math.abs(arr[i].getTime() - todayms);
        if (ms < s) {
            s = ms;
            tempdate = arr[i];
        }
    }

    return formatDate(tempdate, 'yyyy-MM-dd hh:mm:ss');

}

/**
 * 日期格式化
 * @param date 日期，Date的一个实例化对象
 * @param fmt 需要返回的日期字符串的格式
 * @returns 日期字符串
 */
function formatDate (date, fmt) { //author: meizz
    console.log('date : ' + date);
    var o = {
        "M+": date.getMonth() + 1, //月份
        "d+": date.getDate(), //日
        "h+": date.getHours(), //小时
        "m+": date.getMinutes(), //分
        "s+": date.getSeconds(), //秒
        "q+": Math.floor((date.getMonth() + 3) / 3), //季度
        "S": date.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}

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
