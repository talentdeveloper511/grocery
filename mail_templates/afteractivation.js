var mail_header = require('./mail_header');
var mail_footer = require('./mail_footer');

exports.afteractivation_template = function (user_data) {
    let html = '';
    return html += `${mail_header.mailheader('Inform mail by admin')}
    <tr>
    <td valign="top" align="center">
                                
                                <table id="template_body" width="600" cellspacing="0" cellpadding="0" border="0"><tbody><tr>
    <td id="body_content" style="background-color: #ffffff" valign="top">
                                            
                                            <table width="100%" cellspacing="0" cellpadding="20" border="0"><tbody><tr>
    <td style="padding: 48px 48px 0" valign="top">
                                                        <div id="body_content_inner" style="color: #636363 ; font-family: &quot;helvetica neue&quot; , &quot;helvetica&quot; , &quot;roboto&quot; , &quot;arial&quot; , sans-serif ; font-size: 14px ; line-height: 150% ; text-align: left">
    
    <p style="margin: 0 0 16px">Hello </p>
    
    
    <p style="margin: 0 0 16px">Welcome to Migente, the application that will make your life easier. Through this app you can make: orders at your favorite food places, reservations, you will have discounts and much more. We appreciate your presence here.
</p>
    <br><br>
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