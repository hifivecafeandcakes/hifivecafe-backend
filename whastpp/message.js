
export function bookingMessage(cus, booking, cafe) {

    let message = `Hello ${cus.user_name},
Thank you for your request ${booking.booking_id} to book a table at ${cafe.cafeName}. Your ${booking.sub_title} booking is confirmed for ${booking.date} at ${booking.time_slot} for ${booking.total_people} people.

We look forward to hosting you! If you have any special requests or need to make changes, feel free to reply to this message or call us at ${cafe.cafeNumber}.

Warm regards,
${cafe.cafeName}`;

    return message;
}

