import { baseImageUrl, baseVideoUrl, deleteImageUrl, deleteVideoUrl } from '../constants.js';
import { executeQuery} from '../dbHelper.js';
import { encryptData, decryptData } from '../encryption.js'
import { imageValidation } from '../validation.js';
import { format } from 'date-fns'
import { reg, generateToken } from '../helper.js';
import { moveImage, moveVideo, deleteImage, deleteImageByValue, deleteVideoFile } from '../fileHandler.js';

// routes/adminRouter.js
import express from 'express';
const router = express.Router();


// http://localhost:3004/admin/register?name=admin&email=admin@gmail.com&password=password&mobile=9876552369
router.get("/backend/register", async (req, res) => {
    try {
        let name = req.query.name;
        let email = req.query.email;
        let password = req.query.password;
        let phone_number = req.query.mobile;
        const currentdate = new Date();

        if (name == "" || password == "" || email == "" || phone_number == "") {
            return res.send({ Response: { success: '0', message: "Please fill all fields", result: [] } });
        }

        if ((await reg(/^(?:(?:\+|0{0,2})91(\s*|[\-])?|[0]?)?([6789]\d{2}([ -]?)\d{3}([ -]?)\d{4})$/, phone_number))) {
            return res.send({ Response: { success: '0', message: "Invalid Phone number", result: [] } });
        }

        if ((await reg(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, email))) {
            return res.send({ Response: { success: '0', message: "Invalid Email Format", result: [] } });
        }

        const checkEmail = await executeQuery(`select * from admin_users where email = ? `, [email]);
        if (checkEmail.length > 0) { return res.send({ Response: { success: '0', message: "Email Id Already Registered", result: [] } }); }

        const checkName = await executeQuery(`select * from admin_users where name = ? `, [name]);
        if (checkName.length > 0) { return res.send({ Response: { success: '0', message: "Name Already Registered", result: [] } }); }

        const checkPhone = await executeQuery(`select * from admin_users where mobile = ? `, [phone_number]);
        if (checkPhone.length > 0) { return res.send({ Response: { success: '0', message: "Phone number Already Registered", result: [] } }); }

        password = encryptData(password.toString(), false);
        const register = await executeQuery(`insert into admin_users(name,mobile,email,password,created_at)values(?,?,?,?,?)`, [name, phone_number, email, password, currentdate]);
        if (register.length <= 0) { return res.send({ Response: { success: '0', message: "Register unsuccessfully", result: [] } }); }

        let result = [];

        const signin = await executeQuery(`select * from admin_users where email = ? `, [email]);
        if (signin.length <= 0) { return res.send({ Response: { success: '0', message: "Register unsuccessfully", result: [] } }); }
        result.push({ email: email, admin_id: signin[0].id, name: name, mobile: phone_number });
        console.log(result);
        return res.send({ Response: { success: '1', message: "Register Successfully", result: result } });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ success: '0', message: error.message, result: [] });
    }
})


// admin login
router.post("/backend/login/token", async (req, res) => {
    try {
        console.log('login');
        const { uname, pw } = req.body;
        let email = uname;
        let password = pw;

        if (email == "" || password == "") {
            return res.send({ Response: { success: '0', message: "Please fill all fields", result: [] } });
        }

        if ((await reg(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, email))) {
            return res.send({ Response: { success: '0', message: "Invalid Email Format", result: [] } });
        }

        // console.log(req)
        const checkEmail = await executeQuery(`select * from admin_users where email = ? `, [email]);
        if (checkEmail.length <= 0) { return res.send({ Response: { success: '0', message: "Email Not Found", result: [] } }); }

        const qry = ` SELECT * FROM admin_users WHERE email = ? AND password=?`;

        // console.log(req)
        const signin = await executeQuery(`select * from admin_users where email = ? `, [email]);
        if (signin.length <= 0) { return res.send({ Response: { success: '0', message: "Email Not Found", result: [] } }); }

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
            let token = generateToken();

            result.push({ email: email1, admin_id: encryptedData, name: signin[0].name, mobile: signin[0].mobile, token: token });

            return res.send({ Response: { success: '1', message: "Logged in Successfully", result: result } });
        }
        else {
            return res.send({ Response: { success: '0', message: "Email or Password Not Registered", result: [] } });
        }
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ success: '0', message: error.message, result: [] });
    }
})

//admin reservation list 
router.get("/backend/reservation/list", async (req, res) => {
    let sql = `select * from reservation order by reser_id ASC`

    const exesqlquery = await executeQuery(sql)

    if (exesqlquery.length > 0) {

        const firstimgurl = baseImageUrl;
        const Arrayimgurl = baseImageUrl;

        const result = exesqlquery.map((item) => {
            const extraImages = (item.extra_img != "" && item.extra_img != null) ? JSON.parse(item.extra_img).map(imageName => Arrayimgurl + imageName) : [];

            return {
                reser_id: item.reser_id,
                reser_title: item.reser_title,
                reser_main_title: item.reser_main_title,
                reser_image: firstimgurl + item.reser_image,
                description: item.description,
                extra_img: extraImages,
                status: item.status,
                created_at: item.created_at,
                updated_at: item.updated_at,
            };
        });
        const response = { Response: { Success: "1", message: "Success", result: result } };
        return res.json(response);
    }
    else {
        const response = { Response: { Success: "0", message: "No Records!", } };
        return res.json(response);
    }
})


