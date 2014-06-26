/**
 * Created by Mars on 14-6-16.
 */
var request = require('request'),
    cheerio = require('cheerio'),
    Imap = require('imap'),
    inspect = require('util').inspect,
    mailUtil = require('./util/MailUtil'),
    redis = require('redis'),
    cronJob = require('cron').CronJob;


/*var imap = new Imap({
 user: 'efreightsinoair@gmail.com',
 password: '0urTe@m!',
 host: 'imap.gmail.com',
 port: 993,
 tls: true
 });*/



var myJob = new cronJob('0 */10 * * * *', function(){

    console.log('flightstatsalert timertask start : ' + formatDate(new Date(), 'yyyy-MM-dd hh:mm:ss'));

    var imap = new Imap({
        user: 'flight@efreight.cn',
        password: '123456',
        host: 'imap.ym.163.com',
        port: 993,
        tls: true
    });


    imap.once('ready', function() {
        imap.openBox('INBOX', false,function(err, box) {
            if (err) throw err;
            imap.search([ 'UNSEEN'], function(err, results) {
                if (err) throw err;

                console.log('unseen mail count: ' + results.length);


                if (results.length != 0) {
                    var f = imap.fetch(results, { bodies: '', markSeen: true});

                    f.on('message', function(msg, seqno) {

                        var prefix = '(#' + seqno + ') ';

                        msg.on('body', function(stream, info) {
                            var buffer = '', count = 0;
                            stream.on('data', function(chunk) {
                                count += chunk.length;
                                buffer += chunk.toString('utf8');
                            });
                            stream.once('end', function() {
//                        console.log('mail string : ' + buffer);
//                        console.log(inspect(buffer));

                                var mailheader = eval('(' + inspect(Imap.parseHeader(buffer)) + ')');
                                var subject = mailheader.subject;

                                if (/Flight Status Message/.test(subject)) {

                                    var mailinfo = buffer.substring(buffer.indexOf('<!DOCTYPE'), buffer.indexOf('</html>') + 8);

                                    var $ = cheerio.load(mailinfo);

                                    var status = '',flightnum;

                                    $('td.status').each(function(i,e){
                                        if (i == 0) {
                                            var temp = $(e).text().replace(/[\n\r\t]+/g,'').replace(/[\s]{2,}/g,'');
                                            var a = temp.indexOf('Singapore Airlines');
                                            var b = temp.indexOf('Status');
                                            var c = temp.indexOf('Event');
                                            if (a > -1 && b > a && c > b) {
                                                flightnum = temp.substring(a + 18, b).replace('#','').replace(/[\s]+/g,'');
                                                status = temp.substring(b + 6, c).replace(':','').replace(/[\s]+/g,'');;
                                            }
                                            console.log('flightnum is : ' + flightnum);
                                            console.log('status is : ' + status);
                                            return false;
                                        }
                                    });

                                    if (status == '' || status == 'Scheduled') {
                                        return false;
                                    }

                                    var flightdate = '',
                                        sceduldeptime = '',
                                        dely = '';

                                    //航班日期
                                    $('td.status_caps').each(function(i,e){
                                        if (i == 0) {
                                            var temp = $(e).text().replace(/[\n\r\t]+/g,'').replace(/[\s]{2,}/g,'').replace('min','');
                                            if (/DEPARTS/.test(temp)) {
                                                flightdate = temp.substring(temp.indexOf(':')+2,temp.indexOf('('));
                                            }
                                            console.log('flightdate is : ' + flightdate);
                                            return false;
                                        }

                                    });

                                    //预计起飞时间
                                    $('td.schedule_data').each(function(i,e){
                                        if (i == 0) {
                                            sceduldeptime = $(e).text().replace(/[\n\r\t]+/g,'').replace(/[\s]{2,}/g,'');
                                            console.log('sceduldeptime is : ' + sceduldeptime);
                                            return false;
                                        }
                                    });

                                    //延迟时间
                                    $('td.delay').each(function(i,e){
                                        if (i == 0) {
                                            dely = $(e).text().replace(/[\n\r\t]+/g,'').replace(/[\s]{2,}/g,'').replace('min','');
                                            console.log('dely is : ' + dely);
                                            return false;
                                        }
                                    });

                                    sceduldeptime = flightdate + sceduldeptime;

                                    sceduldeptime = getFullDate(sceduldeptime);
                                    console.log('sceduldeptime is : ' + sceduldeptime);

                                    var realdeptime = getDeptime(sceduldeptime, dely);
                                    console.log('realdeptime is : ' + realdeptime);

                                    flightdate = sceduldeptime.substring(0,sceduldeptime.indexOf(' '));

                                    pushmsg(flightnum, flightdate, realdeptime);

                                }

                            });
                        });

                        msg.once('attributes', function(attrs) {
//                    console.log(prefix + 'Attributes: %s', inspect(attrs, false, 8));
                        });
                        msg.once('end', function() {
                            console.log(prefix + 'Finished');
                        });
                    });

                    f.once('error', function(err) {
                        console.log('Fetch error: ' + err);
                    });
                    f.once('end', function() {
                        console.log('Done fetching all messages!');
                        imap.end();
                    });
                }
            });
        });
    });

    imap.once('error', function(err) {
        console.log('imap error : ' + err);
    });

    imap.once('end', function() {
        console.log('Connection ended');
    });

    imap.connect();
}, function(){
    console.log(formatDate(new Date(), 'yyyy-MM-dd hh:mm:ss') + ' flightstatsalert timertask stop!');
},true);


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

