import Razorpay from 'razorpay'
import dotenv from 'dotenv'
dotenv.config()


const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});



//RazorPay Create Order
export async function createOrder(option) {

    const options = {
        amount: option.amount * 100, // amount in paise
        currency: 'INR',
        receipt: option.receipt
    };

    try {
        const order = await razorpay.orders.create(options);
        console.log('order:', order);
        return { success: true, order: order };
    } catch (error) {
        console.error('Error creating order:', error);
        return { success: false, order: {} };
    }
}

//RazorPay payment details using pay_id
export async function fetchPaymentDetails(paymentId) {
    try {
        const paymentDetails = await razorpay.payments.fetch(paymentId);
        console.log(paymentDetails);
        return paymentDetails;
    } catch (error) {
        console.error('Error fetching payment details:', error);
        return error;
    }
}