router.get("/backend/reservation/get/:id", async (req, res) => {
    const { id } = req.params;
    let sql = `select * from reservation where reser_id=${id}`
    const exesqlquery = await executeQuery(sql)

    if (exesqlquery.length > 0) {

        const firstimgurl = baseImageUrl;
        const Arrayimgurl = baseImageUrl;

        const result = exesqlquery.map((item) => {
            const extraImages = (item.extra_img != "" && item.extra_img != null) ? JSON.parse(item.extra_img).map(imageName => Arrayimgurl + imageName) : [];

            return {
                reser_id: item.reser_id,
                reser_title: item.reser_title,
                reser_video: (item.reser_videos != "" && item.reser_videos != null) ? baseVideoUrl + item.reser_videos : null,
                reser_main_title: item.reser_main_title,
                reser_image: (item.reser_image != "" && item.reser_image != null) ? firstimgurl + item.reser_image : "",
                description: item.description,
                extra_img: extraImages,
                status: item.status,
                created_at: item.created_at,
                updated_at: item.updated_at,
            };
        });
        let response = { Response: { Success: "1", message: "Success", result: result } };
        return res.json(response);
    }
    else {
        let response = { Response: { Success: "0", message: "No Records!", result: [] } };
        return res.json(response);
    }
})

//admin reservation add 
router.post("/backend/reservation/add", async (req, res) => {
    try {
        // console.log(req.files);
        const { reser_title, reser_main_title, description, status } = req.body;
        const reser_img = req.files && req.files.reser_img ? req.files.reser_img : null;
        const video = req.files && req.files.video ? req.files.video : null
        const extra_imgs = req.files && req.files.img ? (Array.isArray(req.files.img) ? req.files.img : [req.files.img]) : [];
        // console.log(reser_img);
        // console.log(video);
        console.log(extra_imgs);
        // Validate required fields
        if (!reser_title || !reser_main_title) { return res.json({ Response: { Success: '0', message: "Reservation title and main title are required!" } }); }
        if (!reser_img) { return res.json({ Response: { Success: '0', message: "Reservation image is required!" } }); }
        await imageValidation(reser_img);
        // Move and handle main image
        const imageUrl = await moveImage(reser_img);
        console.log("imageUrl");
        console.log(imageUrl);
        // Move and handle extra images
        let imges = null;
        if (extra_imgs.length > 0) {
            const uploadedFiles = await Promise.all(extra_imgs.map(moveImage));
            imges = JSON.stringify(uploadedFiles);
        }
        console.log("imges");
        console.log(imges);

        let videoUrl = null;
        if (video != null && video != "") { videoUrl = await moveVideo(video); }
        const formattedDate = new Date();
        // Insert data into MySQL table
        const insert_sql = `INSERT INTO reservation (reser_title,reser_main_title, reser_image, description, extra_img,reser_videos, status, created_at) VALUES (?, ?, ?, ?, ?,?,?,?)`;
        const insert_sqlValues = [reser_title, reser_main_title, imageUrl, description, imges, videoUrl, status, formattedDate];
        const insert = await executeQuery(insert_sql, insert_sqlValues);
        if ((!insert.insertId || insert.insertId == null)) { return res.send({ Response: { Success: '0', message: "Reservation category added Unsuccessfully!", result: [] } }); }
        return res.send({ Response: { Success: '1', message: "Reservation category added successfully!", result: [] } });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ Response: { Success: '0', message: error.message } });
    }
});


