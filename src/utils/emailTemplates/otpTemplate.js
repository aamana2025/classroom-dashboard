export const otpTemplate = (user, otp, resetLink) => {
    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Password Reset OTP - Aamana Classroom</title>
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
                    <h2 style="margin-top:0;">🔑 Password Reset Request</h2>
                    <p>Hello <strong>${user.name}</strong>,</p>
                    <p>We received a request to reset your password. Use the OTP below to reset it. This OTP expires in 10 minutes.</p>
  
                    <!-- OTP Code -->
                    <p style="text-align:center; margin:20px 0;">
                      <span style="display:inline-block; background:#f3f3f3; padding:15px 25px; font-size:24px; font-weight:bold; letter-spacing:4px; border-radius:8px;">${otp}</span>
                    </p>
  
                    <p style="text-align:center; margin:20px 0;">
                      Or click the button below to reset your password directly:
                    </p>
  
                    <p style="text-align:center; margin:30px 0;">
                      <a href="${resetLink}" style="background:#1998e1; color:#fff; text-decoration:none; padding:12px 24px; border-radius:8px; font-weight:bold; display:inline-block;">
                        🔄 Reset Password
                      </a>
                    </p>
  
                    <p>If you did not request a password reset, please ignore this email.</p>
  
                    <!-- User Info -->
                    <table style="width:100%; margin:20px 0; border-collapse:collapse;">
                      <tr>
                        <td style="padding:10px; border:1px solid #ddd;"><strong>Name</strong></td>
                        <td style="padding:10px; border:1px solid #ddd;">${user.name}</td>
                      </tr>
                      <tr>
                        <td style="padding:10px; border:1px solid #ddd;"><strong>Email</strong></td>
                        <td style="padding:10px; border:1px solid #ddd;">${user.email}</td>
                      </tr>
                      ${user.phone ? `
                      <tr>
                        <td style="padding:10px; border:1px solid #ddd;"><strong>Phone</strong></td>
                        <td style="padding:10px; border:1px solid #ddd;">${user.phone}</td>
                      </tr>` : ""}
                    </table>
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
  