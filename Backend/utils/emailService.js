import * as brevo from '@getbrevo/brevo';

const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  String(process.env.BREVO_API_KEY)
);

export const sendOTPEmail = async (email, otp, userName) => {
  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    console.log("BREVO KEY:", process.env.BREVO_API_KEY);

    sendSmtpEmail.subject = 'Password Reset OTP - User Management';
    sendSmtpEmail.to = [{ email: email, name: userName }];
    sendSmtpEmail.sender = {
      name: process.env.BREVO_SENDER_NAME,
      email: process.env.BREVO_SENDER_EMAIL
    };
    sendSmtpEmail.htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p>Hello ${userName},</p>
            <p>You requested to reset your password. Use the OTP below to reset your password:</p>
            <div style="background-color: #f0f0f0; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; border-radius: 5px;">
              ${otp}
            </div>
            <p style="color: #666;">This OTP is valid for 10 minutes.</p>
            <p style="color: #666;">If you didn't request this, please ignore this email.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px;">User Management System</p>
          </div>
        </body>
      </html>
    `;

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    return { success: true };
  } catch (error) {
    console.error('Email sending failed:', error);
    throw new Error('Failed to send OTP email');
  }
};