//admin reservation update 
router.post("/backend/reservation/update", async (req, res) => {
    try {
        const { id, reser_title, reser_main_title, description, status } = req.body;

        const reser_img = req.files && req.files.reser_img ? req.files.reser_img : null;
        const video = req.files && req.files.video ? req.files.video : null
        const extra_imgs = req.files && req.files.img ? (Array.isArray(req.files.img) ? req.files.img : [req.files.img]) : [];

        let deleteImgs = (req.body.deleteImgs) ? (typeof req.body.deleteImgs === 'string') ? [req.body.deleteImgs] : req.body.deleteImgs : [];
        let deleteVideo = (req.body.deleteVideo) ? (typeof req.body.deleteVideo === 'string') ? [req.body.deleteVideo] : req.body.deleteVideo : [];

        const res_rec = await executeQuery(`select * from reservation where reser_id=${id}`)
        if (res_rec.length <= 0) { return res.json({ Response: { Success: '0', message: "Reservation Record Not Found" } }); }
        // Validate required fields
        if (!reser_title || !reser_main_title) { return res.json({ Response: { Success: '0', message: "Reservation title and main title are required!" } }); }

        let imageUrl = res_rec[0].reser_image;
        if (reser_img != null && reser_img != "") {
            await deleteImage("reservation", "reser_id", id, "reser_image");
            await imageValidation(reser_img);
            imageUrl = await moveImage(reser_img);
        }

        let imges = JSON.parse(res_rec[0].extra_img);
        if (deleteImgs?.length > 0) {
            for (const element of deleteImgs) {
                imges = imges.filter(item => item !== element);
                await deleteImageByValue("reservation", "reser_id", id, "extra_img", element);
            }
        }
        if (extra_imgs.length > 0) {
            let uploadedFiles = await Promise.all(extra_imgs.map(moveImage));
            let imges1 = uploadedFiles;
            imges = [...imges, ...imges1];
        }
        imges = JSON.stringify(imges);

        let videoUrl = res_rec[0].reser_videos;
        if (deleteVideo?.length > 0) {
            await deleteVideoFile("reservation", "reser_id", id, "reser_videos");
            videoUrl = ''
        }
        if (video != null && video != "") {
            await deleteVideoFile("reservation", "reser_id", id, "reser_videos");
            videoUrl = await moveVideo(video);
        }
        const formattedDate = new Date();
        const update_sql = `UPDATE reservation SET reser_title = ?, reser_main_title = ?, reser_image = ?, description = ?, extra_img = ?, reser_videos = ?,  status=?, updated_at = ? WHERE reser_id = ?`
        const update_sqlValues = [reser_title, reser_main_title, imageUrl, description, imges, videoUrl, status, formattedDate, id];
        const update = await executeQuery(update_sql, update_sqlValues);
        if ((update.changedRows == 1)) {
            return res.send({ Response: { Success: '1', message: "Reservation category Updated successfully!", result: [] } });
        }
        return res.send({ Response: { Success: '0', message: "Reservation category Updated Unsuccessfully!", result: [] } });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ Response: { Success: '0', message: error.message } });
    }
});

router.get("/backend/reservation/delete/:id", async (req, res) => {
    const { id } = req.params;
    let sql = `select * from reservation where reser_id=${id}`
    const deletingRecord = await executeQuery(sql)
    if (deletingRecord.length <= 0) {
        let response = { Response: { Success: "0", message: "No Records found!", result: [] } };
        return res.json(response);
    }

    let reser_image = deletingRecord[0].reser_image;
    let extra_img = deletingRecord[0].extra_img;
    let reser_video = deletingRecord[0].reser_videos;

    console.log(reser_image);
    console.log(extra_img);
    console.log(reser_video);

    if (reser_image != "" && reser_image != null) {
        await deleteImage("reservation", "reser_id", id, "reser_image");
    }

    if (extra_img != "" && extra_img != null) {
        let imges = JSON.parse(extra_img);
        for (const element of imges) {
            await deleteImageByValue("reservation", "reser_id", id, "reser_videos", element);
        }
    }

    if (reser_video != "" && reser_video != null) {
        await deleteVideoFile("reservation", "reser_id", id, "reser_videos");
    }

    const deleting = await executeQuery(`delete from reservation where reser_id=${id}`)
    // console.log(deleting);
    if (deleting?.affectedRows == 1) {
        return res.json({ Response: { Success: "1", message: "Success" } });
    } else {
        return res.json({ Response: { Success: "0", message: "Error" } });
    }
})

router.get("/backend/reservation/select", async (req, res) => {
    const exesqlquery = await executeQuery(`select * from reservation where status="Active" order by reser_id ASC`)
    let result = [];
    if (exesqlquery.length > 0) {
        exesqlquery.map((item) => {
            result.push({ reser_id: item.reser_id, reser_title: item.reser_main_title + "-" + item.reser_title })
        });
        const response = { Response: { Success: "1", message: "Success", result: result } };
        return res.json(response);
    }
    else {
        const response = { Response: { Success: "0", message: "No Records!", result: [] } };
        return res.json(response);
    }
})


//admin reservation catgeory list 
router.get("/backend/reservation/category/list", async (req, res) => {
    let sql = `select reservation_category.*, reservation.reser_main_title as reser_title from reservation_category LEFT JOIN reservation ON reservation.reser_id = reservation_category.reser_id order by reservation_category.cat_id ASC`

    const exesqlquery = await executeQuery(sql)

    if (exesqlquery.length > 0) {

        const result = exesqlquery.map((item) => {

            return {
                cat_id: item.cat_id,
                cat_title: item.cat_title,
                cat_image: (item.cat_image != "" && item.cat_image != null) ? baseImageUrl + item.cat_image : null,
                reser_id: item.reser_id,
                reser_title: item.reser_title,
                price_range: item.price_range,
                status: item.status,
                created_at: item.created_at,
                updated_at: item.updated_at,
            };
        });
        const response = { Response: { Success: "1", message: "Success", result: result } };
        return res.json(response);
    }
    else {
        const response = { Response: { Success: "0", message: "No Records!", } };
        return res.json(response);
    }
})


