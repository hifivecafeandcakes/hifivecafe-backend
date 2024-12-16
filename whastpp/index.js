import dotenv from 'dotenv'
dotenv.config()

import axios from 'axios';

// Replace with your access token and WhatsApp Business Phone Number ID
const accessToken = process.env.FB_ACCESS_TOKEN;
const phoneNumberId = process.env.FB_PHONE_NO_ID; // You can find this in your WhatsApp Business API setup
const recipientPhoneNumber = process.env.FB_RECIPIENT_PHONE_NO; // Recipient's phone number in international format (without '+')

const message = 'Hello, this is a message from WhatsApp Business API!';

export function sendMessage(number) {
    return new Promise((resolve, reject) => {
        console.log(number);
        // Define the API endpoint
        const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

        // Construct the payload for the message
        const data = {
            messaging_product: 'whatsapp',
            // to: number, 
            to: '9629188839', 
            type: 'text',
            // template: {
            //     name: hello_world,
            //     language: {code: 'en_US'}
            // },
            text: {
                body: 'Hello from WhatsApp API!'
            }
        };

        
        // Send the message via HTTP POST request using axios
        axios.post(url, data, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        })
            .then(response => {
                // Resolve the promise with the response when the message is sent successfully
                console.log('Message sent:', response.data);
                resolve(response.data);  // Resolve with response data
            })
            .catch(error => {
                // Reject the promise if there's an error
                console.log('Error sending message:');
                console.log(error.response ? error.response.data : error.message);
                reject(error);  // Reject with the error
            });
    });
}


