
import dotenv from 'dotenv'

dotenv.config()

export function bookingMessage(cus, booking, cafe) {
    return new Promise(async (resolve, reject) => {
        try {
            let message = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="text-align: center; padding: 20px; background-color: #f7f7f7;">
                    <img src="https://hifivecafe.in/logo.png" alt="Cafe Logo" style="width: 150px; margin-bottom: 20px;">
                </div>
            <div style="padding: 10px; background-color: #ffffff; border: 1px solid #ddd; border-radius: 5px;">
            <h1 style="color:rgb(255, 34, 34);">Hello ${cus.user_name}</h1>,

            <p>Thank you for your request to book <b>${booking.sub_title}</b>. 
            Your <b>${booking.booking_id}</b> booking is confirmed for <b>${booking.date}</b> at <b>Slot-${booking.time_slot}</b> for <b>${booking.total_people}</b> people. </p>

            <p>We look forward to hosting you! If you have any special requests or need to make changes, 
            feel free to reply to this mail or for 
            whatsapp <img src="https://hifivecafe.in/whatsapp.jpg" alt="whatsapp Logo" style="width: 10px; height:10px;"><b>${process.env.CAFE_WHATSAPP_NUMBER}</b></P>

            <p>For Phone Call: <i>${process.env.CAFE_NUMBER}</i></p>

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
            </div>`;

            resolve(message);
        }
        catch (err) {
            console.error('Error during message:', err.message || err);
            logger.error(`Route: sendMalling, Email: ${toEmail}, Error: ${err.message}`)
            resolve("");
        }
    });
}