router.get("/backend/reservation/category/get/:id", async (req, res) => {
    const { id } = req.params;
    let sql = `select reservation_category.*, reservation.reser_title as reser_title from reservation_category LEFT JOIN reservation ON reservation.reser_id = reservation_category.reser_id where reservation_category.cat_id=${id}`
    const exesqlquery = await executeQuery(sql)

    if (exesqlquery.length > 0) {

        const result = exesqlquery.map((item) => {
            return {
                cat_id: item.cat_id,
                cat_title: item.cat_title,
                cat_image: (item.cat_image != "" && item.cat_image != null) ? baseImageUrl + item.cat_image : null,
                reser_id: item.reser_id,
                price_range: item.price_range,
                status: item.status,
                created_at: item.created_at,
                updated_at: item.updated_at,
            };
        });
        let response = { Response: { Success: "1", message: "Success", result: result } };
        return res.json(response);
    }
    else {
        let response = { Response: { Success: "0", message: "No Records!", result: [] } };
        return res.json(response);
    }
})

//admin reservation add 
router.post("/backend/reservation/category/add", async (req, res) => {
    try {
        // console.log(req.files);
        const { cat_title, reser_id, price_range, status } = req.body;
        const cat_image = req.files ? req.files.cat_image : null;

        if (!cat_title || !price_range || !reser_id) { return res.json({ Response: { Success: '0', message: "Reservation category title and price_range are required!" } }); }
        if (!cat_image) { return res.json({ Response: { Success: '0', message: "Reservation category image is required!" } }); }

        await imageValidation(cat_image);
        const imageUrl = await moveImage(cat_image);
        console.log("imageUrl");
        console.log(imageUrl);
        const formattedDate = new Date();

        const insert_sql = `INSERT INTO reservation_category (cat_title, reser_id, cat_image, price_range, status, created_at) VALUES (?, ?, ?, ?, ?,?)`;
        const insert_sqlValues = [cat_title, reser_id, imageUrl, price_range, status, formattedDate];
        const insert = await executeQuery(insert_sql, insert_sqlValues);
        if ((!insert.insertId || insert.insertId == null)) { return res.send({ Response: { Success: '0', message: "Reservation category added Unsuccessfully!", result: [] } }); }
        return res.send({ Response: { Success: '1', message: "Reservation category added successfully!", result: [] } });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ Response: { Success: '0', message: error.message } });
    }
});


//admin reservation update 
router.post("/backend/reservation/category/update", async (req, res) => {
    try {
        const { id, cat_title, reser_id, price_range, status } = req.body;

        const cat_image = req.files && req.files.cat_image ? req.files.cat_image : null;

        const res_rec = await executeQuery(`select * from reservation_category where cat_id=${id}`)
        if (res_rec.length <= 0) { return res.json({ Response: { Success: '0', message: "Reservation category Record Not Found" } }); }
        // Validate required fields
        if (!cat_title || !price_range) { return res.json({ Response: { Success: '0', message: "Reservation category title and price_range are required!" } }); }

        let imageUrl = res_rec[0].cat_image;
        if (cat_image != null && cat_image != "") {
            await deleteImage("reservation_category", "cat_id", id, "cat_image");
            await imageValidation(cat_image);
            imageUrl = await moveImage(cat_image);
        }

        const formattedDate = new Date();
        const update_sql = `UPDATE reservation_category SET cat_title = ?, reser_id = ?, cat_image = ?, price_range = ?,  status=?, updated_at = ? WHERE cat_id = ?`
        const update_sqlValues = [cat_title, reser_id, imageUrl, price_range, status, formattedDate, id];
        const update = await executeQuery(update_sql, update_sqlValues);
        if ((update.changedRows == 1)) {
            return res.send({ Response: { Success: '1', message: "Reservation category Updated successfully!", result: [] } });
        }
        return res.send({ Response: { Success: '0', message: "Reservation category Updated Unsuccessfully!", result: [] } });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ Response: { Success: '0', message: error.message } });
    }
});

router.get("/backend/reservation/category/delete/:id", async (req, res) => {
    const { id } = req.params;
    let sql = `select * from reservation_category where cat_id=${id}`
    const deletingRecord = await executeQuery(sql)
    if (deletingRecord.length <= 0) {
        let response = { Response: { Success: "0", message: "No Records found!", result: [] } };
        return res.json(response);
    }

    let cat_image = deletingRecord[0].cat_image;

    console.log(cat_image);

    if (cat_image != "" && cat_image != null) {
        await deleteImage("reservation_category", "cat_id", id, "cat_image");
    }

    const deleting = await executeQuery(`delete from reservation_category where cat_id=${id}`)
    // console.log(deleting);
    if (deleting?.affectedRows == 1) {
        return res.json({ Response: { Success: "1", message: "Success" } });
    } else {
        return res.json({ Response: { Success: "0", message: "Error" } });
    }
})




