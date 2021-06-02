var driver_pushnotification = {
    send_push: function (token, device, title, body, event, data, app_end) {

        msg_data = {};
        msg_data['title'] = title;
        msg_data['body'] = body;
        msg_data['event'] = event;
        msg_data['extra'] = data;

        var FCM = require('fcm-push');

        var serverKey = 'AAAAz6JROgI:APA91bEyxv8JasVXmGT7FxNjhrL88nhjCgrG4bVvbkgwazgesW1RKTk77sxvxc5MHB9S-PngTUhacVU01VD249IFbKuUkNTxd9ipAW4aJkew7GYVlonW5HINCBWXzV5qTjLSmF4gO-Bq';
        var fcm = new FCM(serverKey);

        var message = {
            //to: 'cMVMITqrai4:APA91bE78Fpj4wHTFN-cfyN-IRHM7f1-WoA2s6a4rKc3f1oaFb9QFslb13HhP7VbgA8BDcL6GH7ZZtDxNXaOF3RpO50HwZE2PWOFIZgp0DHyXF7sNUaa1nWsarWoxT8S9AAW1R4VpxMQ', // required fill with device token or topics
            collapse_key: 'demo',
            data: {
                custom_data: msg_data
            },
            notification: {
                title: title,
                body: body,
                sound: "default"
            }
        };

        if (typeof token == 'string')
            message['to'] = token;
        else
            message['registration_ids'] = token;

        //callback style
        fcm.send(message, function (err, response) {
            if (err) {
                //console.log(err);
                //console.log("Something has gone wrong!");
                return false;
            } else {
                if (response) {
                    //console.log("Successfully sent with response: ", response);
                    return true;
                } else {
                    return false;
                }
            }
        });
    }

}
module.exports = driver_pushnotification;