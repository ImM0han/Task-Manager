const nodemailer = require('nodemailer');

// Check if email is configured
const isEmailConfigured = () => {
    return process.env.EMAIL_USER && 
           process.env.EMAIL_PASS && 
           process.env.EMAIL_USER !== 'your_email@gmail.com';
};

let transporter = null;

if (isEmailConfigured()) {
    transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
    console.log('✅ Email service configured');
} else {
    console.log('⚠️  Email service not configured. Password reset emails will be disabled.');
}

const sendResetPasswordEmail = async (email, resetToken) => {
    // If email not configured, log the reset link to console (for development)
    if (!isEmailConfigured()) {
        const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password.html?token=${resetToken}`;
        console.log('\n📧 === PASSWORD RESET LINK ===');
        console.log(`To: ${email}`);
        console.log(`Reset URL: ${resetUrl}`);
        console.log('=============================\n');
        return true; // Return true so the user sees success message
    }
    
    const resetUrl = `${process.env.CLIENT_URL}/reset-password.html?token=${resetToken}`;
    
    const mailOptions = {
        from: `"Task Manager Pro" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Password Reset Request',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #6366f1;">Password Reset</h2>
                <p>You requested a password reset for your Task Manager Pro account.</p>
                <p>Click the button below to reset your password:</p>
                <a href="${resetUrl}" 
                   style="display: inline-block; background: #6366f1; color: white; 
                          padding: 12px 24px; text-decoration: none; border-radius: 6px;
                          margin: 16px 0;">
                    Reset Password
                </a>
                <p>Or copy and paste this link:</p>
                <p style="word-break: break-all; color: #64748b;">${resetUrl}</p>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
                <p style="color: #94a3b8; font-size: 12px;">
                    Task Manager Pro - Organize your work, simplify your life
                </p>
            </div>
        `
    };
    
    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Email send error:', error);
        return false;
    }
};

module.exports = {
    sendResetPasswordEmail,
    isEmailConfigured
};
