const nodemailer = require('nodemailer');
const { google } = require('googleapis');

const oAuth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
);

oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

let transporter;

async function getTransporter() {
    if (!transporter) {
        const accessToken = await oAuth2Client.getAccessToken().catch((err) => {
            console.error("Failed to retrieve access token:", err);
            throw new Error("Failed to authenticate email service.");
        });
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: process.env.EMAIL_USER,
                clientId: process.env.CLIENT_ID,
                clientSecret: process.env.CLIENT_SECRET,
                refreshToken: process.env.REFRESH_TOKEN,
                accessToken: accessToken.token,
            },
        });
    }
    return transporter;
}

exports.sendEmail = async ({ to, subject, html, text, from }) => {
    try {
        const transporter = await getTransporter();
        const senderEmail = from || process.env.EMAIL_USER;
        await transporter.sendMail({
            from: senderEmail,
            to,
            subject,
            text,
            html,
        });
        console.info(`Email sent successfully to ${to}`);
    } catch (error) {
        console.error("Error sending email:", error);
    }
};


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

exports.sendTaskApprovalEmail = async (usersToNotify, task, taskDetailLink, message) => {
    for (const user of usersToNotify) {
        try {
            if (user.googleEmail) {
                // Build assigned users list
                const assignedUsersList = task.assignedUsers.map(user => `${user.firstName} ${user.lastName}`).join(', ');

                const getPriorityInThai = (priority) => {
                    switch (priority) {
                        case 'urgent':
                            return 'ด่วน';
                        case 'normal':
                            return 'ปกติ';
                        case 'low':
                            return 'ต่ำ';
                        default:
                            return 'ไม่ระบุ';
                    }
                };

                const formatDateInThai = (date) => {
                    return new Date(date).toLocaleDateString('th-TH');
                };

                // Email HTML template
                const emailHtml = `
                <html>
                <head>
                    <script src="https://kit.fontawesome.com/421504dd7b.js" crossorigin="anonymous"></script>
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@400;500;600;700&display=swap');
                        .header {
                            background-color: #202020;
                            color: white;
                            display: flex;
                            align-items: center;
                            justify-content: start;
                            padding: 20px;
                            border-radius: 10px 10px 0 0;
                            font-weight: 500;
                            font-size: 20px;
                        }
                        .emailWrap {
                            max-width: 600px; 
                            margin: 50px auto;
                            background-color: #ffffff; 
                            border-radius: 8px; 
                            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                        }
                        .contentWrap {
                            padding: 30px;
                            background-color: #ffffff;
                            border-radius: 0 0 8px 8px;
                        }
                        h2 {
                            font-size: 24px;
                            margin-bottom: 20px;
                            font-weight: 500;
                            text-align: center; 
                            color: red;
                            margin-top: 0;
                        }
                        h3 {
                            font-size: 18px;
                            margin-bottom: 5px;
                            font-weight: 400;
                            color: #5C54E5;
                        }
                        ul {
                            margin-bottom: 50px;
                            margin-left: 5px;
                        }
                        li {
                            margin: 8px 0;
                            font-size: 16px;
                        }
                        p {
                            color: gray;
                        }
                        a {
                            background-color: #5C54E5;
                            display: inline-block; 
                            color: #fff; 
                            padding: 12px 20px; 
                            text-decoration: none; 
                            border-radius: 4px; 
                            font-weight: 400; 
                            margin-top: 10px;
                            font-size: 16px;
                        }
                    </style>
                </head>
                <body style="font-family: 'Kanit', sans-serif; background-color: #f4f4f4; padding: 50px 0;">
                    <div class="emailWrap">    
                        <div class="header">Task Hub</div>
                        <div class="contentWrap">
                            <h2>คุณมีงานใหม่ที่รอการอนุมัติ <i class="fa-solid fa-clock-rotate-left" style="margin-left: 10px;"></i></h2>
                            <h3>รายละเอียดงาน:</h3>
                            <ul style="color: #000;">
                                <li><strong>โปรเจกต์:</strong> ${task.project.projectName}</li>
                                <li><strong>ชื่องาน:</strong> ${task.taskName}</li>
                                <li><strong>รายละเอียดงาน:</strong> ${task.taskDetail || 'ไม่มีรายละเอียด'}</li>
                                <li><strong>วันที่ครบกำหนด:</strong> ${task.dueDate ? formatDateInThai(task.dueDate) : 'ไม่มีวันครบกำหนด'}</li>
                                <li><strong>ความสำคัญ:</strong> ${getPriorityInThai(task.taskPriority)}</li>
                                <li><strong>มอบหมายให้:</strong> ${assignedUsersList || 'ไม่มีผู้มอบหมาย'}</li>
                            </ul>
                            <div style="text-align: center;">
                                <p style="font-size: 16px;">คลิกปุ่มด้านล่างเพื่อดูรายละเอียดงาน:</p>
                                <a href="${taskDetailLink}" style="color: #fff;">ดูรายละเอียดงาน</a>
                            </div>
                            <p style="font-size: 14px; color: #777; text-align: center; margin-top: 30px;">
                                หากคุณไม่ได้ร้องขอสิ่งนี้ โปรดละเว้นอีเมลนี้
                            </p>
                        </div>
                    </div>
                </body>
                </html>
                `;

                // Email text template (for plain-text fallback)
                const emailText = `
                คุณมีงานใหม่ที่รอการอนุมัติ
                ========================
                ${message}

                รายละเอียดงาน:
                - โปรเจกต์: ${task.project.projectName}
                - ชื่องาน: ${task.taskName}
                - รายละเอียดงาน: ${task.taskDetail || 'ไม่มีรายละเอียด'}
                - วันที่ครบกำหนด: ${task.dueDate ? formatDateInThai(task.dueDate) : 'ไม่มีวันครบกำหนด'}
                - ความสำคัญ: ${getPriorityInThai(task.taskPriority)}
                - มอบหมายให้: ${assignedUsersList || 'ไม่มีผู้มอบหมาย'}

                คลิกที่ลิงก์เพื่อดูรายละเอียดงาน:
                ${taskDetailLink}
                `;

                // Send email
                await exports.sendEmail(user.googleEmail, `งานใหม่ที่รอการอนุมัติ: ${task.taskName}`, emailHtml, emailText);
            }
        } catch (err) {
            console.error(`❌ Failed to send email to ${user.googleEmail}:`, err.message);
        }
    }
};

