var nodemailer = require("nodemailer");
var smtpTransport = require("nodemailer-smtp-transport");
var config = require("../config/config");

var mailAccountUser = config.sender_name;
var mailAccountPassword = config.sender_pass;

// /****************Templates *************/
var forgetpassword_template = require('./../mail_templates/forgotpassword');
var register_template = require('./../mail_templates/registration');
var afteractivation_template = require('./../mail_templates/afteractivation');
var suggestCategory = require('./../mail_templates/suggest-category');
var shareFeedback = require('./../mail_templates/sharefeedback');
var informmail = require('./../mail_templates/informmail');
var contactus = require('./../mail_templates/contactus');
var claimtemp = require('./../mail_templates/claim');
var placeorder = require('./../mail_templates/placeOrder');
var reservation = require('./../mail_templates/reservation');
var RegistrationReq_temp = require('./../mail_templates/RegistrationReq')


var fromEmailAddress = config.sender_name;
var transport = nodemailer.createTransport(
    //For gmail 
    smtpTransport({
        service: "gmail",
        auth: {
            user: config.sender_name,
            pass: config.sender_pass
        }
    })

    // {
    //     host: 'smtp.office365.com', // Office 365 server
    //     port: 587,     // secure SMTP
    //     secure: false, // false for TLS - as a boolean not string - but the default is false so just remove this completely
    //     auth: {
    //         user: config.sender_name,
    //         pass: config.sender_pass
    //     },
    //     tls: {
    //         ciphers: 'SSLv3'
    //     }
    // }
);
var mailer_helper = {
    mailer: function (user_data, subj, type) {
        //console.log('a' + config.sender_host)
        //console.log('a' + config.sender_name)
        //console.log('a' + config.sender_pass)
        //console.log(subj.en)
        //console.log(subj.es)
        //console.log('sd' + user_data.pref_lang)

        if (typeof subj == 'object')
            var subject = (user_data.pref_lang == 'en') ? subj.en : subj.es;
        else
            var subject = subj

        //console.log(subject)


        let htmlpart = "";
        if (type == "register")
            htmlpart = register_template.register_template(user_data);

        if (type == "forgotpassword" && user_data.pref_lang == 'en')
            htmlpart = forgetpassword_template.forgetpassword_template(user_data);

        if (type == "forgotpassword" && user_data.pref_lang == 'es')
            htmlpart = forgetpassword_template.forgetpassword_template_es(user_data);

        if (type == 'afteractivation')
            htmlpart = afteractivation_template.afteractivation_template(user_data);


        if (type == 'category-suggestion')
            htmlpart = suggestCategory.suggestcategory_template(user_data);

        if (type == 'share-feedback')
            htmlpart = shareFeedback.sharefeedbcak_template(user_data);

        if (type == 'informmail')
            htmlpart = informmail.informmail_template(user_data);

        if (type == 'informmailtoadmin')
            htmlpart = informmail.informmail_template_to_admin(user_data);

        if (type == 'contactus' && user_data.pref_lang == 'en')
            htmlpart = contactus.contactus_template(user_data);

        if (type == 'contactus' && user_data.pref_lang == 'es')
            htmlpart = contactus.contactus_template_es(user_data);

        if (type == 'claim' && user_data.pref_lang == 'en')
            htmlpart = claimtemp.claim_template(user_data)

        if (type == 'claim' && user_data.pref_lang == 'es')
            htmlpart = claimtemp.claim_template_es(user_data)

        if (type == 'placeorder' && user_data.pref_lang == 'en')
            htmlpart = placeorder.placeorder_template(user_data)

        if (type == 'placeorder' && user_data.pref_lang == 'es')
            htmlpart = placeorder.placeorder_template_es(user_data)

        if (type == 'neworder' && user_data.pref_lang == 'en')
            htmlpart = placeorder.neworder_template(user_data)

        if (type == 'neworder' && user_data.pref_lang == 'es')
            htmlpart = placeorder.neworder_template_es(user_data)

        if (type == 'orderStatusChange')
            htmlpart = placeorder.orderStatusChange(user_data)

        if (type == 'makeReservation')
            htmlpart = reservation.makeReservation_template(user_data)

        if (type == 'newReservation')
            htmlpart = reservation.newReservation_template(user_data)

        if (type == 'newdriver' && user_data.pref_lang == 'en')
            htmlpart = RegistrationReq_temp.Driver_reg(user_data)

        if (type == 'newdriver' && user_data.pref_lang == 'es')
            htmlpart = RegistrationReq_temp.Driver_reg_es(user_data)

        if (type == 'newResReq' && user_data.pref_lang == 'en')
            htmlpart = RegistrationReq_temp.Restaurant_Reg(user_data)

        if (type == 'newResReq' && user_data.pref_lang == 'es')
            htmlpart = RegistrationReq_temp.Restaurant_Reg_es(user_data)

        //console.log(user_data);
        var mail = {
            from: fromEmailAddress,
            to: user_data.email,
            subject: subject,
            text: "",
            html: htmlpart
        };
        transport.sendMail(mail, function (error, response) {
            if (error) {
                //console.log(user_data.email);
                //console.log(error);

            } else {
                //console.log(user_data.email)
                //console.log("Message sent: now" + response);
            }
            //transport.close();
            return true;
        });
    },
    asyncmailer: async function (user_data, subject, type) {
        return new Promise(async (resolve, reject) => {
            let htmlpart = "";
            if (type == 'informmail') {
                let htmlpart = informmail.informmail_template(user_data);
            }
            //console.log(user_data);
            var mail = {
                from: fromEmailAddress,
                to: user_data.email,
                subject: subject,
                text: "",
                html: htmlpart
            };
            await transport.sendMail(mail, function (error, response) {
                if (error) {
                    //console.log(user_data.email);
                    //console.log(error);
                } else {
                    //console.log("Message sent: " + response);
                }
                resolve();
                return;
            });

        });
    }
};

module.exports = mailer_helper;
