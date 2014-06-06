/**
 * Created by Mars on 14-5-16.
 */
var cheerio = require('cheerio');
var httputil = require('./../util/HttpUtil');
var request = require('request');

var num = 0,
    interval = 0,
    resultmsg = {
        'flag': '',
        'msg': ''
    };

exports.addItem = function(req, res){

    var uri = req.body.uri;

    if (!uri) {
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.write("url is null.");
        res.end();
    }

    console.log('item url is :\n' + uri);

    init();

    httputil.get(uri, {}, function(content, status){
//        console.log('item html :\n' + content);
        if (status == 200) {

            getItemInfo(content);

            //监听
            setTimeout(function () {
                if (resultmsg.flag == "") {
                    setTimeout(arguments.callee, 2000);
                } else {
                    res.writeHead(200, {'Content-Type': 'text/plain'});
                    if (resultmsg.flag == 'true') {
                        res.write("add item success!");
                    } else if (resultmsg.flag == 'false'){
                        res.write("add item failed! err info: " + resultmsg.msg);
                    }
                    res.end();
                }
            }, 2000);

        } else {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.write("get amazon item page failed, please try again later!");
            res.end();
        }
    });
}

/**
 * 初始化计数器和添加商品结果监控信息等
 */
function init(){
    num = 0;
    interval = 0;
    resultmsg = {
        'flag': '',
        'msg': ''
    };
}

/**
 * 获取商品的信息
 * @param html url返回的商品页
 */