exports.sendSpaceMemberAddedEmail = async (user, space, taskDetailLink, message) => {
    try {
        if (user.googleEmail) {
            // Construct the email content
            const formatDateInThai = (date) => {
                return new Date(date).toLocaleDateString('th-TH');
            };

            const emailHtml = `
                <html>
                <head>
                    <script src="https://kit.fontawesome.com/421504dd7b.js" crossorigin="anonymous"></script>
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@400;500;600;700&display=swap');
                        .header {
                            background-color: #202020;
                            color: white;
                            display: flex;
                            align-items: center;
                            justify-content: start;
                            padding: 20px;
                            border-radius: 10px 10px 0 0;
                            font-weight: 500;
                            font-size: 20px;
                        }
                        .emailWrap {
                            max-width: 600px; 
                            margin: 50px auto;
                            background-color: #ffffff; 
                            border-radius: 8px; 
                            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                        }
                        .contentWrap {
                            padding: 30px;
                            background-color: #ffffff;
                            border-radius: 0 0 8px 8px;
                        }
                        h2 {
                            font-size: 24px;
                            margin-bottom: 20px;
                            font-weight: 500;
                            text-align: center; 
                            color: #4CAF50;
                            margin-top: 0;
                        }
                        h3 {
                            font-size: 18px;
                            margin-bottom: 5px;
                            font-weight: 400;
                            color: #5C54E5;
                        }
                        p {
                            font-size: 16px;
                            color: #333;
                        }
                        a {
                            background-color: #5C54E5;
                            display: inline-block; 
                            color: #fff; 
                            padding: 12px 20px; 
                            text-decoration: none; 
                            border-radius: 4px; 
                            font-weight: 400; 
                            margin-top: 10px;
                            font-size: 16px;
                        }
                    </style>
                    </head>
                    <body style="font-family: 'Kanit', sans-serif; background-color: #f4f4f4; padding: 50px 0;">
                        <div class="emailWrap">    
                            <div class="header">Task Hub</div>
                            <div class="contentWrap">
                                <h2>คุณถูกเพิ่มเข้าไปในโปรเจกต์ "${space.projectName}" <i class="fa-solid fa-user-plus" style="margin-left: 10px;"></i></h2>
                                <h3>รายละเอียดโปรเจกต์:</h3>
                                <ul style="color: #000;">
                                    <li><strong>ชื่อโปรเจกต์:</strong> ${space.projectName}</li>
                                    <li><strong>คำอธิบาย:</strong> ${space.description || 'ไม่มีคำอธิบาย'}</li>
                                    <li><strong>วันที่สร้าง:</strong> ${formatDateInThai(space.createdAt)}</li>
                                </ul>
                                <div style="text-align: center;">
                                    <p style="font-size: 16px;">คลิกลิงก์ด้านล่างเพื่อดูรายละเอียดโปรเจกต์:</p>
                                    <a href="${taskDetailLink}" style="color: #fff;">ดูรายละเอียดโปรเจกต์</a>
                                </div>
                                <p style="font-size: 14px; color: #777; text-align: center; margin-top: 30px;">
                                    หากคุณไม่ได้ร้องขอสิ่งนี้ โปรดละเว้นอีเมลนี้
                                </p>
                            </div>
                        </div>
                    </body>
                    </html>
                    `;

            const emailText = `
                คุณถูกเพิ่มเข้าไปในโปรเจกต์ "${space.projectName}"
                ========================
                รายละเอียดพื้นที่:
                - ชื่อโปรเจกต์: ${space.projectName}
                - คำอธิบาย: ${space.description || 'ไม่มีคำอธิบาย'}
                - วันที่สร้าง: ${formatDateInThai(space.createdAt)}

                คลิกลิงก์ด้านล่างเพื่อดูรายละเอียดโปรเจกต์:
                ${taskDetailLink}

                หากคุณไม่ได้ร้องขอสิ่งนี้ โปรดละเว้นอีเมลนี้
                `;

            await exports.sendEmail(user.googleEmail, `คุณถูกเพิ่มเข้าไปในโปรเจกต์: ${space.projectName}`, emailHtml, emailText);
        }
    } catch (err) {
        console.error(`❌ Failed to send email to ${user.googleEmail}:`, err.message);
    }
};

