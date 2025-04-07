const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail', // Replace with your custom domain or email service
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    }
});

/**
 * Sends a generic email.
 * @param {string} to - Recipient's email address.
 * @param {string} subject - Email subject.
 * @param {string} html - HTML content of the email.
 * @param {string} text - Plain text content of the email.
 */
exports.sendEmail = async (to, subject, html, text) => {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to,
            subject,
            text, // Plain text version
            html  // HTML version
        });
        console.log(`Email sent successfully to ${to}`);
        return true;
    } catch (error) {
        console.error(`Error sending email to ${to}:`, error);
        return false;
    }
};

/**
 * Sends task status update emails to assigned users.
 * @param {Array} assignedUsers - List of assigned users.
 * @param {String} taskName - Name of the task.
 * @param {String} action - Action performed ('approve' or 'reject').
 * @param {String} taskDetailLink - Link to the task details page.
 * @param {String} message - Notification message.
 */
exports.sendTaskStatusEmails = async (assignedUsers, taskName, action, taskDetailLink, message) => {
    for (const assignedUser of assignedUsers) {
        try {
            if (assignedUser.googleEmail) {
                // Determine the header color based on the action
                const headerColor = action === 'reject' ? '#FF0000' : '#4CAF50'; // Red for reject, green for approve
                const headerText = action === 'reject' ? 'งานของคุณถูกปฏิเสธ' : 'งานของคุณได้รับการอนุมัติ';

                const emailHtml = `
                <html>
                    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; color: #333;">
                        <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">
                            <h2 style="text-align: center; color: ${headerColor};">${headerText}</h2>
                            <p style="font-size: 16px;">${message}</p>
                            <p style="font-size: 16px;">คลิกปุ่มด้านล่างเพื่อดูรายละเอียดงาน:</p>
                            <div style="text-align: center;">
                                <a href="${taskDetailLink}" 
                                    style="display: inline-block; background-color: ${headerColor}; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-size: 16px; font-weight: bold; margin-top: 20px;">
                                    ดูรายละเอียดงาน
                                </a>
                            </div>
                            <p style="font-size: 14px; color: #777; text-align: center; margin-top: 30px;">
                                หากคุณไม่ได้ร้องขอสิ่งนี้ โปรดละเว้นอีเมลนี้
                            </p>
                        </div>
                    </body>
                </html>
            `;

                const emailText = `
                ${headerText}
                ========================
                ${message}

                คลิกลิงก์ด้านล่างเพื่อดูรายละเอียดงาน:
                ${taskDetailLink}

                หากคุณไม่ได้ร้องขอสิ่งนี้ โปรดละเว้นอีเมลนี้
            `;

                await exports.sendEmail(assignedUser.googleEmail, `การอัพเดตสถานะของงานชื่อ: "${taskName}"`, emailHtml, emailText);
            }
        } catch (err) {
            console.error(`❌ Failed to send email to ${assignedUser.googleEmail}:`, err.message);
        }
    }
};