//admin reservation list 
router.get("/backend/reservation/subcategory/list", async (req, res) => {

    let sql = `select reservation_sub_category.*, reservation_category.cat_title as cat_title, reservation.reser_main_title as reser_title from reservation_sub_category LEFT JOIN reservation_category ON reservation_sub_category.reser_cat_id = reservation_category.cat_id LEFT JOIN reservation ON reservation.reser_id = reservation_category.reser_id order by reservation_sub_category.reser_sub_id ASC`
    const exesqlquery = await executeQuery(sql)

    if (exesqlquery.length > 0) {

        const firstimgurl = baseImageUrl;

        const result = exesqlquery.map((item) => {
            const extraImages = (item.sub_extra_img != "" && item.sub_extra_img != null) ? JSON.parse(item.sub_extra_img).map(imageName => firstimgurl + imageName) : [];

            return {
                reser_sub_id: item.reser_sub_id,
                sub_tilte: item.sub_tilte,
                reser_cat_id: item.reser_cat_id,
                reser_cat_title: item.cat_title,
                reser_id: item.reser_id,
                reser_title: item.reser_title,
                sub_cat_price_range: item.sub_cat_price_range,
                sub_img: (item.sub_img != "" && item.sub_img != null) ? baseImageUrl + item.sub_img : "",
                description: item.description,
                sub_extra_img: extraImages,
                status: item.status,
                created_at: item.created_at,
                updated_at: item.updated_at,
            };
        });
        const response = { Response: { Success: "1", message: "Success", result: result } };
        return res.json(response);
    }
    else {
        const response = { Response: { Success: "0", message: "No Records!", } };
        return res.json(response);
    }
})


router.get("/backend/reservation/subcategory/get/:id", async (req, res) => {
    const { id } = req.params;
    let sql = `select reservation_sub_category.*, reservation_category.cat_title as cat_title, reservation.reser_main_title as reser_title from reservation_sub_category LEFT JOIN reservation_category ON reservation_sub_category.reser_cat_id = reservation_category.reser_id LEFT JOIN reservation ON reservation.reser_id = reservation_category.reser_id where reser_sub_id=${id}`
    const exesqlquery = await executeQuery(sql)

    if (exesqlquery.length > 0) {

        const firstimgurl = baseImageUrl;
        const Arrayimgurl = baseImageUrl;

        const result = exesqlquery.map((item) => {
            const extraImages = (item.sub_extra_img != "" && item.sub_extra_img != null) ? JSON.parse(item.sub_extra_img).map(imageName => Arrayimgurl + imageName) : [];
            const vegImages = (item.veg_images != "" && item.veg_images != null) ? JSON.parse(item.veg_images).map(imageName => Arrayimgurl + imageName) : [];
            const nonVegImages = (item.nonveg_images != "" && item.nonveg_images != null) ? JSON.parse(item.nonveg_images).map(imageName => Arrayimgurl + imageName) : [];

            return {
                reser_sub_id: item.reser_sub_id,
                sub_tilte: item.sub_tilte,
                reser_cat_id: item.reser_cat_id,
                reser_cat_title: item.cat_title,
                reser_id: item.reser_id,
                reser_title: item.reser_title,
                sub_cat_price_range: item.sub_cat_price_range,
                sub_img: (item.sub_img != "" && item.sub_img != null) ? baseImageUrl + item.sub_img : "",
                sub_extra_img: extraImages,

                veg_images: vegImages,
                nonveg_images: nonVegImages,

                veg_menus: JSON.parse(item.veg_menus),
                nonveg_menus: JSON.parse(item.nonveg_menus),
                cakes: JSON.parse(item.cakes),
                photoPrints: JSON.parse(item.photoPrints),
                photoPrintPrices: JSON.parse(item.photoPrintPrices),
                flowers: JSON.parse(item.flowers),
                flowersPrices: JSON.parse(item.flowersPrices),
                photoShoots: JSON.parse(item.photoShoots),
                photoShootPrices: JSON.parse(item.photoShootPrices),


                status: item.status,
                created_at: item.created_at,
                updated_at: item.updated_at,
            };
        });
        let response = { Response: { Success: "1", message: "Success", result: result } };
        return res.json(response);
    }
    else {
        let response = { Response: { Success: "0", message: "No Records!", result: [] } };
        return res.json(response);
    }
})