function getItemInfo(html){
//    console.log('item html :\n' + html);
    var $ = cheerio.load(html);
    //item name
    var itemname = '';
    if ($('h1#title').html() != null) {
        itemname = $('h1#title').html();
    } else if ($('h1').find('span').text() != null) {
        itemname = $('h1').find('span').text();
    }
    if (itemname == '') {
        resultmsg.flag = 'false';
        resultmsg.msg = 'get itemname failed!please try again later.';
        return false;
    }
    console.log('item name is :\n' + itemname);

    //item img
    var big_images = [],
        small_iamges = [];
    var imgreg = /  colorImages = \{[^;]+\};/g;
    var imgarr = imgreg.exec(html);
    if (imgarr != null) {
        var temp = imgarr[0].replace('  colorImages = ','').replace(';','');
//        console.log('image json is :\n' + temp);
        var imgjson = eval('(' + temp + ')');
        for (var o in imgjson) {
            var color = o;
            //图片列表有很多图片，默认只取第一张图片
            var big = imgjson[o][0]['large'];
            var small = imgjson[o][0]['thumb'];
            big_images.push(big);
            small_iamges.push(small);
        }
        console.log('item big_images url is :\n' + big_images + '\nitem small_image url is :\n' + small_iamges);
    } else {
        console.log('get item image failed!');
        resultmsg.flag = 'false';
        resultmsg.msg = 'get itemimg failed!please try again later.';
        return false;
    }
    if (big_images.length == 0 || small_iamges.length == 0) {
        resultmsg.flag = 'false';
        resultmsg.msg = 'get itemimg failed!please try again later.';
        return false;
    }

    //item description
    var itemdescription = '',
        itemDetail = '';
    $('div.productDescriptionWrapper').each(function(i,e){
        itemdescription += '<p>' + $(e).text().replace(new RegExp(/[\n\r\t]+/g),'').replace(new RegExp(/[ ]{2,}/g),'').replace('\\','') + '</p>';
    });

    $('script').remove();
    $('style').remove();
    itemDetail = $('table#productDetailsTable').html();
    if (itemDetail != null) {
        itemDetail = itemDetail.replace(new RegExp(/[\n\r\t]+/g),'').replace(new RegExp(/[ ]{2,}/g),'');
    } else {
        itemDetail = $('div#detail-bullets').find('table').html();
        if (itemDetail != null) {
            itemDetail = itemDetail.replace(new RegExp(/[\n\r\t]+/g),'').replace(new RegExp(/[ ]{2,}/g),'');
        }
    }
    itemdescription += itemDetail;
    console.log('item detail html :\n' + itemDetail);


    //item department
    var itemdepartment = '';
    $('span.zg_hrsr_ladder').find('a').each(function(i,e){
        var temp = $(e).text();
        if (temp != 'in') {
            itemdepartment += temp + ' ';
        }
    });
    itemdepartment = itemdepartment.replace('\\','');

    //item property
    var itemproperty = [];
    //2014-05-20 版本 当时尚可用
//    $('div#twister_feature_div').find('form').find('div').each(function(i,e){
//        var temp = $(e).attr('id');
//        var propertyreg = /variation_\S+_name/;
//        var property = propertyreg.exec(temp);
//        if (property != null) {
//            property = (property + '').replace('variation_','').replace('_name','');
//            itemproperty.push(property);
//        }
//    });
    $('b.variationDefault').each(function(i,e){
        var temp = $(e).text();
        if (temp != '') {
            temp = temp.replace(/[\s\:]+/g,'');
            console.log('iteme property: ' + temp);
            itemproperty.push(temp);
        }
    });


    //property&&price
    var priceuriReg = /\"\/gp\/twister\/ajaxv2?[^\"]+\";/g;
    var host = 'http://www.amazon.com';
    var priceuri = host + (priceuriReg.exec(html) + '').replace(new RegExp(/[\";]+/g),'');

    //param
    var nodeid = $('input#nodeID').attr('value');
    var tagActionCode = $('input#tagActionCode').attr('value');
    var storeID = $('input#storeID').attr('value');

    var priceuriadd = 'sCac=1&isUDPFlag=1&ee=2&auiAjax=1&psc=1&asinList=#asid#&isFlushing=2&dStr=' +
        '&id=#asid#&prefetchParam=0&mType=full&dpxAjaxFlag=1&nodeID=' + nodeid + '&tagActionCode=' + tagActionCode +
        '&storeID=' + storeID;

    var reg = /var dimensionValuesDisplayData = \{[^};]+\};/g;

    var dvdd = (reg.exec(html) + '').replace('var dimensionValuesDisplayData = ','').replace(';','').replace(new RegExp(/[\n\r\t]+/g),'').replace(new RegExp(/[ ]{2,}/g),'');

    var dvjson = eval('(' + dvdd + ')');

    var priceinfo = {};
    num = Object.keys(dvjson).length;
    for (var o in dvjson) {
        var asid = o;

        var uri = priceuri + '&' + priceuriadd.replace(new RegExp(/#asid#/g),o);

//        console.log('price uri is :\n' + uri);

        httputil.get(uri, {}, function(content, status){
            if (status == 200) {
//                console.log("response html : \n" + content);
                var asidReg = /"ASIN" : "[^",]+",/;
                var itemasid = asidReg.exec(content);
                if (itemasid != null ) {
                    itemasid = (itemasid+'').replace('"ASIN" : "','').replace('",','');
                }

                //获取价格
                var pricedivReg = /\{\"price_feature_div\"[\:\s]+\"[^}]+\}/g;

                var pricediv = (pricedivReg.exec(content) + '').replace(/\\n/g,'').replace(/\\r/g,'').replace(/\\t/g,'');
                var pricejson = eval('(' + pricediv + ')');

                var itempriceinfo = getPirce(pricejson.price_feature_div);
//                console.log('itempriceinfo:\n' + JSON.stringify(itempriceinfo));


                //获取库存
                var numdivReg = /\{\"availability_feature_div\"[\:\s]+\"[^}]+\}/g;

                var numdiv = (numdivReg.exec(content) + '').replace(/\\n/g,'').replace(/\\r/g,'').replace(/\\t/g,'').replace(new RegExp(/[ ]{2,}/g),'');

                if (numdiv.indexOf('<script') > 0) {
                    numdiv = numdiv.replace(/<script[\S\s]+/,'') + '"}';
                }
                var numjson = eval('(' + numdiv + ')');

                var itemnum = getItemNum(numjson.availability_feature_div);


                priceinfo[itemasid] = {
                    'price': itempriceinfo.price,
                    'shipping': itempriceinfo.shipping,
                    'availabilitynum': itemnum
                };
                check({
                    'itemname': itemname,
                    'itemdescription': itemdescription,
                    'itemdepartment': itemdepartment,
                    'big_images': big_images,
                    'small_images': small_iamges,
                    'itemname': itemname,
                    'itemproperty': itemproperty,
                    'priceinfo': priceinfo,
                    'dvjson': dvjson
                });
            } else {
                resultmsg.flag = 'false';
                resultmsg.msg = 'get itemprice failed!';
                return false;
            }

        });
    }
}

/**
 * 如所有线程都已结束，则发出添加商品的请求
 * @param item 商品信息
 */
function check(item){
    num --;
    if (num === 0) {
        var itemproperty = item.itemproperty;
        var priceinfo = item.priceinfo;
        var itemname = item.itemname;
        var itemdescription = item.itemdescription;
        var itemdepartment = item.itemdepartment;
        var big_images = item.big_images;
        var small_images = item.small_images;
        var dvjson = item.dvjson;

        for (var e in priceinfo) {
            for (var i = 0;i < itemproperty.length;i ++) {
                var prop = itemproperty[i];
                priceinfo[e][prop] = dvjson[e][i];
            }
        }

        var uri = 'http://115.28.34.197:8088//index.php?app=goods&act=goods_explode';

        var spec_1 = [],
            spec_2 = [],
            pricearray = [],
            stockarray = [],
            skuarray = [],
            spec_name_1 = '',
            spec_name_2 = '';

        spec_name_1 = (itemproperty[0] != null) ? itemproperty[0] : '';
        spec_name_2 = (itemproperty[1] != null) ? itemproperty[1] : '';

        for(var o in priceinfo){
            if (priceinfo[o].availabilitynum != 0) {
                spec_1.push(priceinfo[o][spec_name_1]);
                if (itemproperty.length > 1) {
                    spec_2.push(priceinfo[o][spec_name_2]);
                }
                pricearray.push(priceinfo[o].price);
                stockarray.push(priceinfo[o].availabilitynum);
                skuarray.push(o);
            }
        }
        console.log('post begin...' + itemname);

        var data = {
            'goods_name': itemname,
            'description': itemdescription,
            'cate_id': 85,
            'cate_id_1': 81,
            'cate_id_2': 85,
            'store_id': 2,
            'currency': 2,
            'cate_name': '海外精选\t服饰鞋包',
            'big_images': big_images,
            'small_images': small_images,
            'brand': '',
            'if_show': 1,
            'recommended': 1,
            'tags': itemdepartment,
            'spec_name_1': spec_name_1,
            'spec_name_2': spec_name_2,
            'spec_1': spec_1,
            'spec_2': spec_2,
            'price': pricearray,
            'stock': stockarray,
            'sku': skuarray
        };
        console.log('data:\n' + JSON.stringify(data));
        addItem(data);
    }

}

/**
 * 获取不同型号商品的价格
 * @param html
 * @returns {*}
 */
function getPirce(html){
//    console.log('price html :\n' + html);
    if (html == '') {
        return {price: 0, shipping: 0};
    }
    var $ = cheerio.load(html);

    var itemprice = '',
        shippingpricestr = '',
        availabilitynum= '';

    if ($('span#priceblock_ourprice').text() != '') {
        itemprice = $('span#priceblock_ourprice').text();
        shippingpricestr = $('span#ourprice_shippingmessage').find('span').text();
    } else if ($('span#priceblock_saleprice').text() != '') {
        itemprice = $('span#priceblock_saleprice').text();
        shippingpricestr = $('span#saleprice_shippingmessage').find('span').text();
    }

    var shipingprReg = /\$[\d\.]+ shipping/;

    var shippingprice = 0;

    var temp = shipingprReg.exec(shippingpricestr);
    if (temp != null) {
        shippingprice = temp + '';
        shippingprice = shippingprice.replace('$','').replace(' shipping','');
    }

    return {price: parseFloat(itemprice.replace('$','')), shipping: shippingprice};

}

/**
 * 获取不同型号商品的库存
 * @param html
 * @returns {Number}
 */
function getItemNum(html){
    var $ = cheerio.load(html);

    var num = 0;
    var itemnumstr = $('div#availability').find('span').text();
    if (/Only \d+ left in stock/.test(itemnumstr)) {
        num = /\d+/.exec(itemnumstr) + '';
    } else if (itemnumstr == 'In Stock.') {
        //表示货源很充足
        num = 100;
    }
    return parseInt(num);
}

/**
 * 向外运商城添加商品
 * @param data 商品信息
 */
function addItem(data){
//    console.log('post data:\n' + data);
    var uri = 'http://115.28.34.197:8088//index.php?app=goods&act=goods_explode';
//    request.timeout = 150000;
    request.post({
        uri: uri,
        form: data,
        timeout: 150000
    },function(err, res, body){
        if (err) {
            resultmsg.flag = 'false';
            resultmsg.msg = err;
            console.log(err);
        } else {
            if (body.indexOf('Save Data Success') > -1) {
                resultmsg.flag = 'true';
            } else {
                resultmsg.flag = 'false';
                resultmsg.msg = body;
            }
            console.log('response body :' + body);

        }

    });

}