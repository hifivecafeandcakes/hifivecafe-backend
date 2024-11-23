import nodemailer from 'nodemailer';



// =========================================================mail
async function mailbooking(id,) {
    const booking_id = id

    let arrayresponse = [];
    let response;


    try {
        const sql = `SELECT * FROM reservation_booking WHERE booking_status = "W" AND booking_id = ? `;
        const executequerysql = await executeQuery(sql, [booking_id]);

        response = {
            reservation_id: executequerysql[0].reservation_id,
            reservation_catid: executequerysql[0].reservation_catid,
            reservation_sub_catid: executequerysql[0].reservation_sub_catid,
            user_id: executequerysql[0].user_id,
            date: executequerysql[0].date,
            time: executequerysql[0].time,
            menu_type: executequerysql[0].menu_type,
            reservation_type: executequerysql[0].reservation_type === "TA" ? "Table Booking" : executequerysql[0].reservation_type === "CL" ? "Candle Light Dinner" : "",
        };

        const sql2 = `SELECT cat_title, price_range FROM reservation_category WHERE cat_id = ? `;
        const executequerysql2 = await executeQuery(sql2, [response.reservation_catid]);
        if (executequerysql2.length > 0) {
            Object.assign(response, executequerysql2[0]);
        }

        const sql3 = ` SELECT sub_tilte, sub_cat_price_range FROM reservation_sub_category WHERE reser_sub_id = ? `;
        const executequerysql3 = await executeQuery(sql3, [response.reservation_sub_catid]);
        if (executequerysql3.length > 0) {
            Object.assign(response, executequerysql3[0]);
        }

        const sql4 = ` SELECT name, email, mobile FROM users WHERE id = ? `;
        const executequerysql4 = await executeQuery(sql4, [response.user_id]);
        if (executequerysql4.length > 0) {
            Object.assign(response, executequerysql4[0]);
        }

        arrayresponse.push(response);
        console.log(arrayresponse)
        await mailcodefunction(arrayresponse)

    } catch (error) {
        console.error("Error executing query:", error);

    }
}


// const nodemailer = require('nodemailer')

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'mailto:boopathiperiyasamy2@gmail.com',
        pass: 'sscy lujo hrjk yjio'
    }
});

async function mailcodefunction(data) {
    const reservationDetails = data[0]
    var mailOptions = {
        from: 'boopathiperiyasamy2@gmail.com',
        to: 'gowthamjohnson6@gmail.com',
        subject: 'Reservation Confirmation',
        html: ``
    };

    // Send email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
            // res.status(200).send('Internal Server Error');
        } else {
            console.log('Email sent: ' + info.response);
            // res.status(200).send('Email sent successfully');
        }
    });
}