//admin reservation add 
router.post("/backend/reservation/subcategory/add", async (req, res) => {
    try {
        // console.log(req.files);
        const { sub_tilte, reser_cat_id, reser_id, sub_cat_price_range, veg_menus, nonveg_menus, cakes, photoShoots, photoShootPrices, photoPrints, photoPrintPrices, flowers, flowersPrices, status } = req.body;
        const sub_img = req.files && req.files.sub_img ? req.files.sub_img : null;
        const extra_imgs = req.files && req.files.img ? (Array.isArray(req.files.img) ? req.files.img : [req.files.img]) : [];
        const veg_images = req.files && req.files.veg_images ? (Array.isArray(req.files.veg_images) ? req.files.veg_images : [req.files.veg_images]) : [];
        const nonveg_images = req.files && req.files.nonveg_images ? (Array.isArray(req.files.nonveg_images) ? req.files.nonveg_images : [req.files.nonveg_images]) : [];
        // console.log(reser_img);
        // console.log(video);
        console.log(extra_imgs);
        // Validate required fields
        if (!sub_tilte || !reser_cat_id || !reser_id || !sub_img || !sub_cat_price_range) { return res.json({ Response: { Success: '0', message: "All Feilds required!" } }); }
        if (!sub_img) { return res.json({ Response: { Success: '0', message: "Reservation subcategory image is required!" } }); }

        if ((reser_id == 1) && (veg_images.length <= 0 && nonveg_images.length <= 0 && veg_menus.length <= 0 && nonveg_menus.length <= 0)) {
            return res.json({ success: '0', message: "veg, Non-veg menus and images required", });
        }

        await imageValidation(sub_img);
        // Move and handle main image
        const imageUrl = await moveImage(sub_img);
        console.log("imageUrl");
        console.log(imageUrl);
        // Move and handle extra images
        let imges = [];
        if (extra_imgs.length > 0) {
            const uploadedFilesEXt = await Promise.all(extra_imgs.map(moveImage));
            imges = uploadedFilesEXt;
        }
        imges = JSON.stringify(imges);
        console.log("imges"); console.log(imges);

        let veg_images_imges = [];
        if (veg_images.length > 0) {
            const uploadedFiles = await Promise.all(veg_images.map(moveImage));
            veg_images_imges = uploadedFiles;
        }
        veg_images_imges = JSON.stringify(veg_images_imges);
        console.log("veg_images_imges"); console.log(veg_images_imges);

        let nonveg_images_imges = [];
        if (nonveg_images.length > 0) {
            const uploadedFiles1 = await Promise.all(nonveg_images.map(moveImage));
            nonveg_images_imges = uploadedFiles1;
        }
        nonveg_images_imges = JSON.stringify(nonveg_images_imges);
        console.log("nonveg_images_imges"); console.log(nonveg_images_imges);

        const veg_menus_str = (!veg_menus || veg_menus == "") ? null : JSON.stringify(veg_menus);
        const nonveg_menus_str = (!nonveg_menus || nonveg_menus == "") ? null : JSON.stringify(nonveg_menus);
        const cakes_str = (!cakes || cakes == "") ? null : JSON.stringify(cakes);
        const photoShoots_str = (!photoShoots || photoShoots == "") ? null : JSON.stringify(photoShoots);
        const photoShootPrices_str = (!photoShootPrices || photoShootPrices == "") ? null : JSON.stringify(photoShootPrices);
        const photoPrints_str = (!photoPrints || photoPrints == "") ? null : JSON.stringify(photoPrints);
        const photoPrintPrices_str = (!photoPrintPrices || photoPrintPrices == "") ? null : JSON.stringify(photoPrintPrices);
        const flowers_str = (!flowers || flowers == "") ? null : JSON.stringify(flowers);
        const flowersPrices_str = (!flowersPrices || flowersPrices == "") ? null : SON.stringify(flowersPrices);

        const formattedDate = new Date();

        // Insert data into MySQL table
        const insert_sql = `INSERT INTO reservation_sub_category (sub_tilte, reser_cat_id, reser_id, sub_img,sub_extra_img,veg_images,nonveg_images, sub_cat_price_range,veg_menus,nonveg_menus,cakes, photoShoots, photoShootPrices, photoPrints, photoPrintPrices, flowers, flowersPrices,status,created_at) VALUES (?, ?, ?, ?, ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
        const insert_sqlValues = [sub_tilte, reser_cat_id, reser_id, imageUrl, imges, veg_images_imges, nonveg_images_imges, sub_cat_price_range, veg_menus_str, nonveg_menus_str, cakes_str, photoShoots_str, photoShootPrices_str, photoPrints_str, photoPrintPrices_str, flowers_str, flowersPrices_str, status, formattedDate];

        const insert = await executeQuery(insert_sql, insert_sqlValues);
        if ((!insert.insertId || insert.insertId == null)) { return res.send({ Response: { Success: '0', message: "Reservation Sub category added Unsuccessfully!", result: [] } }); }
        return res.send({ Response: { Success: '1', message: "Reservation Sub category added successfully!", result: [] } });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ Response: { Success: '0', message: error.message } });
    }
});


//admin reservation update 
router.post("/backend/reservation/subcategory/update", async (req, res) => {
    try {
        const { id, sub_tilte, reser_cat_id, reser_id, sub_cat_price_range, veg_menus, nonveg_menus, cakes, photoShoots, photoShootPrices, photoPrints, photoPrintPrices, flowers, flowersPrices, status } = req.body;
        const sub_img = req.files && req.files.sub_img ? req.files.sub_img : null;
        const extra_imgs = req.files && req.files.img ? (Array.isArray(req.files.img) ? req.files.img : [req.files.img]) : [];
        const veg_images = req.files && req.files.veg_images ? (Array.isArray(req.files.veg_images) ? req.files.veg_images : [req.files.veg_images]) : [];
        const nonveg_images = req.files && req.files.nonveg_images ? (Array.isArray(req.files.nonveg_images) ? req.files.nonveg_images : [req.files.nonveg_images]) : [];
        // console.log(reser_img);

        let deleteImgs = (req.body.deleteImgs) ? (typeof req.body.deleteImgs === 'string') ? [req.body.deleteImgs] : req.body.deleteImgs : [];
        let deleteVegImages = (req.body.deleteVegImages) ? (typeof req.body.deleteVegImages === 'string') ? [req.body.deleteVegImages] : req.body.deleteVegImages : [];
        let deleteNonVegImages = (req.body.deleteNonVegImages) ? (typeof req.body.deleteNonVegImages === 'string') ? [req.body.deleteNonVegImages] : req.body.deleteNonVegImages : [];

        const res_rec = await executeQuery(`select * from reservation_sub_category where reser_sub_id=${id}`)
        if (res_rec.length <= 0) { return res.json({ Response: { Success: '0', message: "Reservation sub category Record Not Found" } }); }
        // Validate required fields
        if (!sub_tilte || !reser_cat_id || !reser_id || !sub_cat_price_range) { return res.json({ Response: { Success: '0', message: "All Feilds required!" } }); }

        // if (veg_menus.length <= 0 && nonveg_menus.length <= 0) {
        //     return res.json({ success: '0', message: "veg, Non-veg menus required", });
        // }

        let imageUrl = res_rec[0].sub_img;
        if (sub_img != null && sub_img != "") {
            await deleteImage("reservation_sub_category", "reser_sub_id", id, "sub_img");
            await imageValidation(sub_img);
            imageUrl = await moveImage(sub_img);
        }


        let imges = JSON.parse(res_rec[0].sub_extra_img);
        if (deleteImgs?.length > 0) {
            for (const element of deleteImgs) {
                imges = imges.filter(item => item !== element);
                await deleteImageByValue("reservation_sub_category", "reser_sub_id", id, "sub_extra_img", element);
            }
        }
        if (extra_imgs.length > 0) {
            let uploadedFiles = await Promise.all(extra_imgs.map(moveImage));
            let imges1 = uploadedFiles;
            imges = [...imges, ...imges1];
        }
        imges = JSON.stringify(imges);


        let veg_images_imges = (res_rec[0].veg_images) ? JSON.parse(res_rec[0].veg_images) : [];
        if (deleteVegImages?.length > 0) {
            for (const element of deleteVegImages) {
                veg_images_imges = veg_images_imges.filter(item => item !== element);
                await deleteImageByValue("reservation_sub_category", "reser_sub_id", id, "veg_images", element);
            }
        }
        if (veg_images.length > 0) {
            let uploadedFiles = await Promise.all(veg_images.map(moveImage));
            let veg_images_imges1 = uploadedFiles;
            veg_images_imges = [...veg_images_imges, ...veg_images_imges1];
        }
        veg_images_imges = JSON.stringify(veg_images_imges);



        let nonveg_images_imges = (res_rec[0].nonveg_images) ? JSON.parse(res_rec[0].nonveg_images) : [];
        if (deleteNonVegImages?.length > 0) {
            for (const element of deleteNonVegImages) {
                nonveg_images_imges = nonveg_images_imges.filter(item => item !== element);
                await deleteImageByValue("reservation_sub_category", "reser_sub_id", id, "nonveg_images", element);
            }
        }
        if (nonveg_images.length > 0) {
            let uploadedFiles = await Promise.all(nonveg_images.map(moveImage));
            let nonveg_images_imges1 = uploadedFiles;
            nonveg_images_imges = [...nonveg_images_imges, ...nonveg_images_imges1];
        }
        nonveg_images_imges = JSON.stringify(nonveg_images_imges);

        //vegmenu and nonmenu stringify
        const veg_menus_str = (!veg_menus || veg_menus == "") ? null : JSON.stringify(veg_menus);
        const nonveg_menus_str = (!nonveg_menus || nonveg_menus == "") ? null : JSON.stringify(nonveg_menus);
        const cakes_str = (!cakes || cakes == "") ? null : JSON.stringify(cakes);
        const photoShoots_str = (!photoShoots || photoShoots == "") ? null : JSON.stringify(photoShoots);
        const photoShootPrices_str = (!photoShootPrices || photoShootPrices == "") ? null : JSON.stringify(photoShootPrices);
        const photoPrints_str = (!photoPrints || photoPrints == "") ? null : JSON.stringify(photoPrints);
        const photoPrintPrices_str = (!photoPrintPrices || photoPrintPrices == "") ? null : JSON.stringify(photoPrintPrices);
        const flowers_str = (!flowers || flowers == "") ? null : JSON.stringify(flowers);
        const flowersPrices_str = (!flowersPrices || flowersPrices == "") ? null : SON.stringify(flowersPrices);

        const formattedDate = new Date();
        const update_sql = `UPDATE reservation_sub_category SET sub_tilte=?, reser_cat_id=?, reser_id=?, sub_img=?,sub_extra_img=?,veg_images=?,nonveg_images=?, sub_cat_price_range=?,veg_menus=?,nonveg_menus=?, cakes=?, photoShoots=?, photoShootPrices=?, photoPrints=?, photoPrintPrices=?, flowers=?, flowersPrices=?, status=?, updated_at = ? WHERE reser_sub_id = ?`;
        const update_sqlValues = [sub_tilte, reser_cat_id, reser_id, imageUrl, imges, veg_images_imges, nonveg_images_imges, sub_cat_price_range, veg_menus_str, nonveg_menus_str, cakes_str, photoShoots_str, photoShootPrices_str, photoPrints_str, photoPrintPrices_str, flowers_str, flowersPrices_str, status, formattedDate, id];
        const update = await executeQuery(update_sql, update_sqlValues);
        if ((update.changedRows == 1)) {
            return res.send({ Response: { Success: '1', message: "Reservation sub category Updated successfully!", result: [] } });
        }
        return res.send({ Response: { Success: '0', message: "Reservation sub category Updated Unsuccessfully!", result: [] } });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ Response: { Success: '0', message: error.message } });
    }
});

router.get("/backend/reservation/subcategory/delete/:id", async (req, res) => {
    const { id } = req.params;
    let sql = `select * from reservation_sub_category where reser_sub_id=${id}`
    const deletingRecord = await executeQuery(sql)
    if (deletingRecord.length <= 0) {
        let response = { Response: { Success: "0", message: "No Records found!", result: [] } };
        return res.json(response);
    }

    let sub_image = deletingRecord[0].sub_img;
    let extra_img = deletingRecord[0].sub_extra_img;
    let veg_images = deletingRecord[0].veg_images;
    let nonveg_images = deletingRecord[0].nonveg_images;

    console.log(sub_image);
    console.log(extra_img);

    if (sub_image != "" && sub_image != null) {
        await deleteImage("reservation_sub_category", "reser_sub_id", id, "sub_img");
    }

    if (extra_img != "" && extra_img != null) {
        let imges = JSON.parse(extra_img);
        for (const element of imges) {
            await deleteImageByValue("reservation_sub_category", "reser_sub_id", id, "sub_extra_img", element);
        }
    }

    if (veg_images != "" && veg_images != null) {
        let veg_images_imges = JSON.parse(veg_images);
        for (const element of veg_images_imges) {
            await deleteImageByValue("reservation_sub_category", "reser_sub_id", id, "veg_images", element);
        }
    }

    if (nonveg_images != "" && nonveg_images != null) {
        let nonveg_images_imges = JSON.parse(nonveg_images);
        for (const element of nonveg_images_imges) {
            await deleteImageByValue("reservation_sub_category", "reser_sub_id", id, "nonveg_images", element);
        }
    }

    const deleting = await executeQuery(`delete from reservation_sub_category where reser_sub_id=${id}`)
    // console.log(deleting);
    if (deleting?.affectedRows == 1) {
        return res.json({ Response: { Success: "1", message: "Success" } });
    } else {
        return res.json({ Response: { Success: "0", message: "Error" } });
    }
})


router.get("/backend/category/select/:reser_id", async (req, res) => {
    const { reser_id } = req.params;

    let sql = `select * from reservation_category where status="Active" order by cat_id ASC`;
    if (reser_id) {
        sql = `select * from reservation_category where status="Active" and reser_id=${reser_id} order by cat_id ASC`;
    }

    const exesqlquery = await executeQuery(sql)
    let result = [];
    if (exesqlquery.length > 0) {
        exesqlquery.map((item) => {
            result.push({ cat_id: item.cat_id, cat_title: item.cat_title })
        });
        const response = { Response: { Success: "1", message: "Success", result: result } };
        return res.json(response);
    }
    else {
        const response = { Response: { Success: "0", message: "No Records!", result: [] } };
        return res.json(response);
    }
})


export default router;
