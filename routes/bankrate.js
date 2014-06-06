/**
 * Created by Mars on 14-5-29.
 */
var cheerio = require('cheerio');
var httputil = require('./../util/HttpUtil');

var num = 0;


exports.getallrates = function(req, res){
//2014-06-06注掉
//    var uri = 'http://srh.bankofchina.com/search/whpj/search.jsp';
//    var date = new Date();
//    var begindate = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
//
//    date.setDate(date.getDate() + 1);
//
//    var enddate = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
//
//    var pagenum = 0;
//
//    var param = 'erectDate=' + begindate + '&nothing=' + enddate + '&pjname=' + pagenum;
//
//    var html;
//
//    httputil.post(uri, param, {}, function(content, status){
//        if (status == 200) {
//
//            var reRecordcountstr = /var m_nRecordCount = \d+;/g;
//            var rePageSizestr = /var m_nPageSize = \d+;/g;
//
//
//            var recordCount = /\d+/g.exec(reRecordcountstr.exec(content) + '') + '';
//            var pageSize = /\d+/g.exec(rePageSizestr.exec(content) + '') + '';
//
//            num = recordCount;
//
//            var pageCount = Math.ceil(recordCount/pageSize);
//
//            getExrate(uri, param, pageCount);
//
//        } else {
//
//        }
//    });

    var uri = 'http://www.boc.cn/sourcedb/whpj/index.html';

    httputil.get(uri, {}, function(content, status){
        if (status == 200) {
            var $ = cheerio.load(content);

            var data = [];
            $('div#DefaultMain').parent().find('table').find('tr').each(function(j,e){

                var currencyName,
                    buyingRate,
                    cashBuyingRate,
                    sellingRate,
                    cashSellingRate,
                    publishDate,
                    BOCmiddleRate,
                    publishTime;
                $(e).find('td').each(function(k,o){
                    switch(k){
                        case 0:
                            currencyName = $(o).text();
                            break;
                        case 1:
                            buyingRate = $(o).text();
                            break;
                        case 2:
                            cashBuyingRate = $(o).text();
                            break;
                        case 3:
                            sellingRate = $(o).text();
                            break;
                        case 4:
                            cashSellingRate = $(o).text();
                            break;
                        case 5:
                            BOCmiddleRate = $(o).text();
                            break;
                        case 6:
                            publishDate = $(o).text();
                            break;
                        case 7:
                            publishTime = $(o).text().replace(/[\s]+/,'');
                            break;
                        default :
                            break;
                    }
                });
                if (typeof(publishTime) != 'undefined' && publishTime != '') {
                    data.push({
                        '货币名称': currencyName,
                        '现汇买入价': buyingRate,
                        '现钞买入价': cashBuyingRate,
                        '现汇卖出价': sellingRate,
                        '现钞卖出价': cashSellingRate,
                        '中行折算价': BOCmiddleRate,
                        '发布时间': publishDate + ' ' + publishTime
                    });
                }

            });

            console.log(data);

            res.json({
                'status': 'success',
                'data': data
            });

        } else {
            res.json({
                'status': 'failed',
                'data': 'get allrates error! http statuscode is : ' + status
            });
        }
    });

}

exports.getsinglerate = function(req, res){
    console.log('11111' + req.body.currency);
    var currency = req.body.currency;

    if (!currency || currency == '') {
        res.json({
            'status': 'failed',
            'data': 'currency name error!'
        });
    }

    var uri = 'http://www.boc.cn/sourcedb/whpj/';
    httputil.get(uri, {}, function(content, status){
        if (status == 200) {
            var $ = cheerio.load(content);

            var currencies = {};
            $('select#pjname').find('option').each(function(i,e){
                var currencyname = $(e).text();
                var currencyid = $(e).attr('value');
                currencies[currencyname] = currencyid;
            });

            var pjname = currencies[currency];
            if (!pjname) {
                res.json({
                        'status': 'failed',
                        'data': 'currency name error!'
                });
            }
            var seachuri = 'http://srh.bankofchina.com/search/whpj/search.jsp';

            var date = new Date();
            var begindate = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();

            date.setDate(date.getDate() + 1);

            var enddate = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();

            var param = 'erectDate=' + begindate + '&nothing=' + enddate + '&pjname=' + pjname;

            var html;

            httputil.post(seachuri, param, {}, function(content, status){
                if (status == 200) {
                    $ = cheerio.load(content);

                    var data = {};

                    $('div.BOC_main.publish').find('table').find('tr').each(function(j,e){
                        var currencyName,
                            buyingRate,
                            cashBuyingRate,
                            sellingRate,
                            cashSellingRate,
                            FEmiddleRate,
                            BOCmiddleRate,
                            publishTime;
                        $(e).find('td').each(function(k,o){
                            switch(k){
                                case 0:
                                    currencyName = $(o).text();
                                    break;
                                case 1:
                                    buyingRate = $(o).text();
                                    break;
                                case 2:
                                    cashBuyingRate = $(o).text();
                                    break;
                                case 3:
                                    sellingRate = $(o).text();
                                    break;
                                case 4:
                                    cashSellingRate = $(o).text();
                                    break;
                                case 5:
                                    FEmiddleRate = $(o).text();
                                    break;
                                case 6:
                                    BOCmiddleRate = $(o).text();
                                    break;
                                case 7:
                                    publishTime = $(o).text().replace(/\./g,'-');
                                    break;
                                default :
                                    break;
                            }
                        });
                        if (typeof(publishTime) != 'undefined') {
                            data = {
                                '货币名称': currencyName,
                                '现汇买入价': buyingRate,
                                '现钞买入价': cashBuyingRate,
                                '现汇卖出价': sellingRate,
                                '现钞卖出价': cashSellingRate,
                                '外管局折算价': FEmiddleRate,
                                '中行折算价': BOCmiddleRate,
                                '发布时间': publishTime
                            };
                            return false;
                        }

                    });

                    if (data != null) {
                        res.json({
                            'status': 'success',
                            'data': data});
                    } else {
                        res.json({
                            'status': 'failed',
                            'data': 'get rate failed!'
                        });
                    }

                } else {

                }
            });


        } else {

        }
    });
}