exports.sendTaskAssignment = async (usersToNotify, task, taskDetailLink) => {
    for (const user of usersToNotify) {
        try {
            if (user.googleEmail) {
                // Build assigned users list
                const assignedUsersList = task.assignedUsers.map(user => `${user.firstName} ${user.lastName}`).join(', ');

                const getPriorityInThai = (priority) => {
                    switch (priority) {
                        case 'urgent':
                            return 'ด่วน';
                        case 'normal':
                            return 'ปกติ';
                        case 'low':
                            return 'ต่ำ';
                        default:
                            return 'ไม่ระบุ';
                    }
                };

                const formatDateInThai = (date) => {
                    return new Date(date).toLocaleDateString('th-TH');
                };

                // Email HTML template
                const emailHtml = `
                <html>
                <head>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@400;500;600;700&display=swap');
                        .header {
                            background-color: #202020;
                            color: white;
                            display: flex;
                            align-items: center;
                            justify-content: start;
                            padding: 20px;
                            border-radius: 10px 10px 0 0;
                            font-weight: 500;
                            font-size: 20px;
                        }
                        .emailWrap {
                            max-width: 600px; 
                            margin: 50px auto;
                            background-color: #ffffff; 
                            border-radius: 8px; 
                            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                        }
                        .contentWrap {
                            padding: 30px;
                            background-color: #ffffff;
                            border-radius: 0 0 8px 8px;
                        }
                        h2 {
                            font-size: 24px;
                            margin-bottom: 20px;
                            font-weight: 500;
                            text-align: center; 
                            color: #5C54E5;
                            margin-top: 0;
                        }
                        ul {
                            margin-bottom: 50px;
                            margin-left: 5px;
                        }
                        li {
                            margin: 8px 0;
                            font-size: 16px;
                        }
                        a {
                            background-color: #5C54E5;
                            display: inline-block; 
                            color: #fff; 
                            padding: 12px 20px; 
                            text-decoration: none; 
                            border-radius: 4px; 
                            font-weight: 400; 
                            margin-top: 10px;
                            font-size: 16px;
                        }
                    </style>
                </head>
                <body style="font-family: 'Kanit', sans-serif; background-color: #f4f4f4; padding: 50px 0;">
                    <div class="emailWrap">    
                        <div class="header">Task Hub</div>
                        <div class="contentWrap">
                            <h2>คุณได้รับมอบหมายงานใหม่</h2>
                            <ul>
                                <li><strong>ชื่องาน:</strong> ${task.taskName}</li>
                                <li><strong>รายละเอียดงาน:</strong> ${task.taskDetail || 'ไม่มีรายละเอียด'}</li>
                                <li><strong>วันที่ครบกำหนด:</strong> ${task.dueDate ? formatDateInThai(task.dueDate) : 'ไม่มีวันครบกำหนด'}</li>
                                <li><strong>ความสำคัญ:</strong> ${getPriorityInThai(task.taskPriority)}</li>
                                <li><strong>มอบหมายให้:</strong> ${assignedUsersList || 'ไม่มีผู้มอบหมาย'}</li>
                            </ul>
                            <div style="text-align: center;">
                                <a href="${taskDetailLink}">ดูรายละเอียดงาน</a>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
                `;

                const emailText = `
                คุณได้รับมอบหมายงานใหม่:
                - ชื่องาน: ${task.taskName}
                - รายละเอียดงาน: ${task.taskDetail || 'ไม่มีรายละเอียด'}
                - วันที่ครบกำหนด: ${task.dueDate ? formatDateInThai(task.dueDate) : 'ไม่มีวันครบกำหนด'}
                - ความสำคัญ: ${getPriorityInThai(task.taskPriority)}
                - มอบหมายให้: ${assignedUsersList || 'ไม่มีผู้มอบหมาย'}
                
                ดูรายละเอียดงานได้ที่: ${taskDetailLink}
                `;

                // Send email
                await exports.sendEmail(user.googleEmail, `มอบหมายงานใหม่: ${task.taskName}`, emailHtml, emailText);
            }
        } catch (err) {
            console.error(`❌ Failed to send email to ${user.googleEmail}:`, err.message);
        }
    }
};
