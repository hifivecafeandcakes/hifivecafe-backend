import Razorpay from 'razorpay'
import dotenv from 'dotenv'
import logger from './logger.js';
dotenv.config()


const razorpay = new Razorpay({
    // key_id: process.env.RAZORPAY_KEY_ID,
    // key_secret: process.env.RAZORPAY_KEY_SECRET,

    key_id: "rzp_live_lKsHAKbB6toKJk",
    key_secret: "CMHrDCdRoakvBrcndd4gd9NU",
});



//RazorPay Create Order
export async function createOrder(option) {

    const options = {
        amount: option.amount * 100, // amount in paise
        currency: 'INR',
        receipt: option.receipt
    };

    try {
        const order = await razorpay.orders.create(options, (err, orderres));
        console.log('order:', orderres);
        logger.success(`Start RazorPay1:`);
        logger.success(`order: ${JSON.stringify(order)}`);
        logger.success(`End RazorPay:`);
        if (err) {
            console.log('Error:', err);
            logger.error(`Error Message1: err`);
            logger.error(`Error Message2: ${JSON.stringify(err)}`);
        } else {
            logger.success(`Order Created: ${JSON.stringify(order)}`);
        }


        return { success: true, order: order };
    } catch (error) {

        logger.error(`Start RazorPay:`);
        logger.error(`Error Message: ${JSON.stringify(error)}`);
        logger.error(`options: ${JSON.stringify(options)}`);

        let stackLines = error.stack?.split('\n') || [];
        let errorLine = stackLines[1]?.trim();
        if (errorLine) {
            logger.error(`Error occurred at: ${errorLine}`);
        }
        logger.error(`End RazorPay: `);
        console.error('Error creating order:', error);
        return { success: false, order: {} };
    }
}

//RazorPay payment details using pay_id
export async function fetchPaymentDetails(paymentId) {
    try {
        const paymentDetails = await razorpay.payments.fetch(paymentId);
        console.log(paymentDetails);
        logger.success(`Start RazorPay fetchPaymentDetails:`);
        logger.success(`paymentDetails: ${JSON.stringify(paymentDetails)}`);
        logger.success(`End RazorPay fetchPaymentDetails:`);
        return paymentDetails;
    } catch (error) {
        logger.error(`Start RazorPay fetchPaymentDetails:`);
        logger.error(`Error Message: ${error.message}`);
        logger.error(`paymentId: ${paymentId}`);

        let stackLines = error.stack?.split('\n') || [];
        let errorLine = stackLines[1]?.trim();
        if (errorLine) {
            logger.error(`Error occurred at: ${errorLine}`);
        }
        logger.error(`End RazorPay fetchPaymentDetails: `);
        console.error('Error fetching payment details:', error);
        return error;
    }
}