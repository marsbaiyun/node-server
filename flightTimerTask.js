/**
 * Created by Mars on 14-6-11.
 */
var request = require('request'),
    cheerio = require('cheerio'),
    redis = require('redis'),
    cronJob = require('cron').CronJob;


var myJob = new cronJob('0 */10 * * * *', function(){
    var client = redis.createClient(6379, '192.168.0.218');
    console.log(formatDate(new Date(), 'yyyy-MM-dd hh:mm:ss') + ' update flightstatus task start!');
    client.hkeys("flights", function (err, replies) {
        console.log(replies.length + " replies:");

        replies.forEach(function (reply, i) {
            console.log("    " + i + ": " + reply);

            var array = reply.split('|');
            if (!array || array.length < 2) {
                return false;
            }
            var airline,flightnum,flightdate;
            flightnum = array[0];
            flightdate = array[1];

            if (!isDateValid(flightdate)) {
                return false;
            }

            if (flightnum.length > 2) {
                airline = flightnum.substr(0,2);
                flightnum = flightnum.replace(airline,'');
            } else {
                return false;
            }
            client.hget("flights", reply, function(err, reply){
                console.log(reply);

                var awbcode = reply;

                updateFlightStatus(airline, flightnum, flightdate, awbcode);
            });
        });
        client.quit();
    });

},function(){
    console.log(formatDate(new Date(), 'yyyy-MM-dd hh:mm:ss') + ' update flightstatus task stop!');
},true);


function updateFlightStatus(airline, flightnum, flightdate, awbcode){

    var uri = 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?airline=' + airline
        + '&flightNumber=' + flightnum + '&departureDate=' + flightdate + '&x=33&y=9';

    request.get(uri, function(error, response, content){
        if (!error && response.statusCode == 200) {
            var $ = cheerio.load(content);

            var flightstatus = '',
                scheduledDepdate = '',
                actualDepdate = '';
            $('div.statusBlock').find('div.statusType').each(function(i,o){
                flightstatus = $(o).text().replace(/[\n\r\t]+/g,'').replace(/[\s]{2,}/g,'');
            });

            var sflag = false,
                dflag = false;
            $('table.statusDetailsTable').find('tr').each(function(i,o){
                $(o).find('td').each(function(j,e){
                    var temp = $(e).text().replace(/[\n\r\t]+/g,'').replace(/[\s]{2,}/g,'');
                    if (j == 0) {
                        if (sflag) {
                            scheduledDepdate = temp;
                            sflag = false;
                        }
                        if (dflag) {
                            actualDepdate = temp;
                            dflag = false;
                        }
                        if (temp == 'Scheduled Departure:') {
                            sflag = true;
                        } else if (temp == 'Actual Departure:') {
                            dflag = true;
                        }
                    }
                });
            });

            console.log('flightnum : ' + airline + flightnum +
                ' flightstatus : ' + flightstatus +
                ' Scheduled Departure : ' + scheduledDepdate +
                ' Actual Departure : ' + actualDepdate);

            if (actualDepdate != '') {
                var client = redis.createClient(6379, '192.168.0.218');

                actualDepdate = formatDate(new Date(actualDepdate.replace(/-[A-z]+ /,'')), 'yyyy-MM-dd hh:mm:ss');
                client.hexists('flightdates', actualDepdate, function(err, replies){
                    if (err) {
                        console.log('err', err);
                        console.log('hexists flightdates : ' + actualDepdate + ' error!');
                    } else {
                        if (replies == 1) {//存在该记录
                            client.hget('flightdates', actualDepdate, function(err, replies){
                                if (err) {
                                    console.log('err', err);
                                    console.log('hget flightdates --' + actualDepdate + ' error!');
                                } else {
                                    var temp = replies;
                                    awbcode = temp + ',' + awbcode;
                                }
                            });
                        }

                        client.hset('flightdates', actualDepdate, awbcode, function (err, replies) {
                            if (err) {
                                console.log('err', err);
                                console.log('hset ' + 'flightdates --' + actualDepdate + '--' + awbcode + ' falied!');
                            } else {
                                console.log('replies', replies);
                                console.log(formatDate(new Date(), 'yyyy-MM-dd hh:mm:ss') + ' hset ' + 'flightdates --' + actualDepdate + '--' + awbcode + ' success!');

                                client.hdel('flights', airline + flightnum + '|' + flightdate, function (err, replies) {
                                    if (err) {
                                        console.log('err', err);
                                        console.log('hdel ' + 'flights --' + awbcode + '|' + airline + flightnum + ' failed!');
                                    } else {
                                        console.log('replies', replies);
                                        console.log(formatDate(new Date(), 'yyyy-MM-dd hh:mm:ss') + ' hdel ' + 'flights --' + awbcode + '|' + airline + flightnum + ' success!');
                                    }
                                    client.quit();
                                });

                            }
                        });
                    }
                });

            }

        } else {
            console.log('get flightstatus error! error is : ' + error);
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

/**
 * 验证航班日期是否在可查询日期范围内
 * @param str 日期字符串
 * @returns {boolean}
 */
function isDateValid (str) {
    var flag = true;
    var tempdate = new Date(str);
    var yesterday = new Date();
    var maxday = new Date();

    tempdate.setHours(0);
    tempdate.setMinutes(0);
    tempdate.setSeconds(1);

    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0);
    yesterday.setMinutes(0);
    yesterday.setSeconds(0);

    maxday.setDate(maxday.getDate() + 3);
    maxday.setHours(23);
    maxday.setMinutes(59);
    maxday.setSeconds(59);

//    console.log('flightdate : ' + tempdate + '\nyesterday : ' + yesterday + '\nmaxday : ' + maxday);
    if (tempdate < yesterday) {
        flag = false;
    }
    if (tempdate > maxday) {
        flag = false;
    }
    return flag;
}