export const resendPaymentTemplate = (email, checkoutUrl, timeLeft) => {
    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Resend Payment Link - Aamana Classroom</title>
      </head>
      <body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color:#f9f9f9;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding:20px;">
              <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 6px rgba(0,0,0,0.1);">
                
                <!-- Header -->
                <tr>
                  <td align="center" style="background:#1998e1; padding:20px;">
                    <h1 style="color:#fff; margin:0; font-size:24px;">Aamana Classroom</h1>
                  </td>
                </tr>
                
                <!-- Body -->
                <tr>
                  <td style="padding:30px; color:#333;">
                    <h2 style="margin-top:0;">Your Payment Link</h2>
                    <p>Hello,</p>
                    <p>We noticed your account is still pending activation.</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Time left before expiration:</strong> ${timeLeft}</p>
  
                    <p style="text-align:center; margin:30px 0;">
                      <a href="${checkoutUrl}" style="background:#1998e1; color:#fff; text-decoration:none; padding:12px 24px; border-radius:8px; font-weight:bold; display:inline-block;">
                        🔗 Complete Payment
                      </a>
                    </p>
  
                    <p>If you already completed the payment, please ignore this email.</p>
                  </td>
                </tr>
  
                <!-- Footer -->
                <tr>
                  <td align="center" style="background:#f3f3f3; padding:15px; font-size:12px; color:#555;">
                    &copy; ${new Date().getFullYear()} Aamana Classroom. All rights reserved.
                  </td>
                </tr>
  
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
    `;
  };
  