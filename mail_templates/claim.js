var mail_header = require('./mail_header');
var mail_footer = require('./mail_footer');

exports.claim_template = function (user_data) {
    let html = '';
    return html += `${mail_header.mailheader()}
    <tr>
    <td valign="top" align="center">
                                
                                <table id="template_body" width="600" cellspacing="0" cellpadding="0" border="0"><tbody><tr>
    <td id="body_content" style="background-color: #ffffff" valign="top">
                                            
                                            <table width="100%" cellspacing="0" cellpadding="20" border="0"><tbody><tr>
    <td style="padding: 48px 48px 0" valign="top">
                                                        <div id="body_content_inner" style="color: #636363 ; font-family: &quot;helvetica neue&quot; , &quot;helvetica&quot; , &quot;roboto&quot; , &quot;arial&quot; , sans-serif ; font-size: 14px ; line-height: 150% ; text-align: left">
    
    <p style="margin: 0 0 16px">Hello </p>
    
    
    <p style="margin: 0 0 16px">A user with email ${user_data.useremail} has claimed following restaurant <br><br> <a href="${CONFIG.app.appUrl}/restaurant/${user_data.res_id}" style="color: #226388 ; font-weight: normal ; text-decoration: underline" target="_other" rel="nofollow">Restaurant</a></p>
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

exports.claim_template_es = function (user_data) {
    let html = '';
    return html += `${mail_header.mailheader()}
    <tr>
    <td valign="top" align="center">
                                
                                <table id="template_body" width="600" cellspacing="0" cellpadding="0" border="0"><tbody><tr>
    <td id="body_content" style="background-color: #ffffff" valign="top">
                                            
                                            <table width="100%" cellspacing="0" cellpadding="20" border="0"><tbody><tr>
    <td style="padding: 48px 48px 0" valign="top">
                                                        <div id="body_content_inner" style="color: #636363 ; font-family: &quot;helvetica neue&quot; , &quot;helvetica&quot; , &quot;roboto&quot; , &quot;arial&quot; , sans-serif ; font-size: 14px ; line-height: 150% ; text-align: left">
    
    <p style="margin: 0 0 16px">Hola </p>
    
    
    <p style="margin: 0 0 16px">Un usuario con correo electrónico ${user_data.useremail} ha reclamado el siguiente restaurante <br><br> <a href="${CONFIG.app.appUrl}/restaurant/${user_data.res_id}" style="color: #226388 ; font-weight: normal ; text-decoration: underline" target="_other" rel="nofollow">Restaurante</a></p>
    <br><br>
    <p>Gracias</p>
    
                                                        </div>
                                                    </td>
                                                </tr></tbody></table>
    
    </td>
                                    </tr></tbody></table>
    
    </td>
                        </tr>
    ${mail_footer.mailfooter()}`;
}