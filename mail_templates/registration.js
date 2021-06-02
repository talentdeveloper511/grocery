var mail_header = require('./mail_header');
var mail_footer = require('./mail_footer');

exports.register_template = function (user_data) {
    let html = '';
    return html += `${mail_header.mailheader()}
    <tr>
    <td valign="top" align="center">
                                
                                <table id="template_body" width="600" cellspacing="0" cellpadding="0" border="0"><tbody><tr>
    <td id="body_content" style="background-color: #ffffff" valign="top">
                                            
                                            <table width="100%" cellspacing="0" cellpadding="20" border="0"><tbody><tr>
    <td style="padding: 48px 48px 0" valign="top">
                                                        <div id="body_content_inner" style="color: #636363 ; font-family: &quot;helvetica neue&quot; , &quot;helvetica&quot; , &quot;roboto&quot; , &quot;arial&quot; , sans-serif ; font-size: 14px ; line-height: 150% ; text-align: left">
    
    <p style="margin: 0 0 16px">Hello ${user_data.name} </p>
    
    
    <p style="margin: 0 0 16px">Thank you for registering with Migente, we welcome you! <br>Now that you have found us, you will be able to discover everything that our application offers you! <br>
    Please go to below link to activate your account and take a moment to complete your profile.
    <br><br>
    <a href="${CONFIG.app.appUrl}/front/activeuser?email=${user_data.email}&token=${user_data.token}" style="color: #226388 ; font-weight: normal ; text-decoration: underline" target="_other" rel="nofollow">Click here </a></p>
    <br>
    <p>Thanks</p>
    
                                                        </div>
                                                    </td>
                                                </tr></tbody></table>
    
    </td>
                                    </tr></tbody></table>
    
    </td>
                        </tr>
    ${mail_footer.mailfooter()}`;
}