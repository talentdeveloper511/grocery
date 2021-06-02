var mail_header = require('./mail_header');
var mail_footer = require('./mail_footer');

exports.sharefeedbcak_template = function (user_data) {
    let html = '';
    return html += `${mail_header.mailheader()}
    <tr>
    <td valign="top" align="center">
                                
                                <table id="template_body" width="600" cellspacing="0" cellpadding="0" border="0"><tbody><tr>
    <td id="body_content" style="background-color: #ffffff" valign="top">
                                            
                                            <table width="100%" cellspacing="0" cellpadding="20" border="0"><tbody><tr>
    <td style="padding: 48px 48px 0" valign="top">
                                                        <div id="body_content_inner" style="color: #636363 ; font-family: &quot;helvetica neue&quot; , &quot;helvetica&quot; , &quot;roboto&quot; , &quot;arial&quot; , sans-serif ; font-size: 14px ; line-height: 150% ; text-align: left">
    
    <p style="margin: 0 0 16px">Hello ${user_data.adminname}</p>
    
    
    <p style="margin: 0 0 16px">${user_data.username} share feedback about app  <br>  <br> ${user_data.feedback}
    <br>
    <p style="margin: 0 0 16px">
    <a href="${CONFIG.app.appUrl}/admin/login" style="color: #226388 ; font-weight: normal ; text-decoration: underline" target="_other" rel="nofollow">For more detail login here </a></p>
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