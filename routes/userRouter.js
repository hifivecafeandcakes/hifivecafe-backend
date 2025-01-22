import { baseImageUrl, baseVideoUrl, deleteImageUrl, deleteVideoUrl } from '../constants.js';
import { executeQuery } from '../dbHelper.js';
import { encryptData, decryptData } from '../encryption.js'
import { getUserInfo, validateEncrypt, reg, getStringDate, getQueryUsingTab } from '../helper.js';
import { createOrder, fetchPaymentDetails } from '../razorpay.js';
import { format } from 'date-fns';
import con from "../db.js";

// routes/userRouter.js
import express from 'express';
import { sendMessage } from '../whastpp/index.js';
import logger from '../logger.js';
import { sendEmail } from '../mail/sendMail.js';
import { mailingMessage } from '../mail/message.js';

import crypto from 'crypto';

const router = express.Router();

const firstimgurl = baseImageUrl;
const Arrayimgurl = baseImageUrl;

// Website
router.post('/register', async (req, res) => {
    try {
        const name = req.body.name;
        let password = req.body.password;
        const email = req.body.email;
        const phone_number = req.body.phone;
        const currentdate = new Date();

        if (name == "" || password == "" || email == "" || phone_number == "") {
            return res.send({ Response: { Success: '0', Message: "Please fill all fields", result: [] } });
        }

        if ((await reg(/^(?:(?:\+|0{0,2})91(\s*|[\-])?|[0]?)?([6789]\d{2}([ -]?)\d{3}([ -]?)\d{4})$/, phone_number))) {
            return res.send({ Response: { Success: '0', Message: "Invalid Phone number", result: [] } });
        }

        if ((await reg(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, email))) {
            return res.send({ Response: { Success: '0', Message: "Invalid Email Format", result: [] } });
        }


        const checkEmail = await executeQuery(`select * from users where email = ? `, [email], req.originalUrl || req.url);
        if (checkEmail.length > 0) { return res.send({ Response: { Success: '0', Message: "Email Id Already Registered", result: [] } }); }

        const checkName = await executeQuery(`select * from users where name = ? `, [name], req.originalUrl || req.url);
        if (checkName.length > 0) { return res.send({ Response: { Success: '0', Message: "Name Already Registered", result: [] } }); }

        const checkPhone = await executeQuery(`select * from users where mobile = ? `, [phone_number], req.originalUrl || req.url);
        if (checkPhone.length > 0) { return res.send({ Response: { Success: '0', Message: "Phone number Already Registered", result: [] } }); }

        password = encryptData(password.toString(), false);
        const register = await executeQuery(`insert into users(name,mobile,email,password,created_at)values(?,?,?,?,?)`, [name, phone_number, email, password, currentdate], req.originalUrl || req.url);
        if (register.length <= 0) { return res.send({ Response: { Success: '0', Message: "Register unsuccessfully", result: [] } }); }

        const signin = await executeQuery(`select * from users where email = ? `, [email], req.originalUrl || req.url);
        if (signin.length <= 0) { return res.send({ Response: { Success: '0', Message: "Register unsuccessfully", result: [] } }); }

        let email1 = signin[0].email;
        let result = [];
        const encryptedData = encryptData(signin[0].name + "-" + signin[0].email + "-" + signin[0].id + "-" + signin[0].mobile);
        console.log(encryptedData);

        result.push({ email: email1, user_id: encryptedData, name: signin[0].name, mobile: signin[0].mobile });
        console.log(result);
        logger.success(`Route: ${req.originalUrl || req.url}, ID: ${signin[0].id}, Email: ${email1}, Mobile: ${signin[0].mobile}`);
        let registeration_mail = await mailingMessage('Registration', { userName: signin[0].name });
        if (registeration_mail != "" && registeration_mail.message && registeration_mail.subject) { //Malling
            await sendEmail(email1, email1, registeration_mail.message, registeration_mail.subject);
        }
        return res.send({ Response: { Success: '1', Message: "Register and Logged in Successfully", result: result } });
    }
    catch (error) {
        console.log(error);
        const stackLines = error.stack.split('\n'); // Split the stack into lines
        const errorLine = stackLines[1]?.trim();
        logger.error(`Route: "${req.originalUrl || req.url}", Error: ${error.message}, ErrorLine: ${errorLine}`);
        return res.status(500).json({ Success: '0', Message: error.message, result: [] });
    }
})


// =========================================signin=============================================
router.post("/signin", async (req, res) => {
    try {
        let email = req.body.email;
        let password = req.body.password;

        if (password == "" || email == "") {
            return res.send({ Response: { Success: '0', Message: "Please fill all fields", result: [] } });
        }

        if ((await reg(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, email))) {
            return res.send({ Response: { Success: '0', Message: "Invalid Email Format", result: [] } });
        }

        // console.log(req)
        const signin = await executeQuery(`select * from users where email = ? `, [email], req.originalUrl || req.url);
        if (signin.length <= 0) { return res.send({ Response: { Success: '0', Message: "Email Not Found", result: [] } }); }


        let email1 = signin[0].email;
        let password1 = decryptData(signin[0].password.toString());
        console.log(email1);
        console.log(password1);

        if (email1 == email && password1 == password) {
            let result = [];
            console.log(signin);
            const encryptedData = encryptData(signin[0].name + "-" + signin[0].email + "-" + signin[0].id + "-" + signin[0].mobile);
            console.log(encryptedData);
            // const data = decryptData(encryptedData)
            // console.log(data);

            result.push({ email: email1, user_id: encryptedData, name: signin[0].name, mobile: signin[0].mobile });
            logger.success(`Route: ${req.originalUrl || req.url}, ID: ${signin[0].id}, Email: ${email1}`);

            return res.send({ Response: { Success: '1', Message: "Logged in Successfully", result: result } });
        }
        else {
            return res.send({ Response: { Success: '0', Message: "Email or Password Not Registered", result: [] } });
        }
    }
    catch (error) {
        console.log(error);
        const stackLines = error.stack.split('\n'); // Split the stack into lines
        const errorLine = stackLines[1]?.trim();
        logger.error(`Route: "${req.originalUrl || req.url}", Error: ${error.message}, ErrorLine: ${errorLine}`);
        return res.status(500).json({ Success: '0', Message: error.message, Result: [] });
    }

})


