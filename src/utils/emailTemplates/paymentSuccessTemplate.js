export const paymentSuccessTemplate = (user) => {
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>Account Activated - Aamana Classroom</title>
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
                  <h2 style="margin-top:0;">🎉 Account Activated!</h2>
                  <p>Hello <strong>${user.name}</strong>,</p>
                  <p>Your account has been successfully <strong>activated</strong>. You can now enjoy all the features of Aamana Classroom.</p>

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
                    <tr>
                      <td style="padding:10px; border:1px solid #ddd;"><strong>Plan</strong></td>
                      <td style="padding:10px; border:1px solid #ddd;">${user.plan?.name || "N/A"}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; border:1px solid #ddd;"><strong>Status</strong></td>
                      <td style="padding:10px; border:1px solid #ddd; color:green; font-weight:bold;">${user.status}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; border:1px solid #ddd;"><strong>Joined</strong></td>
                      <td style="padding:10px; border:1px solid #ddd;">${new Date(user.createdAt).toLocaleString()}</td>
                    </tr>
                  </table>

                  <p style="text-align:center; margin:30px 0;">
                    <a href="https://aamana-classroom.com/login" style="background:#1998e1; color:#fff; text-decoration:none; padding:12px 24px; border-radius:8px; font-weight:bold; display:inline-block;">
                      🚀 Go to Dashboard
                    </a>
                  </p>

                  <p>If you need any help, feel free to reply to this email.</p>
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
