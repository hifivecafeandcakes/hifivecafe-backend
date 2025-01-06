import nodemailer from 'nodemailer';

import dotenv from 'dotenv'
import logger from '../logger.js';

dotenv.config()

// Create a transporter object
const transporter = nodemailer.createTransport({
    service: 'Gmail', // Use your email service provider
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});


export const sendRegistrationEmail = async (toEmail, userName, message = null) => {

    return new Promise(async (resolve, reject) => {
        try {

            let htmlMessage = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="text-align: center; padding: 20px; background-color: #f7f7f7;">
                    <img src="https://hifivecafe.in/logo.png" alt="Cafe Logo" style="width: 150px; margin-bottom: 20px;">
                </div>
            <div style="padding: 20px; background-color: #ffffff; border: 1px solid #ddd; border-radius: 5px;">
            <h1 style="color:rgb(255, 34, 34);">Welcome to ${process.env.CAFE_NAME}!</h1>
            <p>Thank you for registering with us. We're excited to have you on board.</p>
            <h4>Login Username: <span style="color:rgb(74, 255, 34);">${userName}</span></h4>
            <p style="color: #555;">If you have any questions, feel free to reply to this email or whatsapp <img src="https://hifivecafe.in/whatsapp.jpg" alt="whatsapp Logo" style="width: 10px; height:10px;"> 9500400992.</p>
            <p>Best regards,</p>
            <p style="font-weight: bold; color: #ff5722;">
                ${process.env.CAFE_NAME}<br>
                <a href="tel:${process.env.CAFE_NUMBER}" style="color: #007bff; text-decoration: none;">
                    ${process.env.CAFE_NUMBER}
                </a>
            </p>
                </div>
                <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
                    <p>&copy; ${new Date().getFullYear()} ${process.env.CAFE_NAME}. All Rights Reserved.</p>
                </div>
            </div>`

            htmlMessage = (message != null) ? message : htmlMessage;

            const mailOptions = {
                from: `${process.env.CAFE_NAME} ${process.env.EMAIL_USER}`, // Sender address
                to: toEmail, // Recipient's email
                subject: 'Registration Successful', // Email subject
                html: htmlMessage, // Email content
            };

            const info = await transporter.sendMail(mailOptions);
            logger.success(`Route: sendRegistrationEmail, Email sent to: ${toEmail}, ID: ${info.messageId}`);
            resolve('successs');
        }
        catch (err) {
            console.error('Error during message:', err.message || err);
            logger.error(`Route: sendRegistrationEmail, Email: ${toEmail}, Error: ${err.message}`)
            resolve(err);
        }
    });
};