router.get("/reservation/list", async (req, res) => {
    try {
        const reser_id = req.query.reser_id
        let sql;
        let objfile = {};
        let Arrayresposne = [];
        if (!reser_id) {
            sql = `select * from reservation where status="Active"`
        } else {
            sql = `select * from reservation where status="Active" and reser_id=${reser_id}`
        }
        const exesqlquery = await executeQuery(sql, [], req.originalUrl || req.url)

        if (exesqlquery.length > 0) {

            const videosql = `select * from video where video_status="1" and type="RESERVATION"`
            const executevideoquery = await executeQuery(videosql, [], req.originalUrl || req.url)
            if (executevideoquery.length > 0) {
                objfile['video'] = baseVideoUrl + executevideoquery[0].video_file;
            }

            //const firstimgurl = baseImageUrl;
            //const Arrayimgurl = baseImageUrl;

            const result = exesqlquery.map((item) => {
                const extraImages = (item.extra_img != "" && item.extra_img != null && item.extra_img != "null") ? JSON.parse(item.extra_img).map(imageName => Arrayimgurl + imageName) : [];

                return {
                    reser_id: item.reser_id,
                    reser_title: item.reser_title,
                    reser_code: item.reser_code,
                    reser_main_title: item.reser_main_title,
                    reser_image: firstimgurl + item.reser_image,
                    description: item.description,
                    extra_img: extraImages,
                    status: item.status,
                    created_at: item.created_at,
                    updated_at: item.updated_at,
                };
            });
            logger.success(`Route: ${req.originalUrl || req.url}`);

            const response = { Response: { Success: "1", Message: "Success", result: result } };
            return res.json(response);
        }
        else {
            logger.success(`Route: ${req.originalUrl || req.url}, Record:[]`);
            const response = { Response: { Success: "0", Message: "No Records!", } };
            return res.json(response);
        }
    } catch (error) {
        console.log(error);
        const stackLines = error.stack.split('\n'); // Split the stack into lines
        const errorLine = stackLines[1]?.trim();
        logger.error(`Route: "${req.originalUrl || req.url}", Error: ${error.message}, ErrorLine: ${errorLine}`);
        return res.status(500).json({ Success: '0', Message: error.message, Result: [] });
    }
})


router.get("/reservation/category/list", async (req, res) => {
    try {
        const reser_id = req.query.reser_id;

        let objfile = {};
        let Arrayresposne = [];

        const sql = `SELECT reservation.reser_main_title,reservation.reser_id,reservation.reser_code,reservation.reser_image,reservation.reser_title,reservation.description,reservation.reser_videos
        FROM reservation
        JOIN reservation_category ON reservation.reser_id = reservation_category.reser_id
        WHERE reservation.status = 'Active' AND reservation_category.status = 'Active'
        AND reservation.reser_id = ${reser_id}`

        const executesql = await executeQuery(sql, [], req.originalUrl || req.url)

        if (executesql.length > 0) {
            objfile['video'] = baseVideoUrl + executesql[0].videos;
            objfile['reser_img'] = baseImageUrl + executesql[0].reser_image;
            objfile['reser_main_title'] = executesql[0].reser_main_title;
            objfile['reser_title'] = executesql[0].reser_title;
            objfile['description'] = executesql[0].description;
            objfile['reser_id'] = executesql[0].reser_id;
            objfile['reser_code'] = executesql[0].reser_code;


            let reservationcategorysql = `select * from reservation_category where status="Active" and reser_id=${reser_id} ORDER BY CASE reser_cat_code WHEN 'silver' THEN 1 WHEN 'gold' THEN 2 WHEN 'elite' THEN 3 ELSE 4 END`
            const executereservationcategorysql = await executeQuery(reservationcategorysql, [], req.originalUrl || req.url)

            if (executereservationcategorysql.length > 0) {
                const result = executereservationcategorysql.map((item) => {
                    return {
                        cat_id: item.cat_id,
                        cat_title: item.cat_title,
                        reser_cat_code: item.reser_cat_code,
                        price_range: item.price_range,
                        cat_image: baseImageUrl + item.cat_image,
                        status: item.status,
                        created_at: item.created_at,
                        updated_at: item.updated_at,
                    };
                });
                objfile['reservation_category_list'] = result;
                Arrayresposne.push(objfile)
                logger.success(`Route: ${req.originalUrl || req.url}`);
                const response = { Response: { Success: "1", Message: "Success", result: Arrayresposne } }
                res.send(response)

            } else {
                logger.success(`Route: ${req.originalUrl || req.url}, Record:[]`);
                const response = { Response: { Success: "0", Message: "No Records!", } };
                return res.json(response);
            }
        }
        else {
            logger.success(`Route: ${req.originalUrl || req.url}, Record:[]`);
            const response = { Response: { Success: "0", Message: "No Records!", } };
            return res.json(response);
        }
    } catch (error) {
        console.log(error);
        const stackLines = error.stack.split('\n'); // Split the stack into lines
        const errorLine = stackLines[1]?.trim();
        logger.error(`Route: "${req.originalUrl || req.url}", Error: ${error.message}, ErrorLine: ${errorLine}`);
        return res.status(500).json({ Success: '0', Message: error.message, Result: [] });
    }
})


router.get("/reservation/subcategory/list", async (req, res) => {
    try {
        const reser_id = req.query.reser_id;
        const resercat_id = req.query.resercat_id;

        let objfile = {};
        let Arrayresposne = [];

        const sql = `SELECT reservation.reser_main_title,reservation.reser_videos,reservation.reser_image,reservation.reser_title,reservation.reser_id,reservation_category.cat_title,reservation_category.cat_id,reservation_category.reser_cat_code FROM reservation JOIN reservation_category ON reservation.reser_id = reservation_category.reser_id WHERE reservation.status = 'Active' AND reservation_category.status = 'Active' AND reservation.reser_id = ${reser_id} AND reservation_category.cat_id=${resercat_id}`

        const executesql = await executeQuery(sql, [], req.originalUrl || req.url)

        if (executesql.length > 0) {
            objfile['video'] = baseVideoUrl + executesql[0].reser_videos;
            objfile['reser_img'] = baseImageUrl + executesql[0].reser_image;
            objfile['reser_main_title'] = executesql[0].reser_main_title;
            objfile['reser_title'] = executesql[0].reser_title;
            objfile['reser_id'] = executesql[0].reser_id;
            objfile['cat_id'] = executesql[0].cat_id;
            objfile['reser_cat_code'] = executesql[0].reser_cat_code;
            objfile['reser_subtitle'] = executesql[0].cat_title;

            let reservationcategorysql = `select * from reservation_sub_category where status="Active" and reser_id=${reser_id} AND reser_cat_id=${resercat_id} ORDER BY sub_cat_price_range ASC`
            const executereservationcategorysql = await executeQuery(reservationcategorysql, [], req.originalUrl || req.url)

            //const firstimgurl = baseImageUrl;
            //const Arrayimgurl = baseImageUrl;
            if (executereservationcategorysql.length > 0) {
                const result = executereservationcategorysql.map((item) => {
                    const extraImages = (item.sub_extra_img != "" && item.sub_extra_img != null && item.sub_extra_img != "null") ? JSON.parse(item.sub_extra_img).map(imageName => Arrayimgurl + imageName) : [];
                    return {
                        reser_sub_id: item.reser_sub_id,
                        sub_tilte: item.sub_tilte,
                        reser_id: item.reser_id,
                        sub_img: baseImageUrl + item.sub_img,
                        reser_id: item.reser_id,
                        reser_cat_id: item.reser_cat_id,
                        sub_extra_img: extraImages,
                        sub_cat_price_range: item.sub_cat_price_range,
                        status: item.status,
                        created_at: item.created_at,
                        updated_at: item.updated_at,
                    };
                });
                objfile['reservation_subcategory_list'] = result;
                Arrayresposne.push(objfile)
                logger.success(`Route: ${req.originalUrl || req.url}`);

                const response = { Response: { Success: "1", Message: "Success", result: Arrayresposne } }
                res.send(response)

            } else {
                logger.success(`Route: ${req.originalUrl || req.url}, Record:[]`);
                const response = { Response: { Success: "0", Message: "No Records!", } };
                return res.json(response);
            }
        }
        else {
            logger.success(`Route: ${req.originalUrl || req.url}, Record:[]`);
            const response = { Response: { Success: "0", Message: "No Records!", } };
            return res.json(response);
        }
    } catch (error) {
        console.log(error);
        const stackLines = error.stack.split('\n'); // Split the stack into lines
        const errorLine = stackLines[1]?.trim();
        logger.error(`Route: "${req.originalUrl || req.url}", Error: ${error.message}, ErrorLine: ${errorLine}`);
        return res.status(500).json({ Success: '0', Message: error.message, Result: [] });
    }
})



