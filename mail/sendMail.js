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


export const sendEmail = async (toEmail, htmlMessage = null, subject = null) => {

    return new Promise(async (resolve, reject) => {
        try {

            if (htmlMessage != "" && htmlMessage != null ) {

                htmlMessage = (htmlMessage != null) ? htmlMessage : htmlMessage;
                subject = (subject != null) ? subject : subject;

                const mailOptions = {
                    from: `${process.env.CAFE_NAME} ${process.env.EMAIL_USER}`, // Sender address
                    to: toEmail, // Recipient's email
                    subject: subject, // Email subject
                    html: htmlMessage, // Email content
                };

                const info = await transporter.sendMail(mailOptions);
                logger.success(`Route: ${subject}, Email sent to: ${toEmail}, ID: ${info.messageId}`);
                resolve('success');
            }
            else {
                logger.error(`Route: ${subject}, Email send failed to: ${toEmail}, Message: Message Empty`);
                resolve('error');
            }
        }
        catch (err) {
            console.error('Error during message:', err.message || err);
            logger.error(`Route: ${subject}, Email: ${toEmail}, Error: ${err.message}`)
            resolve('error');
        }
    });
};

