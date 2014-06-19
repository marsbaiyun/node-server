/**
 * Created by Mars on 14-6-10.
 */
$(document).ready(function(){
    console.log(111111111111111);
    $.get('/isrunning',function(data, status){
        if (status == 200) {
            $('#isrunning').val(data.isrunning);
        }
    });
});