router.get("/reservation/category/subcategory", async (req, res) => {
    try {
        let userid = req.query.user_id;
        if (!userid) { return res.send({ Response: { Success: '0', Message: "User Id is required!", } }); }
        let userInfo = await getUserInfo(userid);
        if (userInfo == null || !userInfo.user_id) { return res.send({ Response: { Success: '0', Message: "User Info is required!", } }); }

        if (!await validateEncrypt(userInfo.ENCRYPT_KEY)) {
            return res.send({ Response: { Success: '0', Message: "Key Validation Error", result: [] } });
        }
        userid = userInfo.user_id;
        console.log(userid);
        console.log(req.body);
        const userResult = await executeQuery(`SELECT * FROM users WHERE id = ? AND status = ?`, [userid, 1], req.originalUrl || req.url); //check user exist in DB   
        if (userResult.length <= 0) { return res.send({ Response: { Success: '0', Message: "Please Signup!", } }); }

        let objfile = {};
        let Arrayresposne = [];

        const res_id = req.query.res_id
        const res_cat_id = req.query.res_cat_id
        const reser_sub_id = req.query.reser_sub_id
        if (!reser_sub_id) {
            return res.send({
                Success: '0',
                Message: "reser_sub_id required!",
            });
        }

        let reservationcategorysql = `select
        reservation_sub_category.*,
            reservation.reser_title,
            reservation.reser_main_title,
            reservation.description,
            reservation_category.cat_title,
            reservation_category.cat_image 
        from reservation_sub_category
        JOIN reservation_category ON reservation_category.cat_id = reservation_sub_category.reser_cat_id
        JOIN reservation ON reservation.reser_id = reservation_category.reser_id
        where reservation.status = "Active" and reservation_category.status = "Active" and reservation_sub_category.status = "Active" and reservation_sub_category.reser_sub_id = ${reser_sub_id} `
        const executereservationcategorysql = await executeQuery(reservationcategorysql, [], req.originalUrl || req.url)

        if (executereservationcategorysql.length > 0) {
            const result = executereservationcategorysql.map((item) => {
                const extraImages = (item.sub_extra_img != "" && item.sub_extra_img != null && item.sub_extra_img != "null") ? JSON.parse(item.sub_extra_img).map(imageName => Arrayimgurl + imageName) : [];
                const veg_images = (item.veg_images != "" && item.veg_images != null && item.veg_images != "null") ? JSON.parse(item.veg_images).map(imageName => Arrayimgurl + imageName) : [];
                const nonveg_images = (item.nonveg_images != "" && item.nonveg_images != null && item.nonveg_images != "null") ? JSON.parse(item.nonveg_images).map(imageName => Arrayimgurl + imageName) : [];

                // console.log(JSON.parse(item.veg_menus).map(el => el != ""));
                // console.log(JSON.parse(item.nonveg_menus));
                // console.log(typeof JSON.parse(item.nonveg_menus));
                // let veg_menus = await removeEmpty(JSON.parse(item.veg_menus));
                // let veg_menus = Object.keys(JSON.parse(item.veg_menus)).map(key => ({ key: key, value: JSON.parse(item.veg_menus)[key] }));
                let veg_menus = (item.veg_menus && item.veg_menus != "" && item.veg_menus != null) ? Object.keys(JSON.parse(item.veg_menus))
                    .map(key => JSON.parse(item.veg_menus)[key])           // Get values
                    .filter(value => value) : [];
                console.log(veg_menus);

                let nonveg_menus = (item.nonveg_menus && item.nonveg_menus != "" && item.nonveg_menus != null) ? Object.keys(JSON.parse(item.nonveg_menus))
                    .map(key => JSON.parse(item.nonveg_menus)[key])           // Get values
                    .filter(value => value) : [];
                console.log(nonveg_menus);


                let cakes = (item.cakes && item.cakes != "" && item.cakes != null) ? Object.keys(JSON.parse(item.cakes))
                    .map(key => JSON.parse(item.cakes)[key])           // Get values
                    .filter(value => value) : [];
                console.log(cakes);

                let photoShoots = (item.photoShoots && item.photoShoots != "" && item.photoShoots != null) ? Object.keys(JSON.parse(item.photoShoots))
                    .map(key => JSON.parse(item.photoShoots)[key])           // Get values
                    .filter(value => value) : [];
                console.log(cakes);

                let photoShootPrices = (item.photoShootPrices && item.photoShootPrices != "" && item.photoShootPrices != null) ? Object.keys(JSON.parse(item.photoShootPrices))
                    .map(key => JSON.parse(item.cakes)[key])           // Get values
                    .filter(value => value) : [];
                console.log(photoShootPrices);

                let photoPrints = (item.photoPrints && item.photoPrints != "" && item.photoPrints != null) ? Object.keys(JSON.parse(item.photoPrints))
                    .map(key => JSON.parse(item.cakes)[key])           // Get values
                    .filter(value => value) : [];
                console.log(photoPrints);

                let photoPrintPrices = (item.photoPrintPrices && item.photoPrintPrices != "" && item.photoPrintPrices != null) ? Object.keys(JSON.parse(item.photoPrintPrices))
                    .map(key => JSON.parse(item.photoPrintPrices)[key])           // Get values
                    .filter(value => value) : [];
                console.log(photoPrintPrices);

                let flowers = (item.flowers && item.flowers != "" && item.flowers != null) ? Object.keys(JSON.parse(item.flowers))
                    .map(key => JSON.parse(item.flowers)[key])           // Get values
                    .filter(value => value) : [];
                console.log(flowers);

                let flowersPrices = (item.flowersPrices && item.flowersPrices != "" && item.flowersPrices != null) ? Object.keys(JSON.parse(item.flowersPrices))
                    .map(key => JSON.parse(item.flowersPrices)[key])           // Get values
                    .filter(value => value) : [];
                console.log(flowersPrices);

                return {
                    reser_sub_id: item.reser_sub_id,
                    sub_tilte: item.sub_tilte,
                    reser_id: item.reser_id,
                    sub_img: baseImageUrl + item.sub_img,
                    reser_id: item.reser_id,
                    reser_cat_id: item.reser_cat_id,
                    sub_extra_img: extraImages,
                    veg_images: veg_images,
                    nonveg_images: nonveg_images,
                    veg_menus: veg_menus,
                    nonveg_menus: nonveg_menus,
                    sub_cat_price_range: item.sub_cat_price_range,
                    status: item.status,
                    cakes: cakes,
                    created_at: item.created_at,
                    updated_at: item.updated_at,

                    reser_main_title: item.reser_main_title,
                    reser_title: item.reser_title,
                    description: item.description,
                    cat_title: item.cat_title,
                    cat_image: baseImageUrl + item.cat_image,

                    photoShoots: photoShoots,
                    photoShootPrices: photoShootPrices,
                    photoPrints: photoPrints,
                    photoPrintPrices: photoPrintPrices,
                    flowers: flowers,
                    flowersPrices: flowersPrices
                };
            });
            objfile['reservation_subcategory'] = result;
            Arrayresposne.push(objfile)
            logger.success(`Route: ${req.originalUrl || req.url}`);

            const response = { Response: { Success: "1", Message: "Success", result: Arrayresposne } }
            res.send(response)

        } else {
            logger.success(`Route: ${req.originalUrl || req.url}, Record:[]`);
            const response = { Response: { Success: "0", Message: "No Records!", } };
            return res.json(response);
        }
    } catch (error) {
        console.log(error);
        const stackLines = error.stack.split('\n'); // Split the stack into lines
        const errorLine = stackLines[1]?.trim();
        logger.error(`Route: "${req.originalUrl || req.url}", Error: ${error.message}, ErrorLine: ${errorLine}`);
        return res.status(500).json({ Success: '0', Message: error.message, });
    }
})

