/**
 * Created by Mars on 14-6-9.
 */
var cheerio = require('cheerio');
var httputil = require('./../util/HttpUtil');
var redis = require('redis');

exports.getstatus = function(req, res){
    var isbegin = req.body.isbegin;

    if (!isbegin) {
        res.json({
            'status': 'error',
            'msg': 'unknown option!'
        });
    }

    if (isbegin == 'true') {
        //启动轮询
        setTimeout(function(){
            updateFlightStatus();
        },10000);




    } else if (isbegin == 'false') {
        //停止轮询
    }
}


updateFlightStatus('LH', '720', '2014-06-08');

function updateFlightStatus(airline, flightnum, flightdate){
    var uri = 'http://www.flightstats.com/go/FlightStatus/flightStatusByFlight.do?airline=' + airline
            + '&flightNumber=' + flightnum + '&departureDate=' + flightdate + '&x=33&y=9';

    httputil.get(uri, {}, function(content, status){
//        console.log(content);
        if (status == 200) {
            var $ = cheerio.load(content);

            var flightstatus,
                scheduledDepdate,
                actualDepdate;
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

            console.log('flightstatus : ' + flightstatus +
                        '\nScheduled Departure : ' + scheduledDepdate +
                        '\nActual Departure : ' + actualDepdate);
        }
    });
}