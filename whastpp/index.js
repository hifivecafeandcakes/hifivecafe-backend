import dotenv from 'dotenv'
dotenv.config()

import axios from 'axios';

import { bookingMessage } from '../mail/message.js';
import { executeQuery } from '../dbHelper.js';
import logger from '../logger.js';
import { sendRegistrationEmail } from '../mail/sendMail.js';

// Replace with your access token and WhatsApp Business Phone Number ID
const accessToken = process.env.FB_ACCESS_TOKEN;
const phoneNumberId = process.env.FB_PHONE_NO_ID; // You can find this in your WhatsApp Business API setup
const recipientPhoneNumber = process.env.FB_RECIPIENT_PHONE_NO; // Recipient's phone number in international format (without '+')

const cafeNumber = process.env.CAFE_NUMBER;
const cafeName = process.env.CAFE_NAME;

let cafeData = { cafeNumber: cafeNumber, cafeName: cafeName }

let message = '';

export function sendMessage(cus, booking, msgType) {
    return new Promise(async (resolve, reject) => {
        try {
            console.log(cus.user_mobile);
            console.log(cus);
            console.log(booking);
            console.log(cafeData);
            // Define the API endpoint
            let sms_message = "";
            const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;


            if (msgType == "booking") {
                sms_message = await bookingMessage(cus, booking, cafeData);
                if (sms_message != "") { //Malling
                    await sendRegistrationEmail(cus.user_email, cus.user_email, sms_message);
                }
            }

            logger.info(`Route: sendMessage, booking Parameters: ${JSON.stringify(booking)}`);
            logger.info(`Route: sendMessage, customer Parameters: ${JSON.stringify(cus)}`);

            let parameters = [
                { type: "text", text: booking.sub_title },   // Replace {{1}} with the customer name
                { type: "text", text: booking.booking_id },     // Replace {{2}} with the booking ID
                { type: "text", text: booking.date.toString() },   // Replace {{3}} with the cafe name
                { type: "text", text: booking.time_slot.toString() },          // Replace {{4}} with the number of people
                { type: "text", text: booking.total_people.toString() },     // Replace {{5}} with the time
                { type: "text", text: cafeData.cafeNumber.toString() },     // Replace {{6}} with the time
                { type: "text", text: cafeData.cafeName.toString() }     // Replace {{7}} with the time
            ]

            logger.info(`Route: sendMessage, After Sending Parameters: ${JSON.stringify(parameters)}`);

            // Construct the payload for the message
            const data = {
                messaging_product: 'whatsapp',
                to: cus.user_mobile,
                type: 'template',
                // template: {
                //    name: "hello_world",
                //    language: {code: 'en_US'}
                // }

                template: {
                    name: "booking_confirmation_template", // The name of your approved template
                    language: { code: "en" },  // Language code (e.g., 'en_US')
                    components: [
                        {
                            type: "header",
                            parameters: [
                                { type: "text", text: cus.user_name },   // Replace {{1}} with the customer name
                            ]
                        },
                        {
                            type: "body",
                            parameters: parameters
                        }
                    ]
                }

            };

            // const data = {
            //     messaging_product: 'whatsapp',
            //     to: cus.user_mobile,
            //     type: 'text',
            //     text: { body: message }
            // };




            // Send the message via HTTP POST request using axios
            axios.post(url, data, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            })
                .then(async response => {
                    // Resolve the promise with the response when the message is sent successfully
                    console.log('Message sent:', response.data);
                    await updateMessageEvent(cus, booking, 1, message, response.data.contacts[0].wa_id, null);
                    resolve(response.data);  // Resolve with response data
                })
                .catch(async error => {
                    // Reject the promise if there's an error
                    console.log('Error sending message:');
                    console.log(error.response ? error.response.data : error.message);
                    await updateMessageEvent(cus, booking, 0, message, null, error.message);
                    logger.error(`Route: sendMessage, number: ${cus.user_mobile}, Error: ${error.message}`)
                    resolve(error.message);  // Reject with the error
                });
        }
        catch (err) {
            console.error('Error during message:', err.message || err);
            logger.error(`Route: sendMessage, number: ${cus.user_mobile}, Error: ${err.message}`)
            resolve(err);
        }
    });
}


async function updateMessageEvent(cus, booking, flg, message, success_id = null, error = null) {
    try {
        const currentdate = new Date();
        let data = [booking.booking_id, cus.user_name, cus.user_mobile, message, flg, success_id, error, currentdate];

        const updation = await executeQuery(
            `INSERT INTO messages (booking_id, cus_name, cus_phone, message, sent_flag, success_id, error, created_at) VALUES (?, ?, ?, ?, ?, ?, ?,?)`,
            data, "updateMessageEvent"
        );

        // Optionally handle the result of the query
        if (updation.affectedRows > 0) {
            console.log('Message inserted successfully:', updation);
        } else {
            logger.error(`Route: sendMessage-updateMessageEvent, number: ${cus.user_mobile}, Error: No rows were affected`)
            console.warn('No rows were affected. Please check the query or data.');
        }
    } catch (err) {
        // Handle and log errors
        console.error('Error during message insertion:', err.message || err);
        logger.error(`Route: sendMessage-updateMessageEvent, number: ${cus.user_mobile}, Error: ${err.message}`)
    }

}

