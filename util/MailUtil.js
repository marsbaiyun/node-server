/**
 * Created by Mars on 14-6-13.
 */
var nodemailer = require('nodemailer');
var MailUtil = function(){};

var smtpTransport = nodemailer.createTransport("SMTP",{
    host: "smtp.ym.163.com", // 主机
    secureConnection: false, // 使用 SSL
    port: 25, // SMTP 端口
    auth: {
        user: "baiyp@efreight.cn", // 账号
        pass: "bai5180526" // 密码
    }
});


/*send({
    'reciever': 'baiyp@efreight.me',
    'subject': 'nodemailer test',
    'content': 'this is a test.',
    'filepath': '/mynodejs/node-server/util/2033103.jpg'
});*/

MailUtil.prototype.send = function(mailinfo){
//function send(mailinfo){
    var revieverlist = mailinfo['reciever'];
    var subject = mailinfo['subject'];
    var content = mailinfo['content'];
    var html = mailinfo['html'];
    var filepath = mailinfo['filepath'];

    // 设置邮件内容
    var mailOptions = {
        from: "白云鹏<baiyp@efreight.cn>", // 发件地址
        to: revieverlist, // 收件列表
        subject: subject, // 标题
        text: content // 邮件内容
    }

    if (filepath) {
        //读入文件
        var filename = filepath.substring(filepath.lastIndexOf('/') + 1);
        var attachment = [{
            fileName: filename,   //这里只是给附件取名称，而不是导入文件内容
//            streamSource: file         //导入文件
            filePath: filepath
        }]    //定义我们需要发送的附件

        mailOptions['attachments'] = attachment;
    }

    console.log(mailOptions);


    // 发送邮件
    smtpTransport.sendMail(mailOptions, function(error, response){
        if(error){
            console.log(error);
        }else{
            console.log("Message sent: " + response.message);
        }
        smtpTransport.close(); // 如果没用，关闭连接池
    });

}

module.exports = new MailUtil();