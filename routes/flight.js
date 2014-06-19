/**
 * Created by Mars on 14-6-9.
 */
var cheerio = require('cheerio'),
    request = require('request'),
    dateutil = require('./../util/DateUtil'),
    redis = require('redis');




exports.setalert = function(req, res){
    var flightnum = req.query.flightnum;
    var flightdate = req.query.flightdate;

    var realflightnum = '';

    console.log('flightnum : ' + flightnum + ' flightdate : ' + flightdate);

    if (isEmpty(flightnum) || isEmpty(flightdate)) {
        res.json({
            'status': 'err',
            'msg': 'flightnum or flightdate is null.'
        });
    } else {

        var airline = '';
        if (flightnum.length > 2) {
            airline = flightnum.substring(0,2);
            flightnum = flightnum.replace(airline,'');
        }

        var __utmv = '104620247.|1=UserId=5177510=1^3=EmailDomain=gmail.com=1';
        var homeuri = 'http://www.flightstats.com/go/Home/home.do';

        request.get(homeuri, function(error, response, content){
            if (!error && response.statusCode == 200) {
                var cookielist = getCookie(response);
                var jsessionid = cookielist['JSESSIONID'];
                var fs_tokeniql = cookielist['fs_tokeniql'];

                var __gads = '',
                    cookieuri = 'http://pubads.g.doubleclick.net/gampad/ads?gdfp_req=1&correlator=3137340471574733&output=json_html&callback=window.parent.googletag.impl.pubads.setAdContentsBySlotForAsync&impl=fifs&json_a=1&sfv=1-0-0&iu_parts=1010197%2CFS_H_Home_top_728x90%2CFS_H_Home_bottom_728x90%2CFS_H_Home_top_right_300x250%2CROS_top_1x1&enc_prev_ius=%2F0%2F1%2C%2F0%2F2%2C%2F0%2F3%2C%2F0%2F4&prev_iu_szs=728x90%2C728x90%2C300x250%2C1x1&cookie_enabled=1&lmt=1402653199&dt=1402653199283&cc=100&ea=0&frm=20&biw=1345&bih=261&oid=2&adks=1835381908%2C319985368%2C71254347%2C873095992&oe=utf-8&gut=v2&sps=channel,,%252B8514636944%252B3610317267,%252B3659457093,%252B3850071277&ifi=1&u_tz=480&u_his=1&u_java=true&u_h=768&u_w=1366&u_ah=728&u_aw=1366&u_cd=32&flash=13.0.0.214&url=http%3A%2F%2Fwww.flightstats.com%2Fgo%2FHome%2Fhome.do&vrg=40&vrp=40&ga_vid=1820063235.1402653199&ga_sid=1402653199&ga_hid=1394326121&ga_fc=true&ga_wpids=UA-382334-1';
                request.get(cookieuri, function(error, response, content){
                    if (!error && response.statusCode == 200) {
                        console.log('get cookie success!');
                        var regstr = /"_cookies_":\[[^\[]+\]/;
                        var arr = regstr.exec(content);
                        if (arr) {
                            var cookiestr = arr[0].replace('"_cookies_":[','').replace(']','');
                            var json = eval('(' + cookiestr + ')');
                            __gads = json['_value_'];

                            var cookiestr = 'JSESSIONID=' + jsessionid + ';FS_tokenIQL=' + fs_tokeniql +
                                ';__gads=' + __gads + ';__utmv=' + __utmv + ';__utma=104620247.1820063235.1402653199.1402653199.1402653199.1' +
                                ';__utmb=104620247.6.10.1402653199;__utmc=104620247;__utmz=104620247.1402653199.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none)';


                            var loginuri = 'https://www.flightstats.com/go/Login/login.do';
                            request.post({
                                uri: loginuri,
                                headers: {
                                    'Cookie': cookiestr,
                                    'Host': 'www.flightstats.com',
                                    'Referer': 'https://www.flightstats.com/go/FlightMonitor/flightRules.do;jsessionid=' + jsessionid + '?',
                                    'User-Agent': 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1; WOW64; Trident/4.0; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; Media Center PC 6.0; .NET4.0C; .NET4.0E)'
                                },
                                form: {
                                    '__checkbox_remember': '__checkbox_true',
                                    'arbitraryName': 'bai5180526',
                                    'originalUserNameTextBox': 'MarsOnly',
                                    'password': 'lvJY904ujGASJMc+wpDILQ==',
                                    'username': 'MarsOnly'
                                }
                            }, function(error, response, content){
//                        console.log(response.headers);
//                        console.log(content);
                                if (!error && response.statusCode == 200) {
                                    console.log('login success!');
                                    var regstr = /URL='[^']+'/;
                                    var arr = regstr.exec(content);
                                    if (arr) {
                                        var reduri = arr[0].replace('URL=\'','').replace('\'','');
                                        request.get({
                                            uri: reduri
                                        },function(error, response, content){
//                                    console.log(response.headers);
//                                    console.log(content);

                                            var flighturi = 'https://www.flightstats.com/go/FlightMonitor/flightRules.do?createAlert=true&airline=' + airline + '&flightNumber=' + flightnum + '&departureDate=' + flightdate + '&x=50&y=32';
                                            request.get({
                                                uri: flighturi,
                                                headers: {
                                                    'Cookie': cookiestr,
                                                    'Host': 'www.flightstats.com',
                                                    'Referer': reduri,
                                                    'User-Agent': 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1; WOW64; Trident/4.0; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; Media Center PC 6.0; .NET4.0C; .NET4.0E)'
                                                }
                                            }, function(error, response, content){
//                                        console.log(response.statusCode);
//                                        console.log(response.headers);
//                                        console.log(content);

                                                var $ = cheerio.load(content);

                                                var selected = $('input[name=selected]').val();

                                                var selectedarr = selected.split(',');
                                                if (selectedarr.length > 2) {
                                                    realflightnum = selectedarr[0] + selectedarr[1];
                                                } else {
                                                    console.log('get realflightnum from selected error!');
                                                    realflightnum = flightnum;
                                                }

                                                var alerturi = 'https://www.flightstats.com/go/FlightMonitor/flightRuleCreateBySegment.do?' +
                                                    'selected=' + selected + '&statusCodeList=&selectionList=&airlineCodeList=&flightNumberList=&' +
                                                    'departureDateList=&arrivalDateList=&departureAirportCodeList=&arrivalAirportCodeList=&depAlerts=true&' +
                                                    '__checkbox_arrAlerts=__checkbox_true&msgDest=0&emailAddress=efreightsinoair@gmail.com&' +
                                                    'msgType=1&wirelessNumber=&wirelessServiceCode=Select...&x=41&y=4';

                                                request.get({
                                                    uri: alerturi,
                                                    headers: {
                                                        'Cookie': cookiestr,
                                                        'Host': 'www.flightstats.com',
                                                        'Referer': 'https://www.flightstats.com/go/FlightMonitor/flightRuleCreateBySegment.do',
                                                        'User-Agent': 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1; WOW64; Trident/4.0; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; Media Center PC 6.0; .NET4.0C; .NET4.0E)'
                                                    }
                                                }, function(error, response, content){
                                                    console.log(response.statusCode);
                                                    console.log(response.headers);
                                                    console.log(content);

                                                    if (content.indexOf('Success! Flight Alert has been created.') > -1) {
                                                        console.log('set alert success.');

                                                        addflights(airline + flightnum, realflightnum, flightdate);

                                                        res.json({
                                                            'status': 'success',
                                                            'msg': 'set alert success.'
                                                        });
                                                    } else {
                                                        res.json({
                                                            'status': 'err',
                                                            'msg': 'set alert failed.'
                                                        });
                                                    }
                                                });
                                            });
                                        });
                                    }
                                } else {
                                    console.log('login failed!');
                                    res.json({
                                        'status': 'err',
                                        'msg': 'login failed.'
                                    });
                                }

                            });
                        }
                    } else {
                        console.log('get cookie failed!');
                        res.json({
                            'status': 'err',
                            'msg': 'get cookie failed.'
                        });
                    }
                });


            } else {

            }
        });
    }



}

function addflights(flightnum, realflightnum, flightdate){
    var client = redis.createClient(6379, '192.168.0.218');
    client.hset('flights', realflightnum, flightnum + '|' + flightdate, function(err, reply){
        if (err) {
            console.log('add flights : ' + flightnum + 'realflightnum : ' + realflightnum + ' flightdate : ' + flightdate + ' error : ' + err);
        } else {
            console.log('add flights : ' + flightnum + 'realflightnum : ' + realflightnum + ' flightdate : ' + flightdate + ' success!');
        }
        client.quit();
    });
}

function isEmpty (str) {
    if (str == null || str == '') {
        return true;
    } else {
        return false;
    }
}


function getCookie(request){
    var list = {},
        rc = request.headers['set-cookie'];
    rc && rc.forEach(function( cookie ) {
        cookie && cookie.split(';').forEach(function(str){
            var parts = str.split('=');
            list[parts.shift().trim()] = unescape(parts.shift().trim());
        });

    });
    return list;
}