function getDeptime(str, dely){
    var date = new Date(str);
    date.setMinutes(date.getMinutes() + parseInt(dely));
    return formatDate(date, 'yyyy-MM-dd hh:mm:ss');
}


function pushmsg(realflightnum, flightdate, deptime){
    var flightnum,
        flightday,
        client = redis.createClient(6379, '192.168.0.218');

    client.hget('flights', realflightnum + '|' + flightdate, function(err, reply){
        if (err) {
            console.log('err',err);
        } else {

            if(reply == null){
                console.log('can not get record of realflightnum : ' + realflightnum + ' flightdate : ' + flightdate);
            } else {
                flightnum = reply;
                client.hexists('pushmsg', flightnum + '|' + flightdate, function(err, replies){
                    if (err) {
                        console.log('hexists pushmsg ' + flightnum + '|' + flightdate + ' ' + deptime + ' error : ' + err);
                    } else {
                        if (replies != 1) {//不存在该记录

                            pushmsg2dc(flightnum, flightdate, deptime);

                        }
                    }
                });
            }
        }
    });


}

function pushmsg2dc (flightnum, flightday, flightdate) {
    request.post({
        uri: 'http://192.168.0.218:8001/HttpEngine',
        form: {
            'serviceXml': '<Service><ServiceURL>RealQuery</ServiceURL><ServiceAction>updateFlightDate</ServiceAction><ServiceData><flight><flightno>'
                + flightnum + '</flightno><flightdate>' + flightday + '</flightdate><realflightdate>' + flightdate + '</realflightdate></flight></ServiceData></Service>'
        }
    },function(err, response, body){
        if (err) {
            console.log('push data to datacenter error, error is : ' + err);
            mailUtil.send({
                'reciever': 'marsbaiyp@gmail.com',
                'subject': 'falightstat timertask alert',
                'content': 'flightnum ' + flightnum + ' flightdate ' + flightday + ' deptime ' + flightdate + 'push to dc error, error is : \n' + err
            });
        } else {
            console.log(body);
            if (body.indexOf('更新成功') > -1) {
                var client = redis.createClient(6379, '192.168.0.218');
                var now = formatDate(new Date(), 'yyyy-MM-dd hh:mm:ss');
                client.hset('pushmsg', flightnum + '|' + flightday, flightdate + '|' + now, function (err, replies) {
                    if (err) {
                        console.log('err', err);
                        console.log('hset ' + 'flightnum : ' + flightnum + ' flightday : ' + flightday + ' depdate : ' + flightdate);
                    } else {
                        console.log('replies', replies);
                        console.log(formatDate(new Date(), 'yyyy-MM-dd hh:mm:ss') + ' hset ' + 'pushmsg --' + flightnum + ' flightday : ' + flightday + ' depdate : ' + flightdate + ' success!');
                    }
                    client.quit();
                });
            } else {
                console.log('push data to datacenter failed, the response is : \n' + body);
                mailUtil.send({
                    'reciever': 'marsbaiyp@gmail.com',
                    'subject': 'falightstat timertask alert',
                    'content': 'flightnum ' + flightnum + ' flightdate ' + flightday + ' deptime ' + flightdate + 'push to dc failed, reponse is : \n' + body
                });
            }
        }

    });
}


/**
 * 日期格式化
 * @param date 日期，Date的一个实例化对象
 * @param fmt 需要返回的日期字符串的格式
 * @returns 日期字符串
 */
function formatDate (date, fmt) { //author: meizz
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