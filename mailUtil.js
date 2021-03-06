/**
 * Created by Mars on 14-6-16.
 */
var cheerio = require('cheerio'),
    Imap = require('imap'),
    inspect = require('util').inspect,
    redis = require('redis');

var imap = new Imap({
    user: 'efreightsinoair@gmail.com',
    password: '0urTe@m!',
    host: 'imap.gmail.com',
    port: 993,
    tls: true
});

function openInbox(cb) {
    imap.openBox('INBOX', false, cb);
}

imap.once('ready', function() {
    openInbox(function(err, box) {
        if (err) throw err;
        imap.search([ 'UNSEEN'], function(err, results) {
            console.log('unseen mail count: ' + results.length);
            if (err) throw err;
            var f = imap.fetch(results, { bodies: '', markSeen: true});

            f.on('message', function(msg, seqno) {
                console.log('Message #%d', seqno);
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
                            var mailcontent = buffer.substring(buffer.indexOf('Date:'));

                            var infoarr = mailcontent.split('\r\n');
//                            console.log(infoarr);
                            if (infoarr && infoarr.length > 0) {
                                var flightnum = '',
                                    depdate = '';
                                for (var i = 0; i < infoarr.length; i ++) {
                                    var temp = infoarr[i];
                                    if (/SINGAPORE AIRLINES SQ/.test(temp)) {
                                        flightnum = temp.replace('SINGAPORE AIRLINES','').replace('#','').replace(/[\s]+/g,'');
                                    }
                                    if (/DEPARTS/.test(temp)) {
                                        var day = temp.substring(temp.indexOf(':')+2,temp.indexOf('('));
                                        var acd = infoarr[i+2];
                                        var time = acd.substring(acd.indexOf(':')+2);
                                        if (time !== '') {
                                            time = day + time;
//                                            console.log(time);

                                            depdate = getFullDate(time);

                                            console.log('flightnum : ' + flightnum + ' depdate : ' + depdate);

                                            pushmsg(flightnum, depdate);

                                        }
                                        return false;
                                    }

                                }
                            }

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
        });
    });
});

imap.once('error', function(err) {
    console.log(err);
});

imap.once('end', function() {
    console.log('Connection ended');
});

imap.connect();


function getFullDate(str){
    var today = new Date();
    var year = today.getFullYear();

    var arr = [],
        thisyear = new Date(year + ' ' + str),
        lastyear = new Date((year-1) + ' ' + str),
        nextyear = new Date((year+1) + ' ' + str),
        tempdate,
        s = 100000000;

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

function pushmsg(flightnum, flightdate){
    var airline,
        flightday,
        client = redis.createClient(6379, '192.168.0.218');

    if (flightnum.length > 2) {
        airline = flightnum.substring(0,2);
        flightnum = flightnum.replace(airline,'');
    }

    client.hget('flight', airline + flightnum, function(err, reply){
        if (err) {
            console.log('err',err);
        } else {

            if(reply == null){
                client.hget('flight', airline + '0' + flightnum, function(err, reply){
                    if (reply != null) {
                        flightday = reply;
                        pushmsg2dc(airline + '0' + flightnum, flightday, flightdate);
                    }
                });
            } else {
                flightday = reply;
                pushmsg2dc(airline + flightnum, flightday, flightdate);
            }
            client.quit();
        }
    });


}

function pushmsg2dc (flightnum, flightday, flightdate) {
    var client = redis.createClient(6379, '192.168.0.218');
    client.hexists('pushmsg', flightnum, function(err, replies){
        if (err) {
            console.log('err', err);
            console.log('hexists flightdates : ' + flightdate + ' error!');
        } else {
            if (replies != 1) {//不存在该记录
                client.hset('pushmsg', flightnum, flightday + '|' + flightdate, function (err, replies) {
                    if (err) {
                        console.log('err', err);
                        console.log('hset ' + 'flightnum : ' + flightnum + ' flightday : ' + flightday + ' depdate : ' + flightdate);
                    } else {
                        console.log('replies', replies);
                        console.log(formatDate(new Date(), 'yyyy-MM-dd hh:mm:ss') + ' hset ' + 'pushmsg --' + flightnum + ' flightday : ' + flightday + ' depdate : ' + flightdate + ' success!');
                    }
                    client.quit();
                });
            }
        }
    });
}