function getRate (begindate, enddate, pjname) {
    var uri = 'http://srh.bankofchina.com/search/whpj/search.jsp';

    var param = 'erectDate=' + begindate + '&nothing=' + enddate + '&pjname=' + pjname;

    var html;

    httputil.post(uri, param, {}, function(content, status){
        if (status == 200) {

            var reRecordcountstr = /var m_nRecordCount = \d+;/g;
            var rePageSizestr = /var m_nPageSize = \d+;/g;


            var recordCount = /\d+/g.exec(reRecordcountstr.exec(content) + '') + '';
            var pageSize = /\d+/g.exec(rePageSizestr.exec(content) + '') + '';

            num = recordCount;

            var pageCount = Math.ceil(recordCount/pageSize);

            getExrate(uri, param, pageCount);

        } else {

        }
    });
}

function getExrate (uri, param, pagecount) {
//    console.log('货币名称	现汇买入价	现钞买入价	现汇卖出价	现钞卖出价	外管局折算价     中行折算价      发布时间');
    console.log('pagecount: ' + pagecount);

    for(var i = 1; i <= pagecount; i++){
        httputil.post(uri, param + '&page=' + i, {}, function(content, status){
            if (status == 200) {
                var $ = cheerio.load(content);
                $('div.BOC_main.publish').find('table').find('tr').each(function(j,e){
                    var currencyName,
                        buyingRate,
                        cashBuyingRate,
                        sellingRate,
                        cashSellingRate,
                        FEmiddleRate,
                        BOCmiddleRate,
                        publishTime;
                    $(e).find('td').each(function(k,o){
                        switch(k){
                            case 0:
                                currencyName = $(o).text();
                                break;
                            case 1:
                                buyingRate = $(o).text();
                                break;
                            case 2:
                                cashBuyingRate = $(o).text();
                                break;
                            case 3:
                                sellingRate = $(o).text();
                                break;
                            case 4:
                                cashSellingRate = $(o).text();
                                break;
                            case 5:
                                FEmiddleRate = $(o).text();
                                break;
                            case 6:
                                BOCmiddleRate = $(o).text();
                                break;
                            case 7:
                                publishTime = $(o).text();
                                break;
                            default :
                                break;
                        }
                    });
                    if (typeof(publishTime) != 'undefined') {
                        var data = {
                            '货币名称': currencyName,
                            '现汇买入价': buyingRate,
                            '现钞买入价': cashBuyingRate,
                            '现汇卖出价': sellingRate,
                            '现钞卖出价': cashSellingRate,
                            '外管局折算价': FEmiddleRate,
                            '中行折算价': BOCmiddleRate,
                            '发布时间': publishTime
                        };
                        check(data);
                    }

                });
            } else {
                console.log('获取页面出现异常，状态码：' + status);
            }

        });

    }

}

function check(data){

    client.lpush(data['发布时间'], JSON.stringify(data),function(err, res){
        console.log('the dedis res is : ' + err);
        if (!err) {
            console.log('the ' + num + " page done!");
            num --;
            if (num === 0) {
                //所有记录都已入库，可做查询操作
                client.lrange('2014-06-03 10:48:01', '0', '-1', function (err, res) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log('redis response: \n' + res);
                    }

                    // 关闭链接
                    client.end();
                });
            }
        }
    });

}

function getMillisecond(datastr){
    var date = new Date(Date.parse(datastr.replace(/-/g,   "/")));

    return date.getTime();
}