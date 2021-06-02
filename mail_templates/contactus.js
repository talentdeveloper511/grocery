var mail_header = require('./mail_header');
var mail_footer = require('./mail_footer');

exports.contactus_template = function (user_data) {
    let html = '';
    return html += `${mail_header.mailheader()}
    <tr>
    <td valign="top" align="center">
                                
                                <table id="template_body" width="600" cellspacing="0" cellpadding="0" border="0"><tbody><tr>
    <td id="body_content" style="background-color: #ffffff" valign="top">
                                            
                                            <table width="100%" cellspacing="0" cellpadding="20" border="0"><tbody><tr>
    <td style="padding: 48px 48px 0" valign="top">
                                                        <div id="body_content_inner" style="color: #636363 ; font-family: &quot;helvetica neue&quot; , &quot;helvetica&quot; , &quot;roboto&quot; , &quot;arial&quot; , sans-serif ; font-size: 14px ; line-height: 150% ; text-align: left">
    
    <p style="margin: 0 0 16px">Hello</p>
    <br>
    <p style="margin: 0 0 16px">Migente, the delight in your hands ...</p>
    <br>
    <p><b>firstname:</b> ${user_data.firstname}</p>

    <p><b>lastname:</b> ${user_data.lastname}</p>

    <p><b>email:</b> ${user_data.email}</p>
  
    <p><b>message:</b> ${user_data.message}</p>
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

exports.contactus_template_es = function (user_data) {
    let html = '';
    return html += `${mail_header.mailheader()}
    <tr>
    <td valign="top" align="center">
                                
                                <table id="template_body" width="600" cellspacing="0" cellpadding="0" border="0"><tbody><tr>
    <td id="body_content" style="background-color: #ffffff" valign="top">
                                            
                                            <table width="100%" cellspacing="0" cellpadding="20" border="0"><tbody><tr>
    <td style="padding: 48px 48px 0" valign="top">
                                                        <div id="body_content_inner" style="color: #636363 ; font-family: &quot;helvetica neue&quot; , &quot;helvetica&quot; , &quot;roboto&quot; , &quot;arial&quot; , sans-serif ; font-size: 14px ; line-height: 150% ; text-align: left">
    
    <p style="margin: 0 0 16px">Hola</p>
    <br>
    <p style="margin: 0 0 16px">Migente, el deleite en tus manos…</p>
    <br>
    <p><b>nombre de pila:</b> ${user_data.firstname}</p>

    <p><b>apellido:</b> ${user_data.lastname}</p>

    <p><b>correo electrónico:</b> ${user_data.email}</p>
  
    <p><b>mensaje:</b> ${user_data.message}</p>
    <br>
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