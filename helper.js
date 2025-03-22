import CryptoJS from 'crypto-js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv'
import { decryptData } from './encryption.js';
dotenv.config()

//For Admin generate token
export const generateToken = () => {
    const data = {
        time: Date(),
    };
    const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(data), process.env.CRY_KEY).toString();
    return jwt.sign({ tkn: ciphertext }, process.env.JWT_SECRET_KEY, { expiresIn: '1d' });
};

export async function validateEncrypt(key) {
    return (key === process.env.ENCRYPT_KEY) ? true : false;
};

export async function reg(reg, v) {
    let err = true;
    if (reg.test(v)) {
        err = false;
    }
    return err;
};


//website
export async function getUserInfo(v) {
    try {
        let res = decryptData(v);
        let res_arr = res.split("-");
        if (res_arr <= 0) {
            return null;
        }
        let result = { user_name: res_arr[0], user_email: res_arr[1], user_id: res_arr[2], user_mobile: res_arr[3], ENCRYPT_KEY: res_arr[4] }
        return result;
    } catch (error) {
        return null;
    }
};


export async function getStringDate(dateStr) {
    // Convert the string to a Date object
    const date = new Date(dateStr);

    // Format the date as DD-MM-YYYY
    const formattedDate = `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
    return formattedDate;

}


export async function getQueryUsingTab(tabActive) {
    let query = '';
    if (tabActive == "Booked") {
        // query = ` AND reservation_booking.date > CURRENT_DATE()`;
        query = ` AND (reservation_booking.date > CURRENT_DATE() AND reservation_booking.booking_status = '${tabActive}')`;
    } else if (tabActive == "Completed") {
        query = ` AND (reservation_booking.date < CURRENT_DATE() OR reservation_booking.booking_status = '${tabActive}')`;
    }
    return query;
}


export async function getQueryUsingUpcoming(parm) {
    let query = '';
    if (parm == "Today") {
        query = ` AND (reservation_booking.date = CURRENT_DATE())`;
    } else if (parm == "Tomorrow") {
        query = ` AND (reservation_booking.date = CURRENT_DATE() + INTERVAL 1 DAY)`;
    } else if (parm == "Oneweek") {
        query = ` AND (reservation_booking.date BETWEEN CURRENT_DATE() - INTERVAL 1 DAY AND CURRENT_DATE() + INTERVAL 7 DAY)`;
    } else if (parm == "Twoweek") {
        query = ` AND (reservation_booking.date BETWEEN CURRENT_DATE() - INTERVAL 1 DAY AND CURRENT_DATE() + INTERVAL 14 DAY)`;
    } else if (parm == "Onemonth") {
        query = ` AND (reservation_booking.date BETWEEN CURRENT_DATE() - INTERVAL 1 DAY AND CURRENT_DATE() + INTERVAL 1 month)`;
    } else {
        query = ` AND (reservation_booking.date >= CURRENT_DATE())`;
    }
    return query;
}

export async function getQueryUsingPast(parm) {
    let query = '';
    if (parm == "Yesterday") {
        query = ` AND (reservation_booking.date = CURRENT_DATE() - INTERVAL 1 DAY)`;
    } else if (parm == "Oneweek") {
        query = ` AND (reservation_booking.date BETWEEN CURRENT_DATE() - INTERVAL 7 DAY AND CURRENT_DATE() - INTERVAL 1 DAY)`;
    } else if (parm == "Twoweek") {
        query = ` AND (reservation_booking.date BETWEEN CURRENT_DATE() - INTERVAL 14 DAY AND CURRENT_DATE() - INTERVAL 1 DAY)`;
    } else if (parm == "Onemonth") {
        query = ` AND (reservation_booking.date BETWEEN CURRENT_DATE() - INTERVAL 1 MONTH AND CURRENT_DATE() - INTERVAL 1 DAY)`;
    } else {
        query = ` AND (reservation_booking.date <= CURRENT_DATE())`;
    }
    return query;
}

export async function getIndianDateTime() {

    // Convert the UTC string to a Date object
    const date = new Date();

    // Convert to Indian Standard Time (IST) by adding 5 hours and 30 minutes
    const istOffset = 5 * 60 + 30; // IST is UTC +5:30 (5 hours and 30 minutes)
    const istDate = new Date(date.getTime() + istOffset * 60000); // Add the offset in milliseconds

    // Format the date to the desired output (ISO 8601 format)
    // const formattedDateTime = istDate.toISOString();
    const formattedDateTime = istDate.toISOString().replace('T', ' ').substring(0, 19);

    // console.log(formattedDateTime);  // Output will be in IST

    return formattedDateTime;
}