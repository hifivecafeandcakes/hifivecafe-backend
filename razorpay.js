import Razorpay from 'razorpay'
import dotenv from 'dotenv'
import logger from './logger.js';
dotenv.config()


const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});



//RazorPay Create Order
export async function createOrder(option) {
    try {

        const options = {
            amount: option.amount * 100, // amount in paise
            currency: 'INR',
            receipt: option.receipt
        };

        try {
            const order = await razorpay.orders.create(options);
            console.log('order:', order);
            logger.success(`Start RazorPay1:`);
            logger.success(`order: ${JSON.stringify(order)}`);
            logger.success(`End RazorPay:`);
            return { success: true, order: order };
        } catch (error) {

        //     updateParams = [razorpay_payment_status, razorpay_error_code, razorpay_error_description, razorpay_error_source, razorpay_error_step,
        //         razorpay_error_reason, razorpay_error_order_id, razorpay_error_payment_id, bookingStatus, formatedate, formatedate];
        //     updateSQL = `UPDATE reservation_booking SET razorpay_payment_status=?,razorpay_error_code=?, razorpay_error_description=?, razorpay_error_source=?, razorpay_error_step=?,
        // razorpay_error_reason=?, razorpay_error_order_id=?, razorpay_error_payment_id=?, booking_status=?, razorpay_payment_at=?, updated_at=? WHERE razorpay_order_id=${razorpay_order_id} AND booking_id=${booking_id}`;

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
    catch (error) {
        logger.error(`Error Message-catch: ${JSON.stringify(error)}`);
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