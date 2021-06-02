var mail_header = require('./mail_header');
var mail_footer = require('./mail_footer');

exports.forgetpassword_template = function (user_data) {
    let html = '';
    return html += `${mail_header.mailheader('Forget Password link')}
    <tr>
    <td valign="top" align="center">
                                
                                <table id="template_body" width="600" cellspacing="0" cellpadding="0" border="0"><tbody><tr>
    <td id="body_content" style="background-color: #ffffff" valign="top">
                                            
                                            <table width="100%" cellspacing="0" cellpadding="20" border="0"><tbody><tr>
    <td style="padding: 48px 48px 0" valign="top">
                                                        <div id="body_content_inner" style="color: #636363 ; font-family: &quot;helvetica neue&quot; , &quot;helvetica&quot; , &quot;roboto&quot; , &quot;arial&quot; , sans-serif ; font-size: 14px ; line-height: 150% ; text-align: left">
    
    <p style="margin: 0 0 16px">Hello </p>
    
    
    <p style="margin: 0 0 16px"> Forgot password? </p><br>
    <p style="margin: 0 0 16px"> We can help you reset your password and security information.</p><br>
    <p style="margin: 0 0 16px"><br><br> <a href="${CONFIG.app.appUrl}/front/resetpassword?token=${user_data.reset_token}&email=${user_data.email}" style="color: #226388 ; font-weight: normal ; text-decoration: underline" target="_other" rel="nofollow">Click here to reset password</a></p>
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

exports.forgetpassword_template_es = function (user_data) {
    let html = '';
    return html += `${mail_header.mailheader('Forget Password link')}
    <tr>
    <td valign="top" align="center">
                                
                                <table id="template_body" width="600" cellspacing="0" cellpadding="0" border="0"><tbody><tr>
    <td id="body_content" style="background-color: #ffffff" valign="top">
                                            
                                            <table width="100%" cellspacing="0" cellpadding="20" border="0"><tbody><tr>
    <td style="padding: 48px 48px 0" valign="top">
                                                        <div id="body_content_inner" style="color: #636363 ; font-family: &quot;helvetica neue&quot; , &quot;helvetica&quot; , &quot;roboto&quot; , &quot;arial&quot; , sans-serif ; font-size: 14px ; line-height: 150% ; text-align: left">
    
    <p style="margin: 0 0 16px">Hola </p>
    
    
    <p style="margin: 0 0 16px">¿Olvidaste la contraseña?</p><br>
    <p style="margin: 0 0 16px">Podemos ayudarte a restablecer tu contraseña y la información de seguridad.<br><br> <a href="${CONFIG.app.appUrl}/front/resetpassword?token=${user_data.reset_token}&email=${user_data.email}" style="color: #226388 ; font-weight: normal ; text-decoration: underline" target="_other" rel="nofollow">Haga clic aquí para restablecer la contraseña.</a></p>
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