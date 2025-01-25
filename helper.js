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
    return (key === process.env.ENCRYPT_KEY.ENCRYPT_KEY) ? true : false;
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
        console.log(res_arr);
        if (res_arr <= 0) {
            return null;
        }
        let result = { user_name: res_arr[0], user_email: res_arr[1], user_id: res_arr[2], user_mobile: res_arr[3], ENCRYPT_KEY: res_arr[4] }
        console.log(result);
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
        query = ` AND (reservation_booking.date > CURRENT_DATE() AND reservation_booking.booking_status = '${tabActive}')` ;
    } else if (tabActive == "Completed") {
        query = ` AND (reservation_booking.date < CURRENT_DATE() OR reservation_booking.booking_status = '${tabActive}')`;
    }
    return query;
}