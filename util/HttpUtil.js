/**
 * Created by Mars on 14-4-11.
 */
var HttpUtil = function(){};
var http = require('http');
var request = require('request');

HttpUtil.prototype.get = function(url, header, callback){
    var options = {
        uri: url,
        headers: header
    }

    request(options, function(error, response, body){
        if (!error && response.statusCode == 200) {
            callback(response.body, response.statusCode);
        }
    });
}

HttpUtil.prototype.post = function(url, data, header, callback){

    var array = data.split('&');
    var formdata = '';
    for(var i=0;i < array.length;i ++){
        var temp = array[i];
        var index = temp.indexOf('=');
        if (index > 0) {
            var keystr = temp.substring(0,index);
            var valuestr = temp.substring(index + 1);
            formdata += '"' + keystr + '":"' + valuestr + '"';
            if (i < array.length - 1) {
                formdata += ',';
            }
        }
    }

    formdata = require('querystring').stringify(JSON.parse('{' + formdata + '}'));
    header['content-type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
    header['Content-Length'] = formdata.length;

    var secure = '';
    if (url.substr(0,5) === 'https') {
        secure = 'SSLv3_method';
    }
    var options = {
        uri: url,
        body: formdata,
        headers: header,
        secureProtocol: secure
    }

    request.post(options, function(error, response, body){
        if (!error && response.statusCode == 200) {
            callback(body, response.statusCode);
        }
    });
}

module.exports = new HttpUtil();