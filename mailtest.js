/**
 * Created by Mars on 14-6-16.
 */
var cheerio = require('cheerio'),
    Imap = require('imap'),
    inspect = require('util').inspect,
    redis = require('redis');

var imap = new Imap({
    user: 'marsbaiyp@gmail.com',
    password: 'bai5180526',
    host: 'imap.gmail.com',
    port: 993,
    tls: true
});

function openInbox(cb) {
    imap.openBox('INBOX', true, cb);
}

imap.once('ready', function() {
    openInbox(function(err, box) {
        if (err) throw err;
        var f = imap.seq.fetch('3374', {
            bodies: '',
            struct: true
        });
        f.on('message', function(msg, seqno) {
            console.log('Message #%d', seqno);
            var prefix = '(#' + seqno + ') ';
            msg.on('body', function(stream, info) {
                var buffer = '';
                stream.on('data', function(chunk) {
                    buffer += chunk.toString('utf8');
                });
                stream.once('end', function() {
                    var mailheader = eval('(' + inspect(Imap.parseHeader(buffer)) + ')');
                    var subject = mailheader.subject;
                    if (/Flight Status Message/.test(subject)) {

                        var mailinfo = buffer.substring(buffer.indexOf('<!DOCTYPE'), buffer.indexOf('</html>') + 8);

                        var $ = cheerio.load(mailinfo);

                        var status,flightnum;

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
                    }
                });
            });
            msg.once('attributes', function(attrs) {
                console.log(prefix + 'Attributes: %s', inspect(attrs, false, 8));
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
        s = 10000000000000000000000;

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