// ------------------------------------------------------------------reservation booking api

router.post("/reservation/booking/create", async (req, res) => {
    try {

        let { userid } = req.body;
        if (!userid) { return res.send({ Response: { Success: '0', Message: "User Id is required!", } }); }
        let userInfo = await getUserInfo(userid);
        if (userInfo == null || !userInfo.user_id) { return res.send({ Response: { Success: '0', Message: "User Info is required!", } }); }

        if (!await validateEncrypt(userInfo.ENCRYPT_KEY)) {
            return res.send({ Response: { Success: '0', Message: "Key Validation Error", result: [] } });
        }
        userid = userInfo.user_id;
        console.log(userid);
        console.log(req.body);

        const userResult = await executeQuery(`SELECT * FROM users WHERE id = ? AND status = ?`, [userid, 1], req.originalUrl || req.url); //check user exist in DB   
        if (userResult.length <= 0) { return res.send({ Response: { Success: '0', Message: "Please Signup!", } }); }

        let { reser_id, reser_catid, resersubcatid } = req.body;
        let { type, date, time, time_slot, peoples, guest_name, guest_whatsapp, remarks, balloon_theme } = req.body;
        let { menu_type, veg_or_nonveg } = req.body;
        let { cake, cake_msg, cake_weight, cake_shape, cakeShapePrice } = req.body;
        let { photoShoot, photoShootPrice, photoPrint, photoPrintPrice, flower, flowerPrice, fire, firePrice } = req.body;
        let { ledOption, ledName, led, ledPrice, ageOption, ageName, age, agePrice } = req.body;
        let { total, price } = req.body;

        
        total = 1;
        price = 1;

        if (!reser_id || !reser_catid || !resersubcatid) {
            return res.json({ Response: { Success: "0", Message: "Invalid entry" } });
        }

        if ((type == "CL") && (!date || !time_slot || !guest_name
            || !peoples || !menu_type || !total || !price)) {
            return res.json({ Response: { Success: "0", Message: "Please Provide Valid candle light dinner Details" } });
        }

        if ((type == "BP") && (!date || !time_slot || !peoples || !guest_name
            || !cake || !cake_msg || !cake_shape || !cake_weight || !total || !price)) {
            return res.json({ Response: { Success: "0", Message: "Please Provide Valid birthday party Details" } });
        }

        if ((type == "TB") && (!date || !time || !peoples || !total || !price)) {
            return res.json({ Response: { Success: "0", Message: "Please Provide Valid table booking Details" } });
        }

        if (!price || !total) { return res.json({ Response: { Success: "0", Message: "total Amount not valid" } }); }

        price = parseInt(price, 10);
        total = parseInt(total, 10);

        if (type == "CL" || type == "BP") {
            photoShootPrice = parseInt(photoShootPrice, 10);
            photoPrintPrice = parseInt(photoPrintPrice, 10);
            flowerPrice = parseInt(flowerPrice, 10);
            firePrice = parseInt(firePrice, 10);
            ledPrice = parseInt(ledPrice, 10);
            agePrice = parseInt(agePrice, 10);
        }
        let bookingStatus = (type == "TB") ? "Booked" : "Created";
        // ["Created","Booked"]

        let formatDate = new Date();
        let reservationSubCategory = await executeQuery(`SELECT * FROM reservation_sub_category WHERE reser_sub_id = ?`, [resersubcatid], req.originalUrl || req.url); //check user exist in DB   
        let insertQuery = "";
        let sqlValues = [];

        if (type == "CL") {
            insertQuery = `INSERT INTO reservation_booking (reservation_id,reservation_catid,reservation_sub_catid,user_id,reservation_type,date, time,time_slot, total_people, menu_type, veg_or_nonveg,guest_name,guest_whatsapp,balloon_theme,cake,cake_msg, photoShoot, photoShootPrice, photoPrint, photoPrintPrice, flower, flowerPrice,fire, firePrice,is_led, ledName, led, ledPrice, is_age, ageName, age, agePrice, amount, total_amount,comment,booking_status, created_at) VALUES (?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?, ?,?,?,?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?, ?,?,?,?,?)`;
            sqlValues = [reser_id, reser_catid, resersubcatid, userid, type, date, time, time_slot, peoples, menu_type, veg_or_nonveg, guest_name, guest_whatsapp, balloon_theme, cake, cake_msg, photoShoot, photoShootPrice, photoPrint, photoPrintPrice, flower, flowerPrice, fire, firePrice, ledOption, ledName, led, ledPrice, ageOption, ageName, age, agePrice, price, total, remarks, bookingStatus, formatDate];
        } else if (type == "BP") {
            insertQuery = `INSERT INTO reservation_booking (reservation_id,reservation_catid,reservation_sub_catid,user_id,reservation_type,date, time,time_slot, total_people, cake_weight, cake_shape,cakeShapePrice, guest_name,guest_whatsapp,balloon_theme,cake,cake_msg, photoShoot, photoShootPrice, photoPrint, photoPrintPrice, flower, flowerPrice, fire, firePrice,is_led, ledName, led, ledPrice, is_age, ageName, age, agePrice,amount, total_amount, comment,booking_status, created_at) VALUES (?,?, ?, ?, ?, ?, ?,?, ?, ?, ?, ?, ?, ?, ?, ?,?,?, ?, ?, ?, ?, ?,?, ?,?,?,?, ?, ?, ?, ?, ?,?, ?,?,?,?)`;
            sqlValues = [reser_id, reser_catid, resersubcatid, userid, type, date, time, time_slot, peoples, cake_weight, cake_shape, cakeShapePrice, guest_name, guest_whatsapp, balloon_theme, cake, cake_msg, photoShoot, photoShootPrice, photoPrint, photoPrintPrice, flower, flowerPrice, fire, firePrice, ledOption, ledName, led, ledPrice, ageOption, ageName, age, agePrice, price, total, remarks, bookingStatus, formatDate];
        } else {
            insertQuery = `INSERT INTO reservation_booking (reservation_id,reservation_catid,reservation_sub_catid,user_id,reservation_type,date, time, total_people,guest_name,guest_whatsapp, comment,booking_status, created_at) VALUES (?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            sqlValues = [reser_id, reser_catid, resersubcatid, userid, type, date, time, peoples, guest_name, guest_whatsapp, remarks, bookingStatus, formatDate];
        }

        con.query(insertQuery, sqlValues, async (error, result) => {
            if (error) {
                console.log(error)
                logger.error(`Start Route: "${req.originalUrl || req.url}"`);
                logger.error(`MySQL Error: ${error.message}`);
                logger.error(`SQL Query: ${insertQuery}`);
                logger.error(`Values: ${JSON.stringify(sqlValues)}`);

                let stackLines = error.stack?.split('\n') || [];
                let errorLine = stackLines[1]?.trim();
                if (errorLine) {
                    logger.error(`Error occurred at: ${errorLine}`);
                }
                logger.error(`End Route: "${req.originalUrl || req.url}"`);


                return res.json({ Response: { Success: "0", Message: "Booking failed" } });
            } else {
                const reservationId = result.insertId;
                logger.success(`Route: ${req.originalUrl || req.url}, booking_id:${reservationId}`);
                if (type == "TB") {

                    let bookingInfo = await executeQuery(`SELECT * FROM reservation_booking WHERE booking_id = ?`, [reservationId], req.originalUrl || req.url);
                    if (bookingInfo.length > 0) {
                        let date = await getStringDate(bookingInfo[0].date);

                        let cus = { user_mobile: `91${userResult[0].mobile}`, user_name: userResult[0].name, user_email: userResult[0].email };
                        let booking = { booking_id: `BOOKID${bookingInfo[0].booking_id}`, sub_title: reservationSubCategory[0].sub_tilte, date: date, time_slot: bookingInfo[0].time, total_people: bookingInfo[0].total_people };

                        //Malling
                        let booking_mail = await mailingMessage('Booking', { cus: cus, booking: booking });
                        if (booking_mail != "" && booking_mail.message && booking_mail.subject) {
                            await sendEmail(userEmail, userName, booking_mail.message, booking_mail.subject);
                        }

                        await sendMessage(cus, booking, "booking"); //whatsapp
                    }

                    return res.json({
                        Response: {
                            Success: "1", Message: "Booked!",
                            ReservationId: reservationId,
                            reservationSubCategory: reservationSubCategory,
                            user: userResult
                        }
                    });
                }
                // await mailbooking(reservationId, res)
                let razorPayCreate = await createOrder({ amount: total, receipt: userid.toString() })

                if (!razorPayCreate.success) {
                    return res.json({ Response: { Success: "0", Message: "Razorpay Order not Created" } });
                }
                let RazorpayOrder = razorPayCreate.order;

                //Update razorpay_order_id
                const formatedate = new Date()
                const sql2 = `UPDATE reservation_booking SET razorpay_order_id=? ,updated_at=? WHERE booking_id=${reservationId}`;
                con.query(sql2, [RazorpayOrder.id, formatedate], async (Error, result) => {
                    if (Error) {
                        console.log(Error)
                        logger.error(`Start Route: "${req.originalUrl || req.url}"`);
                        logger.error(`MySQL Error: ${Error.message}`);
                        logger.error(`SQL Query: ${sql2}`);
                        logger.error(`Values: ${JSON.stringify([RazorpayOrder.id, formatedate])}`);

                        let stackLines = Error.stack?.split('\n') || [];
                        let errorLine = stackLines[1]?.trim();
                        if (errorLine) {
                            logger.error(`Error occurred at: ${errorLine}`);
                        }
                        logger.error(`End Route: "${req.originalUrl || req.url}"`);
                        return res.json({ Response: { Success: "0", Message: "Order ID Update failed" } });
                    } else {

                        logger.success(`Created Route: ${req.originalUrl || req.url}, booking_id:${reservationId}`);

                        return res.json({
                            Response: {
                                Success: "1", Message: "Created!",
                                ReservationId: reservationId,
                                RazorpayOrder: RazorpayOrder,
                                reservationSubCategory: reservationSubCategory,
                                user: userResult
                            }
                        });
                    }
                });
            }
        });

    } catch (error) {
        console.log(error);
        const stackLines = error.stack.split('\n'); // Split the stack into lines
        const errorLine = stackLines[1]?.trim();
        logger.error(`Route: "${req.originalUrl || req.url}", Error: ${error.message}, ErrorLine: ${errorLine}`);
        return res.status(500).json({ Success: '0', Message: error.message, Result: [] });
    }

});


// ------------------------------------------------------------------Reservation Booking update
// update payment status
router.post("/reservation/booking/update", async (req, res) => {
    try {

        console.log(req.body);
        const { razorpay_payment_status, booking_id, razorpay_payment_id } = req.body;
        let { userid } = req.body;

        let userInfo = await getUserInfo(userid);
        if (userInfo == null || !userInfo.user_id) { return res.send({ Response: { Success: '0', Message: "User Info is required!", } }); }
        userid = userInfo.user_id;

        if (!userid) { return res.send({ Response: { Success: '0', Message: "User ID is required!", } }); }
        if (!booking_id) { return res.send({ Response: { Success: '0', Message: "Booking ID is required!", } }); }
        if (!razorpay_payment_id) { return res.send({ Response: { Success: '0', Message: "Payment ID Id is required!", } }); }

        const userResult = await executeQuery(`SELECT * FROM users WHERE id = ? `, [userid], req.originalUrl || req.url); //check user exist in DB   
        if (userResult.length <= 0) { return res.send({ Response: { Success: '0', Message: "Please Signup!", } }); }

        const { razorpay_order_id, razorpay_signature,
            razorpay_error_code, razorpay_error_description, razorpay_error_source, razorpay_error_step,
            razorpay_error_reason, razorpay_error_order_id, razorpay_error_payment_id } = req.body;

        const formatedate = new Date()

        let bookingStatus = "Booked";

        let paymentDetails = await fetchPaymentDetails(razorpay_payment_id);

        console.log(paymentDetails);

        let updateParams = [razorpay_payment_status, paymentDetails.amount / 100, JSON.stringify(paymentDetails), razorpay_payment_id, razorpay_signature, bookingStatus, formatedate, formatedate];
        let updateSQL = `UPDATE reservation_booking SET razorpay_payment_status=?, razorpay_payment_amount=?, razorpay_payment_detail=?, razorpay_payment_id=?, razorpay_signature=?, booking_status=?, razorpay_payment_at=?, updated_at=? WHERE razorpay_order_id='${razorpay_order_id}' AND booking_id=${booking_id} AND booking_status='Created'`;

        if (razorpay_payment_status == "error") {
            updateParams = [razorpay_payment_status, razorpay_error_code, razorpay_error_description, razorpay_error_source, razorpay_error_step,
                razorpay_error_reason, razorpay_error_order_id, razorpay_error_payment_id, bookingStatus, formatedate, formatedate];
            updateSQL = `UPDATE reservation_booking SET razorpay_payment_status=?,razorpay_error_code=?, razorpay_error_description=?, razorpay_error_source=?, razorpay_error_step=?,
        razorpay_error_reason=?, razorpay_error_order_id=?, razorpay_error_payment_id=?, booking_status=?, razorpay_payment_at=?, updated_at=? WHERE razorpay_order_id=${razorpay_order_id} AND booking_id=${booking_id}`;
        }

        //Update razorpay_payment_id, razorpay_signature
        con.query(updateSQL, updateParams, async (Error, result) => {
            if (Error) {
                console.log(Error)
                logger.error(`Start Route: "${req.originalUrl || req.url}"`);
                logger.error(`MySQL Error: ${Error.message}`);
                logger.error(`SQL Query: ${updateSQL}`);
                logger.error(`Values: ${JSON.stringify(updateParams)}`);

                let stackLines = Error.stack?.split('\n') || [];
                let errorLine = stackLines[1]?.trim();
                if (errorLine) {
                    logger.error(`Error occurred at: ${errorLine}`);
                }
                logger.error(`End Route: "${req.originalUrl || req.url}"`);
                return res.json({ Response: { Success: "0", Message: "Error in Update payment details" } });
            } else {

                let bookingInfo = await executeQuery(`SELECT * FROM reservation_booking WHERE booking_id = ?`, [booking_id], req.originalUrl || req.url);
                if (bookingInfo.length > 0) {
                    let reservationSubCategory = await executeQuery(`SELECT * FROM reservation_sub_category WHERE reser_sub_id = ?`, [bookingInfo[0].reservation_sub_catid], req.originalUrl || req.url); //check user exist in DB   

                    let date = await getStringDate(bookingInfo[0].date);

                    let cus = { user_mobile: `91${userResult[0].mobile}`, user_name: userResult[0].name, user_email: userResult[0].email };
                    let booking = { booking_id: `BOOKID${bookingInfo[0].booking_id}`, sub_title: reservationSubCategory[0].sub_tilte, date: date, time_slot: bookingInfo[0].time_slot, total_people: bookingInfo[0].total_people };

                    let booking_mail = await mailingMessage('Booking', { cus: cus, booking: booking });
                    if (booking_mail != "" && booking_mail.message && booking_mail.subject) {
                        await sendEmail(userEmail, userName, booking_mail.message, booking_mail.subject);
                    }
                    await sendMessage(cus, booking, "booking"); //whatsapp
                }
                logger.success(`Route: ${req.originalUrl || req.url}, updatebooking_id:${booking_id}`);
                return res.json({ Response: { Success: "1", Message: "Booked!" } });
            }
        });
    } catch (error) {
        console.log(error);
        const stackLines = error.stack.split('\n'); // Split the stack into lines
        const errorLine = stackLines[1]?.trim();
        logger.error(`Route: "${req.originalUrl || req.url}", Error: ${error.message}, ErrorLine: ${errorLine}`);
        return res.status(500).json({ Success: '0', Message: error.message, Result: [] });
    }
});


// ------------------------------------------------------------------Reservation Booking list
// Cart
router.post("/order/api", async (req, res) => {
    try {
        let { userid, activeTab } = req.body;

        // let userid = 61008;
        let userInfo = await getUserInfo(userid);
        if (userInfo == null || !userInfo.user_id) { return res.send({ Response: { Success: '0', Message: "User Info is required!", } }); }
        userid = userInfo.user_id;
        if (!userid) { return res.send({ Response: { Success: '0', Message: "User Id is required!", } }); }

        const userResult = await executeQuery(`SELECT * FROM users WHERE id = ? `, [userid], req.originalUrl || req.url); //check user exist in DB   
        if (userResult.length <= 0) { return res.send({ Response: { Success: '0', Message: "Please Signup!", } }); }

        let reservationbookingsql = `SELECT 
            reservation_booking.booking_id, 
            reservation_booking.date, 
            reservation_booking.time,
            reservation_booking.time_slot, 
            reservation_booking.total_people, 
            reservation_booking.menu_type, 
            reservation_booking.veg_or_nonveg, 
            reservation_booking.guest_name, 
            reservation_booking.guest_whatsapp, 
            reservation_booking.cake, 
            reservation_booking.cake_msg, 
            reservation_booking.cake_weight, 
            reservation_booking.cake_shape, 
            reservation_booking.cakeShapePrice, 
            reservation_booking.booking_status, 
            reservation_booking.razorpay_payment_status, 
            reservation_booking.razorpay_payment_amount, 
            reservation_booking.reservation_sub_catid,
            reservation_booking.comment,
            reservation_booking.photoShoot, 
            reservation_booking.photoShootPrice, 
            reservation_booking.photoPrint, 
            reservation_booking.photoPrintPrice, 
            reservation_booking.flowerPrice,
            reservation_booking.flower, 
            reservation_booking.firePrice,
            reservation_booking.fire,
            reservation_booking.balloon_theme,
            reservation_booking.is_led,
            reservation_booking.ledName,
            reservation_booking.led,
            reservation_booking.ledPrice,
            reservation_booking.is_age,
            reservation_booking.ageName,
            reservation_booking.age,
            reservation_booking.agePrice,
            reservation_booking.amount, 
            reservation_booking.total_amount, 
            reservation_booking.comment,
            users.name as username,
            users.email as email,
            users.mobile as mobile,

            reservation_sub_category.*,
            reservation_booking.created_at,
            reservation.reser_main_title,
            reservation.description,
            reservation.reser_code,
            reservation_category.cat_title,
            reservation_category.cat_image
        from reservation_booking JOIN reservation_sub_category ON reservation_sub_category.reser_sub_id = reservation_booking.reservation_sub_catid
        JOIN reservation_category ON reservation_category.cat_id = reservation_sub_category.reser_cat_id
        JOIN reservation ON reservation.reser_id = reservation_category.reser_id
        JOIN users ON users.id = reservation_booking.user_id
        where reservation_sub_category.status = "Active" AND reservation_booking.user_id =${userid}`;

        if (activeTab !== "all" && activeTab !== "Completed") {

            if (activeTab == "Booked") {
                reservationbookingsql += await getQueryUsingTab(activeTab);
            } else {
                reservationbookingsql += ` AND reservation_booking.booking_status = '${activeTab}'`;
            }
        }

        if (activeTab == "Completed") {
            reservationbookingsql += await getQueryUsingTab(activeTab);
        }

        reservationbookingsql += ` ORDER BY reservation_booking.date ASC`;

        const executereservationbookingsql = await executeQuery(reservationbookingsql, [], req.originalUrl || req.url)

        if (executereservationbookingsql.length > 0) {
            const result = executereservationbookingsql.map((item) => {

                const extraImages = (item.sub_extra_img != "" && item.sub_extra_img != null && item.sub_extra_img != "null") ? JSON.parse(item.sub_extra_img).map(imageName => baseImageUrl + imageName) : [];
                const veg_images = (item.veg_images != "" && item.veg_images != null && item.veg_images != "null") ? JSON.parse(item.veg_images).map(imageName => baseImageUrl + imageName) : [];
                const nonveg_images = (item.nonveg_images != "" && item.nonveg_images != null && item.nonveg_images != "null") ? JSON.parse(item.nonveg_images).map(imageName => baseImageUrl + imageName) : [];

                let veg_menus = (item.veg_menus && item.veg_menus != "" && item.veg_menus != null) ? Object.keys(JSON.parse(item.veg_menus))
                    .map(key => JSON.parse(item.veg_menus)[key])           // Get values
                    .filter(value => value) : [];
                console.log(veg_menus);

                let nonveg_menus = (item.nonveg_menus && item.nonveg_menus != "" && item.nonveg_menus != null) ? Object.keys(JSON.parse(item.nonveg_menus))
                    .map(key => JSON.parse(item.nonveg_menus)[key])           // Get values
                    .filter(value => value) : [];
                console.log(nonveg_menus);

                return {
                    reser_sub_id: item.reser_sub_id,
                    sub_tilte: item.sub_tilte,
                    reser_id: item.reser_id,
                    sub_img: baseImageUrl + item.sub_img,
                    reser_id: item.reser_id,
                    reser_cat_id: item.reser_cat_id,
                    sub_extra_img: extraImages,
                    veg_images: veg_images,
                    veg_menus: veg_menus,
                    nonveg_menus: nonveg_menus,
                    nonveg_images: nonveg_images,
                    sub_cat_price_range: item.sub_cat_price_range,
                    status: item.status,
                    created_at: item.created_at,
                    updated_at: item.updated_at,

                    reser_main_title: item.reser_main_title,
                    reser_code: item.reser_code,
                    description: item.description,
                    cat_title: item.cat_title,
                    cat_image: baseImageUrl + item.cat_image,

                    // booking
                    booking_id: "BOOKID" + item.booking_id,
                    booking_date: format(new Date(item.date), 'yyyy-MM-dd'),
                    booking_time: item.time,
                    booking_time_slot: item.time_slot,
                    booking_total_people: item.total_people,
                    booking_menu_type: item.menu_type,
                    booking_veg_or_nonveg: item.veg_or_nonveg,
                    booking_guest_name: item.guest_name,
                    booking_guest_whatsapp: item.guest_whatsapp,
                    booking_cake: item.cake,
                    booking_cake_msg: item.cake_msg,
                    booking_cake_weight: item.cake_weight,
                    booking_cake_shape: item.cake_shape,
                    booking_cakeShapePrice: item.cakeShapePrice,
                    booking_status: item.booking_status,
                    booking_payment_status: item.razorpay_payment_status,
                    booking_payment_amount: item.razorpay_payment_amount,
                    remarks: item.comment,
                    amount: item.amount,
                    total_amount: item.total_amount,
                    photoShoot: item.photoShoot,
                    photoShootPrice: item.photoShootPrice,
                    photoPrint: item.photoPrint,
                    photoPrintPrice: item.photoPrintPrice,
                    flower: item.flower,
                    flowerPrice: item.flowerPrice,

                    firePrice: item.firePrice,
                    fire: item.fire,
                    balloon_theme: item.balloon_theme,
                    is_led: item.is_led,
                    ledName: item.ledName,
                    led: item.led,
                    ledPrice: item.ledPrice,
                    is_age: item.is_age,
                    ageName: item.ageName,
                    age: item.age,
                    agePrice: item.agePrice,

                    remarks: item.comment,
                    booking_created_at: format(new Date(item.created_at), 'yyyy-MM-dd HH:mm:ss'),


                    // user
                    user_name: item.username,
                    user_email: item.email,
                    user_mobile: item.mobile,
                };
            });
            // objfile['reservation_booking'] = result;
            // objfile['user'] = userResult;
            logger.success(`Route: ${req.originalUrl || req.url}`);
            res.send({ Response: { Success: "1", Message: "Success", Result: result } })
        } else {
            res.send({ Response: { Success: "1", Message: "NO Records", Result: [] } });
        }
    } catch (error) {
        const stackLines = error.stack.split('\n'); // Split the stack into lines
        const errorLine = stackLines[1]?.trim();
        logger.error(`Route: "${req.originalUrl || req.url}", Error: ${error.message}, ErrorLine: ${errorLine}`);
        return res.status(500).json({ Success: '0', Message: error.message, Result: [] });
    }
});

router.post("/check/booking/time_slot", async (req, res) => {
    try {
        let { userid } = req.body;
        // let userid = 61008;
        let userInfo = await getUserInfo(userid);
        if (userInfo == null || !userInfo.user_id) { return res.send({ Response: { Success: '0', Message: "User Info is required!", } }); }
        userid = userInfo.user_id;
        if (!userid) { return res.send({ Response: { Success: '0', Message: "User Id is required!", } }); }

        const userResult = await executeQuery(`SELECT * FROM users WHERE id = ? `, [userid], req.originalUrl || req.url);
        if (userResult.length <= 0) { return res.send({ Response: { Success: '0', Message: "Please Signup!", } }); }

        let { date, time_slot, res_scat_id } = req.body;
        console.log(date);
        console.log(time_slot);
        console.log(res_scat_id);

        let checkbookingsql = `SELECT * FROM reservation_booking WHERE time_slot=? AND date=? AND reservation_sub_catid=? AND booking_status= ?`;

        let objfile = {};

        const checkreservationbookingsql = await executeQuery(checkbookingsql, [time_slot, date, res_scat_id, "Booked"], req.originalUrl || req.url)

        if (checkreservationbookingsql.length > 0) {
            objfile['count'] = checkreservationbookingsql.length;
            logger.success(`Route: ${req.originalUrl || req.url}`);
            res.send({ Response: { Success: "1", Message: "Success", Result: objfile } })
        } else {
            objfile['count'] = 0;
            res.send({ Response: { Success: "1", Message: "NO Records", Result: objfile } });
        }

    } catch (error) {
        console.log(error)
        const stackLines = error.stack.split('\n'); // Split the stack into lines
        const errorLine = stackLines[1]?.trim();
        logger.error(`Route: "${req.originalUrl || req.url}", Error: ${error.message}, ErrorLine: ${errorLine}`);
        return res.status(500).json({ Success: '0', Message: error.message, Result: [] });
    }
});


router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        const userResult = await executeQuery(`SELECT * FROM users WHERE email = ? `, [email], req.originalUrl || req.url);
        if (userResult.length <= 0) { return res.send({ Response: { Success: '0', Message: "Email not registered in Hifive", } }); }
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = Date.now() + 300000; // OTP expires in 5 minutes

        const currentdate = new Date();
        let updateSQL = `UPDATE users SET otp=?, otp_expiry=?, updated_at=? WHERE email=?`;
        let update_sqlValues = [otp, otpExpires, currentdate, email];
        const insertOTP = await executeQuery(updateSQL, update_sqlValues, req.originalUrl || req.url);
        if (insertOTP.length <= 0) { return res.send({ Response: { Success: '0', Message: "OTP not generated, please contact Hifive", result: [] } }); }

        //Mailing
        let otp_mail = await mailingMessage('OTP', { otp: otp });
        if (otp_mail != "" && otp_mail.message && otp_mail.subject) {
            let sentMail = await sendEmail(email, email, otp_mail.message, otp_mail.subject);
            if (sentMail == "success") {
                res.send({ Response: { Success: "1", Message: "OTP Sent Successfully to your mail ID" } })
            } else {
                res.send({ Response: { Success: "0", Message: "Email not valid, please contact Hifive" } })
            }
        }

    } catch (error) {
        console.log(error)
        const stackLines = error.stack.split('\n'); // Split the stack into lines
        const errorLine = stackLines[1]?.trim();
        logger.error(`Route: "${req.originalUrl || req.url}", Error: ${error.message}, ErrorLine: ${errorLine}`);
        res.send({ Response: { Success: "0", Message: "Email not valid, please contact Hifive" } })
    }
});

router.post("/reset-password", async (req, res) => {
    try {
        let { email, otp, newPassword } = req.body;

        const userResult = await executeQuery(`SELECT * FROM users WHERE email = ? `, [email], req.originalUrl || req.url);
        if (userResult.length <= 0) { return res.send({ Response: { Success: '0', Message: "Email not registered in Hifive", } }); }

        let user = userResult[0];

        console.log(user.otp);
        console.log(otp);
        if (!user || parseInt(user.otp, 10) !== parseInt(otp, 10) || user.otpExpires < Date.now()) {
            return res.send({ Response: { Success: '0', Message: "Invalid or expired OTP", } });
        }

        newPassword = encryptData(newPassword.toString(), false);

        const currentdate = new Date();
        let updateSQL = `UPDATE users SET otp=?, otp_expiry=?, password=?, updated_at=? WHERE email=?`;
        let update_sqlValues = [null, null, newPassword, currentdate, email];

        const updatePassword = await executeQuery(updateSQL, update_sqlValues, req.originalUrl || req.url);
        if (updatePassword.length <= 0) { return res.send({ Response: { Success: '0', Message: "Password not Saved, please contact Hifive", result: [] } }); }

        res.send({ Response: { Success: "1", Message: "Password Reset successfully!" } })
    } catch (error) {
        console.log(error)
        const stackLines = error.stack.split('\n'); // Split the stack into lines
        const errorLine = stackLines[1]?.trim();
        logger.error(`Route: "${req.originalUrl || req.url}", Error: ${error.message}, ErrorLine: ${errorLine}`);
        res.send({ Response: { Success: "0", Message: "Email not valid, please contact Hifive" } })
    }
});

//booking mailing and whatsapp message
router.post("/send/whatsapp/message", async (req, res) => {
    try {
        let cus = { user_mobile: 919629188839, user_name: "Loganath M", user_email: "logu.nath001@gmail.com" };
        let booking = { booking_id: "TESTBOOKING1", sub_title: "RED TABLE", date: "12-10-2025", time_slot: "11:00 pm to 12:30 pm", total_people: 5 };
        await sendMessage(cus,
            booking,
            "booking"
        );
        logger.success(`Route: "${req.originalUrl || req.url}", ID: 1, Email: logu.nath001@gmail.com, Mobile: 9629188839, Message: Registered`);
        res.send({ Response: { Success: "1", Message: "Success" } })
    } catch (error) {
        console.log(error)
        const stackLines = error.stack.split('\n'); // Split the stack into lines
        const errorLine = stackLines[1]?.trim();
        logger.error(`Route: "${req.originalUrl || req.url}", Error: ${error.message}, ErrorLine: ${errorLine}`);
        return res.status(500).json({ Success: '0', Message: error.message, Result: [] });
    }
});


//Registered only mailing
router.post("/send/mail/message", async (req, res) => {
    try {
        const userEmail = 'logu.nath001@gmail.com'; // User's email
        const userName = 'Loganath m'; // User's name

        console.log('User registered successfully.');
        let registeration_mail = await mailingMessage('Registration', { userName: userName });
        if (registeration_mail != "" && registeration_mail.message && registeration_mail.subject) { //Malling
            await sendEmail(userEmail, userName, registeration_mail.message, registeration_mail.subject);
        }

        logger.success(`Route: "${req.originalUrl || req.url}", userEmail: "${userEmail}", userName: "${userName}",Message: Registered`);
        res.send({ Response: { Success: "1", Message: "Success" } })
    } catch (error) {
        console.log(error)
        const stackLines = error.stack.split('\n'); // Split the stack into lines
        const errorLine = stackLines[1]?.trim();
        logger.error(`Route: "${req.originalUrl || req.url}", Error: ${error.message}, ErrorLine: ${errorLine}`);
        return res.status(500).json({ Success: '0', Message: error.message, Result: [] });
    }
});


export default router;
