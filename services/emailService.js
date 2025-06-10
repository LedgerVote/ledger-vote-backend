const nodemailer = require("nodemailer");

// Email configuration
const createTransporter = () => {
  // Configure based on your email provider
  return nodemailer.createTransporter({
    // For Gmail
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },

    // For other SMTP providers, use:
    // host: process.env.SMTP_HOST,
    // port: process.env.SMTP_PORT,
    // secure: false,
    // auth: {
    //   user: process.env.SMTP_USER,
    //   pass: process.env.SMTP_PASSWORD
    // }
  });
};

// Send registration email to voter
const sendRegistrationEmail = async (
  email,
  firstName,
  lastName,
  registrationToken
) => {
  try {
    const transporter = createTransporter();

    const registrationUrl = `${process.env.FRONTEND_URL}/voter/register/${registrationToken}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: "Complete Your Voter Registration",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Complete Your Voter Registration</h2>
          
          <p>Hello ${firstName} ${lastName},</p>
          
          <p>You have been added as a voter for our voting system. To participate in voting sessions, you need to complete your registration by setting up your password and connecting your wallet.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${registrationUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Complete Registration
            </a>
          </div>
          
          <p><strong>What you'll need:</strong></p>
          <ul>
            <li>Create a secure password</li>
            <li>Connect your MetaMask wallet (required for voting)</li>
          </ul>
          
          <p style="color: #666; font-size: 14px;">
            If you didn't expect this email or have questions, please contact the administrator.
          </p>
          
          <p style="color: #666; font-size: 14px;">
            This registration link will expire in 7 days.
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${registrationUrl}">${registrationUrl}</a>
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error("Failed to send registration email:", error);
    return { success: false, error: error.message };
  }
};

// Send password reset email (for future use)
const sendPasswordResetEmail = async (email, firstName, resetToken) => {
  try {
    const transporter = createTransporter();

    const resetUrl = `${process.env.FRONTEND_URL}/voter/reset-password/${resetToken}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: "Reset Your Password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Reset Your Password</h2>
          
          <p>Hello ${firstName},</p>
          
          <p>You requested to reset your password. Click the button below to set a new password:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            If you didn't request this, please ignore this email. Your password will remain unchanged.
          </p>
          
          <p style="color: #666; font-size: 14px;">
            This reset link will expire in 1 hour.
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${resetUrl}">${resetUrl}</a>
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendRegistrationEmail,
  sendPasswordResetEmail,
};
