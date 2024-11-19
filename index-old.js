// const express = require("express")
// const cors = require("cors")
// const bodyParser = require("body-parser")
// const mysql = require("mysql")
// const path = require("path")
// const fileupload = require("express-fileupload")
// const { Console } = require("console")
// const Razorpay = require('razorpay');
// const { format } = require('date-fns');

import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import mysql from 'mysql'
import path from 'path'
import fileupload from 'express-fileupload'
import { Console } from 'console'
import Razorpay from 'razorpay'
import { format } from 'date-fns'
import dotenv from 'dotenv'
import fs from 'fs'

// const express = require("express")
// const cors = require("cors")
// const bodyParser = require("body-parser")
// const mysql = require("mysql")
// const path = require("path")
// const fileupload = require("express-fileupload")
// const { Console } = require("console")
// const Razorpay = require('razorpay');
// const { format } = require('date-fns');
import { encryptData, decryptData } from './encryption.js'
// import clientsRoute from './clients.js'

const app = express()

import CryptoJS from 'crypto-js';
import jwt from 'jsonwebtoken';

// Use the imported routes
// app.use('/clients', clientsRoute);

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(fileupload())
dotenv.config()
app.use("/" + process.env.UPLOAD_IMAGE_DIR, express.static(process.env.UPLOAD_IMAGE_DIR));
app.use("/" + process.env.UPLOAD_VIDEO_DIR, express.static(process.env.UPLOAD_VIDEO_DIR));

const con = mysql.createConnection({
    host: process.env.DBHOST,
    port: process.env.DBPORT,
    user: process.env.DBUSER,
    password: process.env.DBPASSWORD,
    database: process.env.DBNAME,
});

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});
const baseImageUrl = process.env.NODE_APP_API_URL + "/" + process.env.UPLOAD_IMAGE_DIR + "/";
const deleteImageUrl = process.env.UPLOAD_IMAGE_DIR + "\\";
const baseVideoUrl = process.env.NODE_APP_API_URL + "/" + process.env.UPLOAD_VIDEO_DIR + "/";
const deleteVideoUrl = process.env.UPLOAD_VIDEO_DIR + "\\";

con.connect((err) => {
    if (err) { console.error("Error connecting to database:", err.stack); return; }
    console.log("Connected to database");
});

app.get("/test", (req, res) => {
    console.log("Connected to database");
    res.send("success");
})

// http://localhost:3004/admin/register?name=admin&email=admin@gmail.com&password=password&mobile=9876552369
app.get("/admin/register", async (req, res) => {
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
app.post("/admin/login/token", async (req, res) => {
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
app.get("/admin/reservation/list", async (req, res) => {
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


app.get("/admin/reservation/get/:id", async (req, res) => {
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
app.post("/admin/reservation/add", async (req, res) => {
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
app.post("/admin/reservation/update", async (req, res) => {
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

app.get("/admin/reservation/delete/:id", async (req, res) => {
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

app.get("/admin/reservation/select", async (req, res) => {
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
app.get("/admin/reservation/category/list", async (req, res) => {
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


app.get("/admin/reservation/category/get/:id", async (req, res) => {
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
app.post("/admin/reservation/category/add", async (req, res) => {
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
app.post("/admin/reservation/category/update", async (req, res) => {
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

app.get("/admin/reservation/category/delete/:id", async (req, res) => {
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
app.get("/admin/reservation/subcategory/list", async (req, res) => {

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


app.get("/admin/reservation/subcategory/get/:id", async (req, res) => {
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
app.post("/admin/reservation/subcategory/add", async (req, res) => {
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

        // if (veg_images.length <= 0 && nonveg_images.length <= 0 && veg_menus.length <= 0 && nonveg_menus.length <= 0) {
        //     return res.json({ success: '0', message: "veg, Non-veg menus and images required", });
        // }

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
app.post("/admin/reservation/subcategory/update", async (req, res) => {
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

app.get("/admin/reservation/subcategory/delete/:id", async (req, res) => {
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


app.get("/admin/category/select/:reser_id", async (req, res) => {
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







// ================================================================================register

app.post('/register', async (req, res) => {
    try {
        const name = req.body.name;
        let password = req.body.password;
        const email = req.body.email;
        const phone_number = req.body.phone;
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


        const checkEmail = await executeQuery(`select * from users where email = ? `, [email]);
        if (checkEmail.length > 0) { return res.send({ Response: { success: '0', message: "Email Id Already Registered", result: [] } }); }

        const checkName = await executeQuery(`select * from users where name = ? `, [name]);
        if (checkName.length > 0) { return res.send({ Response: { success: '0', message: "Name Already Registered", result: [] } }); }

        const checkPhone = await executeQuery(`select * from users where mobile = ? `, [phone_number]);
        if (checkPhone.length > 0) { return res.send({ Response: { success: '0', message: "Phone number Already Registered", result: [] } }); }

        password = encryptData(password.toString(), false);
        const register = await executeQuery(`insert into users(name,mobile,email,password,created_at)values(?,?,?,?,?)`, [name, phone_number, email, password, currentdate]);
        if (register.length <= 0) { return res.send({ Response: { success: '0', message: "Register unsuccessfully", result: [] } }); }

        const signin = await executeQuery(`select * from users where email = ? `, [email]);
        if (signin.length <= 0) { return res.send({ Response: { success: '0', message: "Register unsuccessfully", result: [] } }); }

        let email1 = signin[0].email;
        let result = [];
        const encryptedData = encryptData(signin[0].name + "-" + signin[0].email + "-" + signin[0].id + "-" + signin[0].mobile);
        console.log(encryptedData);

        result.push({ email: email1, user_id: encryptedData, name: signin[0].name, mobile: signin[0].mobile });
        console.log(result);
        return res.send({ Response: { success: '1', message: "Register and Logged in Successfully", result: result } });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ success: '0', message: error.message, result: [] });
    }
})


// =========================================signin=============================================
app.post("/signin", async (req, res) => {
    try {
        let email = req.body.email;
        let password = req.body.password;

        if (password == "" || email == "") {
            return res.send({ Response: { success: '0', message: "Please fill all fields", result: [] } });
        }

        if ((await reg(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, email))) {
            return res.send({ Response: { success: '0', message: "Invalid Email Format", result: [] } });
        }

        // console.log(req)
        const signin = await executeQuery(`select * from users where email = ? `, [email]);
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

            result.push({ email: email1, user_id: encryptedData, name: signin[0].name, mobile: signin[0].mobile });

            return res.send({ Response: { success: '1', message: "Logged in Successfully", result: result } });
        }
        else {
            return res.send({ Response: { success: '0', message: "Email or Password Not Registered", result: [] } });
        }
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ success: '0', message: error.message, Result: [] });
    }

})

//For Admin generate token
const generateToken = () => {
    const data = {
        time: Date(),
    };
    const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(data), process.env.CRY_KEY).toString();
    return jwt.sign({ tkn: ciphertext }, process.env.JWT_SECRET_KEY, { expiresIn: '1d' });
};

async function imageValidation(image) {
    // Validate file extensions
    const allowedExtensions = ["jpg", "jpeg", "png"];
    const filename = image.name;
    const fileExtension = filename.split(".").pop().toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
        throw { Success: '0', message: "Image file type allowed (jpg, jpeg, png)" };
    }
    return true;
}


async function deleteImage(table, record_name, record_id, img_name) {
    // Validate file extensions
    let reser_rcord = await executeQuery(`Select * FROM ${table} WHERE ${record_name} = ?`, [record_id]);
    console.log("deleteImage");
    if (reser_rcord.length > 0) {
        let updateQuery = await executeQuery(`UPDATE ${table} SET ${img_name}=NULL  WHERE ${record_name} = ?`, [record_id]);
        if (updateQuery.changedRows == 1) {
            let filePath = deleteImageUrl + `${reser_rcord[0][img_name]}`
            console.error(filePath);
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error(`Error removing file: ${err}`);
                    return;
                }
                console.log(`File ${filePath} has been successfully removed.`);
                return true;
            });
        }
    }
    return false;
}

async function deleteVideoFile(table, record_name, record_id, video_name) {
    // Validate file extensions
    let reser_rcord = await executeQuery(`Select * FROM ${table} WHERE ${record_name} = ?`, [record_id]);
    console.log("deleteVideoFile");
    if (reser_rcord.length > 0) {
        let updateQuery = await executeQuery(`UPDATE ${table} SET ${video_name}=NULL  WHERE ${record_name} = ?`, [record_id]);
        if (updateQuery.changedRows == 1) {
            let filePath = deleteVideoUrl + `${reser_rcord[0][video_name]}`
            console.error(filePath);
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error(`Error removing file: ${err}`);
                    return;
                }
                console.log(`File ${filePath} has been successfully removed.`);
                return true;
            });
        }
    }
    return false;
}

async function deleteImageByValue(table, record_name, record_id, img_name, img) {
    // Validate file extensions
    let reser_rcord = await executeQuery(`Select * FROM ${table} WHERE ${record_name} = ?`, [record_id]);
    console.log("deleteImageByValue");
    if (reser_rcord.length > 0) {
        let filePath = deleteImageUrl + `${img}`
        console.error(filePath);
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error(`Error removing file: ${err}`);
                return;
            }
            console.log(`File ${filePath} has been successfully removed.`);
            return true;
        });
    }
    return false;
}


async function moveImage(image) {
    console.log(image);
    const timestamp = Date.now();
    // const fileName = `${timestamp}_${image.name}`;
    const fileExtension = image.name.split(".").pop().toLowerCase();

    let randm = Math.floor(Math.random() * 100);

    const fileName = `${timestamp}${randm}.${fileExtension}`;
    const imagePath = path.join(process.env.UPLOAD_IMAGE_DIR, fileName);

    return new Promise((resolve, reject) => {
        image.mv(imagePath, (error) => {
            if (error) {
                console.log(error)
                resolve(null);
            } else {
                resolve(fileName);
            }
        });
    });
}

async function moveVideo(video) {
    console.log(video);
    const timestamp = Date.now();
    // const fileName = `${timestamp}_${image.name}`;
    const fileExtension = video.name.split(".").pop().toLowerCase();

    let randm = Math.floor(Math.random() * 100);

    const fileName = `${timestamp}${randm}.${fileExtension}`;
    const videoPath = path.join(process.env.UPLOAD_VIDEO_DIR, fileName);

    return new Promise((resolve, reject) => {
        video.mv(videoPath, (error) => {
            if (error) {
                console.log(error)
                resolve(null);
            } else {
                resolve(fileName);
            }
        });
    });
}



app.get("/reservation/website/overall/list", async (req, res) => {
    const reser_id = req.query.reser_id
    let sql;
    let objfile = {};
    let Arrayresposne = [];
    if (!reser_id) {
        sql = `select * from reservation where status="1"`
    } else {
        sql = `select * from reservation where status="1" and reser_id=${reser_id}`
    }
    const exesqlquery = await executeQuery(sql)

    if (exesqlquery.length > 0) {

        const videosql = `select * from video where video_status="1" and type="RESERVATION"`
        const executevideoquery = await executeQuery(videosql)
        if (executevideoquery.length > 0) {
            objfile['video'] = baseVideoUrl + executevideoquery[0].video_file;
        }

        const firstimgurl = baseImageUrl;
        const Arrayimgurl = baseImageUrl;

        const result = exesqlquery.map((item) => {
            const extraImages = JSON.parse(item.extra_img).map(imageName => Arrayimgurl + imageName);

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
        objfile['reservation_ilst'] = result;
        Arrayresposne.push(objfile)
        const response = {
            Response: {
                Success: "1",
                message: "Success",
                result: Arrayresposne
            }
        };
        return res.json(response);
    }
    else {
        const response = {
            Response: {
                Success: "0",
                message: "No Records!",
            }
        };
        return res.json(response);
    }
})

app.get("/reservation/subcategory/website/list", async (req, res) => {

    const reser_id = req.query.reser_id;
    const resercat_id = req.query.resercat_id;

    let objfile = {};
    let Arrayresposne = [];

    const sql = `SELECT reser_main_title,cat_title,videos
        FROM reservation
        JOIN reservation_category ON reservation.reser_id = reservation_category.reser_id
        WHERE reservation.status = '1' AND reservation_category.cat_status = '1' AND reservation.reser_id = ${reser_id} AND reservation_category.cat_id=${resercat_id}`

    const executesql = await executeQuery(sql)

    if (executesql.length > 0) {
        objfile['video'] = baseVideoUrl + executesql[0].videos;
        objfile['reser_title'] = executesql[0].reser_main_title;
        objfile['reser_subtitle'] = executesql[0].cat_title;

        let reservationcategorysql = `select * from reservation_sub_category where status="1" and reser_id=${reser_id} AND reser_cat_id=${resercat_id}`
        const executereservationcategorysql = await executeQuery(reservationcategorysql)

        if (executereservationcategorysql.length > 0) {
            const result = executereservationcategorysql.map((item) => {
                const extraImages = JSON.parse(item.sub_extra_img).map(imageName => baseImageUrl + imageName);
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

            const response = { Response: { Success: "1", message: "Success", result: Arrayresposne } }
            res.send(response)

        } else {
            const response = { Response: { Success: "0", message: "No Records!", } };
            return res.json(response);
        }
    }
    else {
        const response = { Response: { Success: "0", message: "No Records!", } };
        return res.json(response);
    }
})


app.post("/video/add/api", async (req, res) => {
    const catid = req.body.cat_id;
    const type = req.body.type;
    if (!catid) {
        return res.json({
            Response: {
                success: '0',
                message: "category Id required!"
            }
        });
    }

    if (!type) {
        return res.json({
            Response: {
                success: '0',
                message: "type required!"
            }
        });
    }

    let videofile;
    if (req.files && req.files.media) {
        try {
            const video = req.files.media;
            const timestamp = Date.now();
            const fileName = `${timestamp}`;
            // const fileName = `${timestamp}_${video.name}`;
            const imagePath = path.join(__dirname, process.env.UPLOAD_VIDEO_DIR, fileName);
            await video.mv(imagePath); // Move the new image
            videofile = fileName;
        } catch (error) {
            console.error("Error uploading file:", error);
            return res.json({
                Response: {
                    success: '0',
                    message: "Error uploading file."
                }
            });
        }
    }

    const formatdate = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const sql = `INSERT INTO video (video_file, category_id,type, created_at) VALUES (?, ?, ?,?)`;
    con.query(sql, [videofile, catid, type, formatdate], (error, result) => {
        if (error) {
            console.error("Error inserting into database:", error);
            return res.json({
                Response: {
                    success: '0',
                    message: "Error adding video."
                }
            });
        } else {
            return res.json({
                Response: {
                    success: '1',
                    message: "Video added successfully!"
                }
            });
        }
    });
});



//gallery add category api 


app.post("/gallery/category/add", async (req, res) => {
    const gallery_title = req.body.gallery_title;
    const gallery_img = req.files ? req.files.gallery_img : ""

    if (!gallery_title) {
        return res.send({
            success: '0',
            message: "gallery_title required!",
        });
    }
    if (!gallery_img && req.files.gallery_img) {
        return res.send({
            success: '0',
            message: "gallery_img required!",
        });
    }
    const filename = gallery_img.name;
    const fileExtension = filename.split(".").pop().toLowerCase();
    const allowedExtensions = ["jpg", "jpeg", "png"];

    if (!allowedExtensions.includes(fileExtension)) {
        const response = {
            Response: {
                Success: "0",
                Message: "File type not supported.",

            }
        };
        return res.json(response);
    }
    const currentDate = new Date();
    const timestamp = currentDate.getTime();
    const imageUrl = timestamp;
    console.log(imageUrl)

    const imagePath = path.join(
        __dirname,
        "./", process.env.UPLOAD_IMAGE_DIR,
        imageUrl);

    gallery_img.mv(imagePath, (error) => {
        if (error) {
            const response = {
                Response: {
                    Success: "0",
                    Message: "Error uploading image.",

                }
            };
            return res.json(response)
        }
    })

    const formattedDate = new Date()
    const sql = `INSERT INTO gallery_category (gallery_title,gallery_img,created_at) VALUES (?,?,?)`;

    const sqlValues = [gallery_title, imageUrl, formattedDate];

    con.query(sql, sqlValues, (error, result) => {
        if (error) {
            const response = {
                Response: {
                    Success: "0",
                    Message: "Error inserting data.",

                }
            };
            return res.json(response);
        } else {
            const response = {
                Response: {
                    Success: "1",
                    Message: "gallery Category added successfully!",

                }
            };
            return res.json(response);
        }
    });
})




//gallery list api for admin panel

app.get("/gallery/category/admin/list", async (req, res) => {
    const gallery_id = req.query.gallery_id
    let sql;
    if (!gallery_id) {
        sql = `select * from gallery_category where status="1"`
    } else {
        sql = `select * from gallery_category where status="1" and gallery_id=${reser_sub_id}`
    }
    const exesqlquery = await executeQuery(sql)
    if (exesqlquery.length > 0) {

        const result = exesqlquery.map((item) => {
            return {
                gallery_id: item.gallery_id,
                gallery_title: item.gallery_title,
                gallery_img: (baseImageUrl + item.gallery_img),
                status: item.status,
                created_at: item.created_at,
                updated_at: item.updated_at,
            };
        });
        const response = {
            Response: {
                Success: "1",
                message: "Success",
                result: result
            }
        };
        return res.json(response);
    }
    else {
        const response = {
            Response: {
                Success: "0",
                message: "No Records!",
            }
        };
        return res.json(response);
    }

})







//admin panel gallery category update api 

app.post("/gallery/category/update/api", async (req, res) => {
    try {
        const id = req.body.gallery_id;
        if (!id) {
            return res.json({
                success: '0',
                message: "gallery ID required!"
            });
        }

        const sql = `SELECT * FROM gallery_category WHERE status="1" AND gallery_id=${id}`;
        con.query(sql, async (error, result) => {
            if (error) {
                return res.json({
                    success: '0',
                    message: error.message
                });
            } else {
                if (result.length === 0) {
                    return res.json({
                        success: '0',
                        message: "gallery not found."
                    });
                }

                // Extract existing data
                const existingData = result[0];


                const { gallery_title, status } = req.body;
                let gallery_img = existingData.gallery_img;


                if (req.files && req.files.gallery_img) {
                    const reserImg = req.files.gallery_img;
                    const timestamp = Date.now();
                    // const fileName = `${timestamp}_${reserImg.name}`;
                    const fileName = `${timestamp}`;
                    const imagePath = path.join(__dirname, process.env.UPLOAD_IMAGE_DIR, fileName);
                    await reserImg.mv(imagePath); // Move the new image
                    gallery_img = fileName; // Update reser_image with the new filename
                }

                // Check if new data is provided, otherwise use existing data
                const updategallery_title = gallery_title || existingData.gallery_title;

                const updatedstatus = status || existingData.status;

                // Update reservation with new or existing data
                const updateSql = `UPDATE gallery_category SET gallery_title=?, gallery_img=?, status=? WHERE gallery_id=?`;
                con.query(updateSql, [updategallery_title, gallery_img, , updatedstatus, id], (updateError, updateResult) => {
                    if (updateError) {
                        return res.json({
                            success: '0',
                            message: updateError.message
                        });
                    } else {
                        return res.json({
                            success: '1',
                            message: "gallery updated successfully!"
                        });
                    }
                });
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: '0',
            message: error.message,
        });
    }
});



//gallery sub category  add api


app.post("/gallery/subcategory/insert/data", async (req, res) => {
    try {
        const { subgallery_title, gallery_cat_id } = req.body;
        const extra_imgs = req.files ? (Array.isArray(req.files.img) ? req.files.img : [req.files.img]) : [];

        // Validate required fields
        if (!subgallery_title) {
            return res.json({
                success: '0',
                message: "subgallery_title required!",
            });
        }

        const uploadedFiles = await Promise.all(extra_imgs.map(moveImage));

        const imges = JSON.stringify(uploadedFiles);



        const formattedDate = new Date();

        // Insert data into MySQL table
        const sql = `INSERT INTO gallery_subcategory (gallery_sub_title,gallery_cat_id,gallery_sub_img, cretaed_at) VALUES (?, ?,?, ?)`;
        const sqlValues = [subgallery_title, gallery_cat_id, imges, formattedDate];

        con.query(sql, sqlValues, (error, result) => {
            if (error) {
                return res.json({
                    success: '0',
                    message: error.message, // Sending only error message
                });
            } else {
                return res.json({
                    success: '1',
                    message: "gallery subcategory added successfully!",
                });
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: '0',
            message: error.message,
        });
    }
});





//gallery sub category list api 

app.get("/gallery/subcategory/get/list", async (req, res) => {
    const gallery_sub_id = req.query.gallery_cat_id
    let sql;
    if (!gallery_sub_id) {
        sql = `select * from gallery_subcategory where status="1"`
    } else {
        sql = `select * from gallery_subcategory where status="1" and gallery_cat_id=${gallery_sub_id}`
    }
    const exesqlquery = await executeQuery(sql)
    if (exesqlquery.length > 0) {
        const result = exesqlquery.map((item) => {
            const extraImages = JSON.parse(item.gallery_sub_img).map(imageName => baseImageUrl + imageName);

            return {
                gallery_sub_id: item.gallery_sub_id,
                gallery_sub_title: item.gallery_sub_title,
                gallery_cat_id: item.gallery_cat_id,
                gallery_sub_img: extraImages,
                status: item.status,
                created_at: item.created_at,
                updated_at: item.updated_at,
            };
        });
        const response = {
            Response: {
                Success: "1",
                message: "Success",
                result: result
            }
        };
        return res.json(response);
    }
    else {
        const response = {
            Response: {
                Success: "0",
                message: "No Records!",
            }
        };
        return res.json(response);
    }

})

async function executeQuery(query, values) {
    return new Promise((resolve, reject) => {
        con.query(query, values, (error, result) => {
            if (error) {
                reject(error);
            } else {
                resolve(result);
            }
        });
    });
}




//menu category add api

app.post("/menu/category/insert/data", async (req, res) => {
    try {
        const { menu_title } = req.body;

        // Validate required fields
        if (!menu_title) {
            return res.send({
                success: '0',
                message: "menu_title required!",
            });
        }

        const formattedDate = new Date();

        // Insert data into MySQL table
        const sql = `INSERT INTO manu_category (menu_title, created_at) VALUES (?, ?)`;
        const sqlValues = [menu_title, formattedDate];

        con.query(sql, sqlValues, (error, result) => {
            if (error) {
                return res.json({
                    success: '0',
                    message: error.message, // Sending only error message
                });
            } else {
                return res.json({
                    success: '1',
                    message: "Menu added!",
                });
            }
        });
    } catch (error) {
        return res.status(200).json({
            success: '0',
            message: error.message,
        });
    }
});




//MENU CATEGORY LIST API WEBSITE AND PANEL

app.get("/menu/category/get/list", async (req, res) => {
    const menu_id = req.query.menu_id
    let sql;
    if (!menu_id) {
        sql = `select * from manu_category where menu_status="1" AND menu_cat_type='C' `
    } else {
        sql = `select * from manu_category where menu_status="1" AND menu_cat_type='C' and menu_id=${menu_id} `
    }
    const exesqlquery = await executeQuery(sql)
    if (exesqlquery.length > 0) {
        const result = exesqlquery.map((item) => {
            return {
                menu_id: item.menu_id,
                menu_title: item.menu_title,
                menu_type: item.menu_type,
                status: item.menu_status,
                created_at: item.created_at,
                updated_at: item.updated_at,
            };
        })

        const response = {
            Response: {
                Success: "1",
                message: "Success",
                result: result
            }
        };
        return res.json(response);
    }
    else {
        const response = {
            Response: {
                Success: "0",
                message: "No Records!",
            }
        };
        return res.json(response);
    }

})





app.post("/menuitem/add", async (req, res) => {
    const { menu_catid, menu_type, menu_titile, menu_price, menu_description, discount, final_price } = req.body;
    const item_img = req.files ? req.files.item_img : ""

    if (!menu_catid) {
        return res.send({
            success: '0',
            message: "menu_catid required!",
        });
    }
    if (!menu_type) {
        return res.send({
            success: '0',
            message: "M FOR menu or C for cake Required!",
        });
    }
    if (!menu_titile) {
        return res.send({
            success: '0',
            message: "menu_titile required!",
        });
    }
    if (!menu_price) {
        return res.send({
            success: '0',
            message: "menu_price required!",
        });
    }
    if (!menu_description) {
        return res.send({
            success: '0',
            message: "menu_description required!",
        });
    }

    if (!item_img && req.files.item_img) {
        return res.send({
            success: '0',
            message: "item_img required!",
        });
    }
    const filename = item_img.name;
    const fileExtension = filename.split(".").pop().toLowerCase();
    const allowedExtensions = ["jpg", "jpeg", "png"];

    if (!allowedExtensions.includes(fileExtension)) {
        const response = {
            Response: {
                Success: "0",
                Message: "File type not supported.",

            }
        };
        return res.json(response);
    }
    const currentDate = new Date();
    const timestamp = currentDate.getTime();
    const imageUrl = timestamp;
    console.log(imageUrl)

    const imagePath = path.join(
        __dirname,
        "./", process.env.UPLOAD_IMAGE_DIR,
        imageUrl);

    item_img.mv(imagePath, (error) => {
        if (error) {
            const response = {
                Response: {
                    Success: "0",
                    Message: "Error uploading image.",

                }
            };
            return res.json(response)
        }
    })

    const formattedDate = new Date()
    const sql = `INSERT INTO menu_item(menu_title,menu_img,menu_sub_id,menu_type,menu_cat_type,menu_price,menu_final_price,menu_discount,menu_description,created_at)VALUES(?,?,?,?,?,?,?,?,?,?)`;
    let sqlValues;
    if (menu_type == "M") {
        sqlValues = [menu_titile, imageUrl, menu_catid, menu_type, "S", menu_price, final_price, discount, menu_description, formattedDate];
    } else {
        sqlValues = [menu_titile, imageUrl, menu_catid, menu_type, "S", menu_price, final_price, discount, menu_description, formattedDate];
    }


    con.query(sql, sqlValues, (error, result) => {
        if (error) {
            const response = {
                Response: {
                    Success: "0",
                    Message: error,

                }
            };
            return res.json(response);
        } else {
            const response = {
                Response: {
                    Success: "1",
                    Message: "Menu Item Added!",

                }
            };
            return res.json(response);
        }
    });
})




app.get("/menu/item/list", async (req, res) => {
    const menu_cat_id = req.query.menu_cat_id

    // if (!menu_cat_id) {
    //     return res.send({
    //         success: '0',
    //         message: "menu_cat_id required!",
    //     });
    // }


    let sql = `select * from manu_category where menu_status="1" AND menu_type='M' and  menu_cat_type="S"`

    if (menu_cat_id) {
        sql += ` AND menu_sub_id=${menu_cat_id}`
    }
    const exesqlquery = await executeQuery(sql)
    if (exesqlquery.length > 0) {
        const result = exesqlquery.map((item) => {
            return {
                menu_id: item.menu_id,
                menu_title: item.menu_title,
                menu_type: item.menu_type,
                menu_sub_id: item.menu_sub_id,
                menu_cat_type: item.menu_cat_type,
                menu_price: item.menu_price,
                menu_final_price: item.menu_final_price,
                menu_discount: item.menu_discount,
                menu_discount_type: item.menu_discount_type,
                menu_description: item.menu_description,
                menu_status: item.menu_status,
                menu_img: `${baseImageUrl}/${item.menu_img}`
            };
        })

        const response = {
            Response: {
                Success: "1",
                message: "Success",
                result: result
            }
        };
        return res.json(response);
    }
    else {
        const response = {
            Response: {
                Success: "0",
                message: "No Records!",
            }
        };
        return res.json(response);
    }

})





app.post("/add/to/cart/api", async (req, res) => {
    const { user_id, main_id, main_sub_id, cart_type, denomination, cart_total } = req.body;


    if (!user_id) {
        return res.send({
            success: '0',
            message: "user_id required!",
        });
    }
    if (!main_id) {
        return res.send({
            success: '0',
            message: "main_id Required!",
        });
    }
    if (!main_sub_id) {
        return res.send({
            success: '0',
            message: "main_sub_id required!",
        });
    }
    if (!cart_type) {
        return res.send({
            success: '0',
            message: "M FOR MENU OR C FOR CAKE TYPE REQUIRED!",
        });
    }
    if (!denomination) {
        return res.send({
            success: '0',
            message: "denomination required!",
        });
    }

    if (!cart_total) {
        return res.send({
            success: '0',
            message: "cart_total required!",
        });
    }



    const formattedDate = new Date()
    const sql = `INSERT INTO add_to_cart_menu(cart_user_id,cart_main_id,cart_submain_id,denomination,cart_total,cart_type,created_at)VALUES(?,?,?,?,?,?,?)`;
    let sqlValues;
    if (cart_type == "M") {
        sqlValues = [user_id, main_id, main_sub_id, denomination, cart_total, cart_type, formattedDate];
    } else {
        sqlValues = [user_id, main_id, main_sub_id, denomination, cart_total, cart_type, formattedDate];
    }


    con.query(sql, sqlValues, (error, result) => {
        if (error) {
            const response = {
                Response: {
                    Success: "0",
                    Message: error,

                }
            };
            return res.json(response);
        } else {
            const response = {
                Response: {
                    Success: "1",
                    Message: "Added!",

                }
            };
            return res.json(response);
        }
    });
})



app.post("/add/to/cart/update/api", async (req, res) => {
    const { user_id, main_id, main_sub_id, cart_type, denomination, cart_total, cart_id } = req.body;

    if (!cart_id) {
        return res.send({
            success: '0',
            message: "cart_id required!",
        });
    }

    const checksql = `select * from add_to_cart_menu where menu_booking_order_status="W" AND cart_status="1" AND cart_id=${cart_id}`
    const executecheckquery = await executeQuery(checksql)
    if (executecheckquery.length > 0) {

        if (!main_id) {
            return res.send({
                success: '0',
                message: "main_id Required!",
            });
        }
        if (!main_sub_id) {
            return res.send({
                success: '0',
                message: "main_sub_id required!",
            });
        }
        if (!cart_type) {
            return res.send({
                success: '0',
                message: "M FOR MENU OR C FOR CAKE TYPE REQUIRED!",
            });
        }
        if (!denomination) {
            return res.send({
                success: '0',
                message: "denomination required!",
            });
        }

        if (!cart_total) {
            return res.send({
                success: '0',
                message: "cart_total required!",
            });
        }

        const sql = `update add_to_cart_menu  set cart_user_id =?,cart_main_id=?,cart_submain_id=? ,denomination=?,cart_total=?,cart_type=? where cart_status="1" AND menu_booking_order_status="W" and cart_id=?`;
        let sqlValues;
        if (cart_type == "M") {
            sqlValues = [user_id, main_id, main_sub_id, denomination, cart_total, cart_type, cart_id];
        } else {
            sqlValues = [user_id, main_id, main_sub_id, denomination, cart_total, cart_type, cart_id];
        }


        con.query(sql, sqlValues, (error, result) => {
            if (error) {
                const response = {
                    Response: {
                        Success: "0",
                        Message: error,

                    }
                };
                return res.json(response);
            } else {
                const response = {
                    Response: {
                        Success: "1",
                        Message: "Added!",

                    }
                };
                return res.json(response);
            }
        });

    } else {

        return res.send({
            success: '0',
            message: "Item Not Found",
        });
    }




})


app.post("/add/to/cart/remove/api", async (req, res) => {
    const { cart_id, main_id, main_sub_id, } = req.body;

    if (!cart_id) {
        return res.send({
            success: '0',
            message: "cart_id required!",
        });
    }

    const checksql = `select * from add_to_cart_menu where menu_booking_order_status="W" AND cart_status="1" AND cart_id=${cart_id}`
    const executecheckquery = await executeQuery(checksql)
    if (executecheckquery.length > 0) {

        if (!main_id) {
            return res.send({
                success: '0',
                message: "main_id Required!",
            });
        }
        if (!main_sub_id) {
            return res.send({
                success: '0',
                message: "main_sub_id required!",
            });
        }

        const sql = `delete  from add_to_cart_menu   where cart_status="1" AND menu_booking_order_status="W" and cart_id=? AND cart_main_id=? AND cart_submain_id=?`;
        let sqlValues = [cart_id, main_id, main_sub_id];

        con.query(sql, sqlValues, (error, result) => {
            if (error) {
                const response = {
                    Response: {
                        Success: "0",
                        Message: error,

                    }
                };
                return res.json(response);
            } else {
                const response = {
                    Response: {
                        Success: "1",
                        Message: "Your Cart Removed!",

                    }
                };
                return res.json(response);
            }
        });

    } else {

        return res.send({
            success: '0',
            message: "Item Not Found",
        });
    }




})



// =============================================================


app.post("/booking/api", async (req, res) => {
    const { user_id, order_type, order_date, order_time, usernumber, bill_amt, address, state, pincode, city, bill_charge, final_amt } = req.body;

    const cartids = req.body.cartids ? JSON.parse(req.body.cartids) : []
    if (!order_type) {
        return res.send({
            success: '0',
            message: "P for Pickup or O for Online Delivery",
        });
    }
    if ((order_type == "P") && (!order_date || !order_time || !usernumber || !bill_amt || !cartids || !user_id)) {
        return res.send({
            success: '0',
            message: "Please Provide Pickup Details!",
        });
    }
    if ((order_type == "O") && (!address || !state || !usernumber || !pincode || !city || !bill_charge || !final_amt || !bill_amt || !user_id)) {
        return res.send({
            success: '0',
            message: "Please Provide Order Details!",
        });
    }
    if (Array.isArray(cartids) && cartids.length > 0) {

        const queryCart = (row) => {
            return new Promise((resolve, reject) => {
                const sql = `SELECT count(*) as count FROM add_to_cart_menu where cart_id=${row}  AND menu_booking_order_status="W" AND cart_status="1"`;
                con.query(sql, (err, res) => {
                    const rowCount = res[0].count;
                    resolve(rowCount == 1);
                });
            });
        };
        (async () => {
            let cartcount = 0;
            for (const row of cartids) {
                const isCountValid = await queryCart(row);
                if (isCountValid) {
                    cartcount++;
                }
            }
            if (cartcount == cartids.length) {

                const formattedDate = new Date();
                const cartidJSON = JSON.stringify(cartids);
                let sql;
                let values;
                if (order_type === "P") {
                    const date = new Date(order_date);
                    const formattedDate = date.toISOString().split('T')[0];
                    sql = `insert into  booking_order_cart(booking_order_user_id,booking_order_type,booking_order_date,booking_order_time,booking_contact_number,booking_order_billing_amt,
                    booking_order_cart_ids,booking_order_created_at) values(?,?,?,?,?,?,?,?)`
                    values = [user_id, order_type, date, order_time, usernumber, bill_amt, cartidJSON, formattedDate]
                }
                else if (order_type === "O") {
                    sql = `insert into booking_order_cart(booking_order_user_id,booking_order_type,booking_order_address,booking_order_city,booking_order_state,booking_order_pincode,booking_contact_number,booking_order_billing_amt,booking_order_cart_ids,booking_order_billing_charge,booking_order_final_amt,booking_order_created_at) values(?,?,?,?,?,?,?,?,?,?,?,?)`;
                    values = [user_id, order_type, address, city, state, pincode, usernumber, bill_amt, cartidJSON, bill_charge, final_amt, formattedDate]
                }
                con.query(sql, values, (error, result) => {

                    if (error) {
                        res.send(error);
                    }

                    else {
                        const queryCartupdate = (row) => {
                            return new Promise((resolve, reject) => {
                                const sqlquery = `UPDATE add_to_cart_menu SET menu_booking_order_status="B" WHERE cart_id=? AND menu_booking_order_status="W" AND cart_status="1"`;
                                con.query(sqlquery, [row], (err, result) => {

                                    resolve(result);
                                });
                            });
                        };

                        (async () => {
                            for (const row of cartids) {
                                await queryCartupdate(row);
                            }
                            const response = {
                                Response: {
                                    Success: "1",
                                    Message: "Booking Successfully !",
                                },
                            };
                            res.json(response);
                        })();
                    }
                })
            } else {
                const response = {
                    Response: {
                        Success: "0",
                        Message: "Please Provide Valid Cart Details",
                    },
                };
                res.json(response);
            }
        }
        )
    }
})



app.post("/payment/status", async (req, res) => {
    const costid = req.query.costid;
    const payment = req.query.pstatus;
    const orderid = req.query.rid;
    if (!costid || costid <= 0) {
        const response = {
            Response: {
                Success: "0",
                message: "Please Provide a Valid Id greater than 0!"
            }
        };
        return res.send(response);
    }

    if (!orderid) {
        const response = {
            Response: {
                Success: "0",
                message: "Please Provide Order Id!"
            }
        };
        return res.send(response);
    }

    if (payment === null || (payment !== '1')) {
        const response = {
            Response: {
                Success: "0",
                message: "Please Provide payment Status 0 or 1"
            }
        };
        return res.send(response);
    }

    const sql = `SELECT * FROM booking_order_cart WHERE  booking_order_status="1" AND booking_order_id=${orderid}`;

    con.query(sql, (error, result) => {
        if (error) {
            return res.send(error);
        }

        if (result.length === 0) {
            const response = {
                Response: {
                    Success: "0",
                    message: "Invalid Order Id"
                }
            };
            return res.json(response);
        }
        const tableStatus = result[0].booking_order_payment_status;
        console.log("tableStatus", tableStatus)
        if (tableStatus != "1") {
            const sql2 = `UPDATE booking_order_cart SET booking_order_payment_status=? WHERE booking_order_id
        =${orderid}`;
            con.query(sql2, [payment], (Error, result) => {
                if (Error) {
                    const response = {
                        Response: {
                            Success: "0",
                            message: "Failed to Added!"
                        }
                    };
                    return res.json(response);
                } else {
                    const response = {
                        Response: {
                            Success: "1",
                            message: "Successfully Added"
                        }
                    };
                    return res.json(response);
                }
            });
        } else {
            const response = {
                Response: {
                    Success: "0",
                    message: "already Added!"
                }
            };
            return res.json(response);
        }
    });
})



app.post("/delivery/status", async (req, res) => {
    const delivery_status = req.body.delivery_status;
    const orderid = req.body.rid;
    if (!orderid) {
        const response = {
            Response: {
                Success: "0",
                message: "Please Provide Order Id!"
            }
        };
        return res.send(response);
    }

    if (!delivery_status) {
        const response = {
            Response: {
                Success: "0",
                message: "Please Provide delivery_status 1"
            }
        };
        return res.send(response);
    }
    const sql = `SELECT * FROM booking_order_cart WHERE  booking_order_status="1" AND booking_order_id=${orderid}`;
    con.query(sql, (error, result) => {
        if (error) {
            return res.send(error);
        }

        if (result.length === 0) {
            const response = {
                Response: {
                    Success: "0",
                    message: "Invalid Order Id"
                }
            };
            return res.json(response);
        }
        const tableStatus = result[0].booking_order_delivery_status;
        console.log("tableStatus", tableStatus)
        if (tableStatus != "1") {
            const sql2 = `UPDATE booking_order_cart SET booking_order_delivery_status=? WHERE booking_order_id
        =${orderid}`;
            con.query(sql2, [payment], (Error, result) => {
                if (Error) {
                    const response = {
                        Response: {
                            Success: "0",
                            message: "Failed to Added!"
                        }
                    };
                    return res.json(response);
                } else {
                    const response = {
                        Response: {
                            Success: "1",
                            message: "Delivery Success!"
                        }
                    };
                    return res.json(response);
                }
            });
        } else {
            const response = {
                Response: {
                    Success: "0",
                    message: "already Delivery!"
                }
            };
            return res.json(response);
        }
    });



})


//BOOKING MONTH FORMAT

app.get("/booking/order/list", async (req, res) => {
    try {
        const { month, year, status } = req.query;

        if (!month || !year || !status) {
            const response = {
                Response: {
                    Success: "1",
                    message: "Please provide all details (month, year, status)."
                }
            };
            return res.json(response);
        }

        const sql = `
            SELECT cbo.*, u.name 
            FROM booking_order_cart cbo 
            JOIN users u ON cbo.booking_order_user_id = u.id 
            WHERE cbo.booking_order_status = 1 
            AND cbo.booking_order_approval_status = ? 
            AND MONTH(cbo.booking_order_created_at) = ? 
            AND YEAR(cbo.booking_order_created_at) = ? 
            ORDER BY cbo.booking_order_created_at DESC`;

        con.query(sql, [status, month, year], async (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ success: false, error: 'Database error' });
            }

            if (result.length === 0) {

                const response = {
                    Response: {
                        Success: "0",
                        Message: "Order not found",
                    }
                };
                return res.json(response);
            }

            // Fetch cart details for each order
            const ordersWithCartDetails = await Promise.all(result.map(async (item) => {
                const cartids = JSON.parse(item.booking_order_cart_ids);
                const cartquery = `
                    SELECT * 
                    FROM add_to_cart_menu 
                    WHERE cart_status = 1 
                    AND cart_user_id = ? 
                    AND cart_id IN (?)`;
                const cartDetails = await new Promise((resolve, reject) => {
                    con.query(cartquery, [item.booking_order_user_id, cartids], (error, cartResult) => {
                        if (error) reject(error);
                        resolve(cartResult);
                    });
                });

                // Fetch additional details for each menu item in the cart
                const cartDetailsWithAdditionalInfo = await Promise.all(cartDetails.map(async (cartItem) => {
                    const menuDetailsQuery = `SELECT menu_title, menu_img, menu_price, menu_type, menu_description, menu_discount, menu_final_price  FROM manu_category WHERE menu_type="M" AND menu_id = ?`;
                    const menuDetails = await new Promise((resolve, reject) => {
                        console.log(cartItem.cart_submain_id)
                        con.query(menuDetailsQuery, [cartItem.cart_submain_id], (error, menuResult) => {
                            if (error) reject(error);
                            if (menuResult && menuResult.length > 0) {
                                resolve(menuResult[0]);
                            } else {
                                reject(new Error('Menu details not found'));
                            }
                        });
                    });
                    return { ...cartItem, ...menuDetails };
                }));

                return { ...item, cartDetails: cartDetailsWithAdditionalInfo };
            }));

            const response = {
                Response: {
                    Success: "1",
                    Message: "Success",
                    Result: ordersWithCartDetails
                }
            };
            return res.json(response);


        });
    } catch (error) {
        console.error(error);
        return res.status(200).json({ success: false, error: 'Internal server error' });
    }
});


//BOOKING DATE FORMAT

app.get("/booking/order/list1", async (req, res) => {
    try {
        const { startDate, endDate, status } = req.query;

        if (!startDate || !endDate || !status) {
            const response = {
                Response: {
                    Success: "1",
                    message: "Please provide all details (fromdate, lastdate, status)."
                }
            };
            return res.json(response);
        }

        let query = `SELECT * FROM booking_order_cart WHERE 1=1`;

        if (status && startDate && endDate) {
            endDate = new Date(new Date(endDate).setHours(23, 59, 59, 999)).toISOString();
            query += ` AND booking_order_approval_status='${status}' AND (booking_order_created_at>='${startDate}' AND booking_order_created_at<='${endDate}') ORDER BY booking_order_created_at DESC`;
        } else if (startDate && endDate) {
            endDate = new Date(new Date(endDate).setHours(23, 59, 59, 999)).toISOString();
            query += ` AND (booking_order_created_at>='${startDate}' AND booking_order_created_at<='${endDate}') ORDER BY booking_order_created_at DESC`;
        }


        con.query(query, [status, month, year], async (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ success: false, error: 'Database error' });
            }

            if (result.length === 0) {

                const response = {
                    Response: {
                        Success: "0",
                        Message: "Order not found",
                    }
                };
                return res.json(response);
            }

            // Fetch cart details for each order
            const ordersWithCartDetails = await Promise.all(result.map(async (item) => {
                const cartids = JSON.parse(item.booking_order_cart_ids);
                const cartquery = `
                    SELECT * 
                    FROM add_to_cart_menu 
                    WHERE cart_status = 1 
                    AND cart_user_id = ? 
                    AND cart_id IN (?)`;
                const cartDetails = await new Promise((resolve, reject) => {
                    con.query(cartquery, [item.booking_order_user_id, cartids], (error, cartResult) => {
                        if (error) reject(error);
                        resolve(cartResult);
                    });
                });

                // Fetch additional details for each menu item in the cart
                const cartDetailsWithAdditionalInfo = await Promise.all(cartDetails.map(async (cartItem) => {
                    const menuDetailsQuery = `SELECT menu_title, menu_img, menu_price, menu_type, menu_description, menu_discount, menu_final_price  FROM manu_category WHERE menu_type="M" AND menu_id = ?`;
                    const menuDetails = await new Promise((resolve, reject) => {
                        console.log(cartItem.cart_submain_id)
                        con.query(menuDetailsQuery, [cartItem.cart_submain_id], (error, menuResult) => {
                            if (error) reject(error);
                            if (menuResult && menuResult.length > 0) {
                                resolve(menuResult[0]);
                            } else {
                                reject(new Error('Menu details not found'));
                            }
                        });
                    });
                    return { ...cartItem, ...menuDetails };
                }));

                return { ...item, cartDetails: cartDetailsWithAdditionalInfo };
            }));

            const response = {
                Response: {
                    Success: "1",
                    Message: "Success",
                    Result: ordersWithCartDetails
                }
            };
            return res.json(response);


        });
    } catch (error) {
        console.error(error);
        return res.status(200).json({ success: false, error: 'Internal server error' });
    }
});



app.get("/cart/list/api", async (req, res) => {

    const userid = req.query.userid;

    if (userid) {
        const userquery = `select * from users where status="1" AND  id=${userid}`
        const checkquery = await executeQuery(userquery);
        if (checkquery.length != 1) {
            const response = {
                Response: {
                    Success: "0",
                    message: "Not Vaild User!"
                }
            };
            return res.json(response);
        }
    }


    let catlogquery = `select * from add_to_cart_menu where cart_status="1" AND menu_booking_order_status="W"  AND cart_user_id=${userid}`
    const checkquery2 = await executeQuery(catlogquery);

    let promises = checkquery2.map((row) => {
        return new Promise((resolve, reject) => {

            console.log();

            const sql1 = `SELECT menu_title AS menu_stitle,CONCAT('${baseImageUrl}', menu_img) AS image_url ,menu_type,menu_price,menu_final_price,menu_discount,menu_description FROM manu_category   where  menu_cat_type="S" and menu_id=${row.cart_submain_id};`;
            con.query(sql1, (error, result1) => {
                if (error) {
                    reject(error);
                } else {
                    if (result1 && result1.length > 0) {
                        row.cat = result1[0];
                    }
                    resolve(row);
                }
            });
        })
            .then((row) => {
                return new Promise((resolve, reject) => {
                    const sql2 = `SELECT menu_title  FROM manu_category  where menu_cat_type="C" and menu_id=${row.cart_main_id};`;
                    con.query(sql2, (error, result2) => {
                        if (error) {
                            reject(error);
                        } else {
                            if (result2 && result2.length > 0) {
                                row.item = result2[0];
                            }
                            resolve(row);
                        }
                    });
                });
            })

    });

    const rows = await Promise.all(promises);
    rows.forEach((row) => {
        row.cat = row.cat || {};
        row.item = row.item || {};
        Object.assign(row, row.cat, row.item);
        delete row.cat;
        delete row.item;
    });

    if (checkquery2.length > 0) {
        const sql = `select  sum(cart_total) as all_item_tot from add_to_cart_menu where cart_status="1" AND menu_booking_order_status="W"  AND cart_user_id=${userid}`
        con.query(sql, (err, result) => {
            if (err) {
                console.log(err);
            } else {
                // console.log(result);
                const response = {
                    Response: {
                        Success: "1",
                        message: "Success",
                        Result: rows,
                        all_item_tot: result[0].all_item_tot

                    }
                };
                return res.json(response);
            }
        })

    } else {
        const response = {
            Response: {
                Success: "0",
                Message: "No Records!",

            }
        };
        return res.json(response);
    }

})


//CAKE CATEGORY ADD API

app.post("/cake/category/add", async (req, res) => {
    const cake_title = req.body.cake_title;
    const cake_img = req.files ? req.files.cake_img : ""

    if (!cake_title) {
        return res.send({
            success: '0',
            message: "cake_title required!",
        });
    }
    if (!cake_img && req.files.cake_img) {
        return res.send({
            success: '0',
            message: "cake_img required!",
        });
    }
    const filename = cake_img.name;
    const fileExtension = filename.split(".").pop().toLowerCase();
    const allowedExtensions = ["jpg", "jpeg", "png"];

    if (!allowedExtensions.includes(fileExtension)) {
        const response = {
            Response: {
                Success: "0",
                Message: "File type not supported.",

            }
        };
        return res.json(response);
    }
    const currentDate = new Date();
    const timestamp = currentDate.getTime();
    const imageUrl = timestamp;
    console.log(imageUrl)

    const imagePath = path.join(
        __dirname,
        "./", process.env.UPLOAD_IMAGE_DIR,
        imageUrl);

    cake_img.mv(imagePath, (error) => {
        if (error) {
            const response = {
                Response: {
                    Success: "0",
                    Message: "Error uploading image.",

                }
            };
            return res.json(response)
        }
    })

    const formattedDate = new Date()
    const sql = `INSERT INTO manu_category (menu_title,menu_img,menu_type,created_at) VALUES (?,?,?,?)`;

    const sqlValues = [cake_title, imageUrl, "C", formattedDate];

    con.query(sql, sqlValues, (error, result) => {
        if (error) {
            const response = {
                Response: {
                    Success: "0",
                    Message: "Error inserting data.",

                }
            };
            return res.json(response);
        } else {
            const response = {
                Response: {
                    Success: "1",
                    Message: "Cake Category added successfully!",

                }
            };
            return res.json(response);
        }
    });
})

app.get("/cake/category/get/list", async (req, res) => {
    const cat_id = req.query.cat_id
    let sql;
    if (!cat_id) {
        sql = `select * from manu_category where menu_status="1"  AND menu_type="C" AND menu_cat_type="C"`
    } else {
        sql = `select * from manu_category where menu_status="1" AND menu_type="C" AND menu_cat_type="C"  and menu_id='${cat_id}'`
    }
    const exesqlquery = await executeQuery(sql)
    if (exesqlquery.length > 0) {
        const result = exesqlquery.map((item) => {

            return {
                cake_id: item.menu_id,
                cake_title: item.menu_title,
                cake_img: (baseImageUrl + item.menu_img),
                menu_type: item.menu_type,
                menu_status: item.menu_status,
                created_at: item.created_at,
                updated_at: item.updated_at,
            };
        });
        const response = {
            Response: {
                Success: "1",
                message: "Success",
                result: result
            }
        };
        return res.json(response);
    }
    else {
        const response = {
            Response: {
                Success: "0",
                message: "No Records!",
            }
        };
        return res.json(response);
    }

})



app.get("/cake/subcategory/get/list", async (req, res) => {
    const cake_cat_id = req.query.cake_cat_id;

    if (!cake_cat_id) {
        return res.status(200).json({
            success: '0',
            message: "cake_cat_id is required!",
        });
    }

    try {
        const response = {};

        // Fetch main cake category details
        let sql = `SELECT * FROM manu_category WHERE menu_status="1" AND menu_type="C" AND menu_cat_type="C" AND menu_id=${cake_cat_id}`;
        const mainCategoryResult = await executeQuery(sql);

        if (mainCategoryResult.length > 0) {
            response.cake_category_name = mainCategoryResult[0].menu_title;
            const sub_id = mainCategoryResult[0].menu_id;

            // Fetch cake subcategories
            let cakesubsql = `SELECT menu_id, menu_title, CONCAT('${baseImageUrl}', menu_img) AS image_url, menu_sub_id, menu_type, menu_cat_type, menu_price, menu_final_price, menu_discount, menu_description, menu_status FROM manu_category WHERE menu_status="1" AND menu_type="C" AND menu_cat_type="S" AND menu_sub_id=${sub_id}`;
            const subCategoryResult = await executeQuery(cakesubsql);

            response.subcategories = subCategoryResult.map(item => ({
                menu_title: item.menu_title,
                menu_sub_id: item.menu_sub_id,
                menu_id: item.menu_id,
                image_url: item.image_url,
                menu_price: item.menu_price,
                menu_final_price: item.menu_final_price,
                menu_discount: item.menu_discount,
                menu_description: item.menu_description,
                menu_status: item.menu_status
            }));

            return res.send({
                Response: {
                    Success: "1",
                    message: "Success",
                    result: response
                }
            });
        } else {
            return res.send({
                Response: {
                    Success: "0",
                    message: "No Records Found!",
                }
            });
        }
    } catch (error) {
        console.error("Error:", error);
        return res.status(200).json({
            success: '0',
            message: "Internal Server Error",
        });
    }
});


app.get("/cake/subcategory/get/list/panel", async (req, res) => {

    try {
        const response = {};

        // Fetch main cake category details
        let sql = `SELECT * FROM manu_category WHERE menu_status="1" AND menu_type="C" AND menu_cat_type="C"`;
        const mainCategoryResult = await executeQuery(sql);

        if (mainCategoryResult.length > 0) {
            response.cake_category_name = mainCategoryResult[0].menu_title;
            const sub_id = mainCategoryResult[0].menu_id;

            // Fetch cake subcategories
            let cakesubsql = `SELECT menu_id, menu_title, CONCAT('${baseImageUrl}', menu_img) AS image_url, menu_sub_id, menu_type, menu_cat_type, menu_price, menu_final_price, menu_discount, menu_description, menu_status FROM manu_category WHERE menu_status="1" AND menu_type="C" AND menu_cat_type="S" AND menu_sub_id=${sub_id}`;
            const subCategoryResult = await executeQuery(cakesubsql);

            response.subcategories = subCategoryResult.map(item => ({
                menu_title: item.menu_title,
                menu_sub_id: item.menu_sub_id,
                menu_id: item.menu_id,
                image_url: item.image_url,
                menu_price: item.menu_price,
                menu_final_price: item.menu_final_price,
                menu_discount: item.menu_discount,
                menu_description: item.menu_description,
                menu_status: item.menu_status
            }));

            return res.send({
                Response: {
                    Success: "1",
                    message: "Success",
                    result: response
                }
            });
        } else {
            return res.send({
                Response: {
                    Success: "0",
                    message: "No Records Found!",
                }
            });
        }
    } catch (error) {
        console.error("Error:", error);
        return res.status(200).json({
            success: '0',
            message: "Internal Server Error",
        });
    }
});

app.get("/waiting/candle/light/dinner", async (req, res) => {
    let fromdate = req.query.fromdate;
    let todate = req.query.todate;
    if (!fromdate || !todate) {
        return res.send({
            Response: {
                success: '0',
                message: "Please provide fromdate and Todate!",
            }
        });
    }


    const fromDateParts = fromdate.split('/');
    const fromDateWithTime = `${fromDateParts[0]} 00:00:00`;
    const toDateParts = todate.split('/');
    const toDateWithTime = `${toDateParts[0]} 23:59:59`;


    let sql = ` SELECT booking_id, reservation_id,reservation_catid,reservation_sub_catid,reservation_type,user_id,date,time,total_people,menu_type,approval_status,payment_status,booking_status,status,created_at FROM reservation_booking where booking_status="W" AND  payment_status="0" AND reservation_type="CL" AND  (created_at>='${fromDateWithTime}' AND created_at<='${toDateWithTime}') ORDER BY created_at DESC`;
    const result = await new Promise((resolve, reject) => {
        con.query(sql, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
    console.log(result)

    let promises = result.map(async (row) => {
        return new Promise((resolve, reject) => {
            const sql1 = ` SELECT  cat_title FROM reservation_category WHERE cat_id = ${row.reservation_catid}`;
            con.query(sql1, (error, result1) => {
                if (error) {
                    reject(error);
                } else {
                    if (result1 && result1.length > 0) {
                        row.user = result1[0];
                    }
                    resolve(row);
                }
            });
        })
            .then((row) => {
                return new Promise((resolve, reject) => {
                    const sql2 = `SELECT sub_tilte,sub_cat_price_range  FROM reservation_sub_category WHERE reser_sub_id = ${row.reservation_sub_catid}`;
                    con.query(sql2, (error, result2) => {
                        if (error) {
                            reject(error);
                        } else {
                            if (result2 && result2.length > 0) {
                                row.vendor = result2[0];
                            }
                            resolve(row);
                        }
                    });
                })
            }).then((row) => {
                return new Promise((resolve, reject) => {
                    const sql2 = `SELECT name as user_name,mobile as user_mobile  FROM users WHERE id = ${row.user_id}`;
                    con.query(sql2, (error, result2) => {
                        if (error) {
                            reject(error);
                        } else {
                            if (result2 && result2.length > 0) {
                                row.reser = result2[0];
                            }
                            resolve(row);
                        }
                    });
                })
            })

    });


    const rows = await Promise.all(promises);

    rows.forEach((row) => {

        row.user = row.user || {};
        row.vendor = row.vendor || {};
        row.reser = row.reser || {};
        Object.assign(row, row.user, row.vendor, row.reser);
        delete row.user;
        delete row.vendor;
        delete row.reser;
    });

    if (rows.length > 0) {
        const response = {
            Response: {
                Success: "1",
                Message: "Success",
                Result: rows
            }
        };
        return res.json(response);
    } else {
        const response = {
            Response: {
                Success: "0",
                Message: "NO Records",
            }
        };
        return res.json(response)
    }
})

app.get("/payment/candle/light/dinner", async (req, res) => {
    let fromdate = req.query.fromdate;
    let todate = req.query.todate;
    if (!fromdate || !todate) {
        return res.send({
            Response: {
                success: '0',
                message: "Please provide fromdate and Todate!",
            }
        });
    }


    const fromDateParts = fromdate.split('/');
    const fromDateWithTime = `${fromDateParts[0]} 00:00:00;`
    const toDateParts = todate.split('/');
    const toDateWithTime = `${toDateParts[0]} 23:59:59`;


    let sql = `SELECT booking_id,reservation_id,reservation_catid,reservation_sub_catid,reservation_type,user_id,date,time,total_people,menu_type,approval_status,payment_status,booking_status,status,created_at,updated_at FROM reservation_booking where payment_status="1" AND approval_status="1" AND booking_status="B" AND reservation_type="CL" AND  (created_at>='${fromDateWithTime}' AND created_at<='${toDateWithTime}') ORDER BY created_at DESC`;
    const result = await new Promise((resolve, reject) => {
        con.query(sql, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });


    let promises = result.map(async (row) => {
        return new Promise((resolve, reject) => {
            const sql1 = `SELECT  cat_title FROM reservation_category WHERE cat_id = ${row.reservation_catid}`;
            con.query(sql1, (error, result1) => {
                if (error) {
                    reject(error);
                } else {
                    if (result1 && result1.length > 0) {
                        row.user = result1[0];
                    }
                    resolve(row);
                }
            });
        })
            .then((row) => {
                return new Promise((resolve, reject) => {
                    const sql2 = `SELECT sub_tilte,sub_cat_price_range  FROM reservation_sub_category WHERE reser_sub_id = ${row.reservation_sub_catid}`;
                    con.query(sql2, (error, result2) => {
                        if (error) {
                            reject(error);
                        } else {
                            if (result2 && result2.length > 0) {
                                row.vendor = result2[0];
                            }
                            resolve(row);
                        }
                    });
                })
            }).then((row) => {
                return new Promise((resolve, reject) => {
                    const sql2 = `SELECT name as user_name,mobile as user_mobile  FROM users WHERE id = ${row.user_id}`;
                    con.query(sql2, (error, result2) => {
                        if (error) {
                            reject(error);
                        } else {
                            if (result2 && result2.length > 0) {
                                row.reser = result2[0];
                            }
                            resolve(row);
                        }
                    });
                })
            })

    });


    const rows = await Promise.all(promises);

    rows.forEach((row) => {

        row.user = row.user || {};
        row.vendor = row.vendor || {};
        row.reser = row.reser || {};
        Object.assign(row, row.user, row.vendor, row.reser);
        delete row.user;
        delete row.vendor;
        delete row.reser;
    });

    if (rows.length > 0) {
        const response = {
            Response: {
                Success: "1",
                Message: "Success",
                Result: rows
            }
        };
        return res.json(response);
    } else {
        const response = {
            Response: {
                Success: "0",
                Message: "NO Records",
            }
        };
        return res.json(response)
    }
})





// ------------------------------------------------------------------reservation booking api

app.post("/reservation/booking/create", async (req, res) => {

    // let { userid } = req.body;
    // if (!userid) { return res.send({ Response: { success: '0', message: "User Id is required!", } }); }


    // let userInfo = await getUserInfo(userid);
    // if (userInfo == null || !userInfo.user_id) { return res.send({ Response: { success: '0', message: "User Info is required!", } }); }

    // if (!await validateEncrypt(userInfo.ENCRYPT_KEY)) {
    //     return res.send({ Response: { success: '0', message: "Key Validation Error", result: [] } });
    // }

    //userid = userInfo.user_id;
    let userid = 61008;
    console.log(userid);

    const userResult = await executeQuery(`SELECT * FROM users WHERE id = ?`, [61008]); //check user exist in DB   
    if (userResult.length <= 0) { return res.send({ Response: { success: '0', message: "Please Signup!", } }); }

    const { reser_id, reser_catid, resersubcatid, type, date, time, peoples, menu_type, veg_or_nonveg, guest_name, cake, cake_msg, remarks } = req.body;

    if (type === "CL" || type === "BP" || type === "TA") {
        if (type === "CL" && (!date || !time || !peoples || !menu_type || !reser_id || !reser_catid || !resersubcatid)) {
            return res.json({ Response: { Success: "0", Message: "Please Provide Valid candle light dinner Details" } });
        }

        if (type === "BP" && (!date || !time || !peoples || !photohanging || !photoshoot || !bouquet || !firecracks || !decription || !reser_id || !reser_catid || !resersubcatid || !flaver)) {
            return res.json({ Response: { Success: "0", Message: "Please Provide Valid birthday party Details" } });
        }

        if (type === "TA" && (!date || !time || !peoples || !reser_id || !reser_catid || !resersubcatid)) {
            return res.json({ Response: { Success: "0", Message: "Please Provide Valid table booking Details" } });
        }

        let bookingStatus = "Created";
        // ["Created","Booked"]

        let formatDate = new Date();
        if (type === "CL") {
            const reservationSubCategory = await executeQuery(`SELECT * FROM reservation_sub_category WHERE reser_sub_id = ?`, [resersubcatid]); //check user exist in DB   
            const insertCandleLightDinnerQuery = `INSERT INTO reservation_booking (reservation_id,reservation_catid,reservation_sub_catid,user_id,reservation_type,date, time, total_people, menu_type, veg_or_nonveg,guest_name,cake,cake_msg,remarks,booking_status, created_at) VALUES (?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)`;
            const sqlValues = [reser_id, reser_catid, resersubcatid, userid, type, date, time, peoples, menu_type, veg_or_nonveg, guest_name, cake, cake_msg, remarks, bookingStatus, formatDate];

            con.query(insertCandleLightDinnerQuery, sqlValues, async (error, result) => {
                if (error) {
                    console.log(error)
                    return res.json({ Response: { Success: "0", Message: "Booking failed" } });
                } else {
                    const reservationId = result.insertId;
                    await mailbooking(reservationId, res)
                    let razorPayCreate = await createOrder({ amount: reservationSubCategory[0].sub_cat_price_range, receipt: userid.toString() })

                    if (!razorPayCreate.success) {
                        return res.json({ Response: { Success: "0", Message: "Razorpay Order not Created" } });
                    }
                    let RazorpayOrder = razorPayCreate.order;

                    //Update razorpay_order_id
                    const formatedate = new Date()
                    const sql2 = `UPDATE reservation_booking SET razorpay_order_id=? ,updated_at=? WHERE booking_id=${reservationId}`;
                    con.query(sql2, [RazorpayOrder.id, formatedate], (Error, result) => {
                        if (Error) {
                            console.log(Error)
                            return res.json({ Response: { Success: "0", Message: "Order ID Update failed" } });
                        } else {
                            return res.json({
                                Response: {
                                    Success: "1", Message: "Booked!",
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
        } else if (type === "BP") {
            const getValidNumber = (value) => {
                return isNaN(Number(value)) ? 0 : Number(value);
            };
            const final_amt = getValidNumber(photohanging) + getValidNumber(photoshoot) + getValidNumber(bouquet) + getValidNumber(firecracks) + getValidNumber(party_amt);
            console.log("final_amt", final_amt)
            const insertBirthdayQuery = `INSERT INTO reservation_booking (reservation_id, reservation_catid, reservation_sub_catid, user_id,reservation_type, date, time, total_people, photo_hanging, photo_shoot, bouquet, fire_crackers, balloon, cake_shape, cake_weight, cake_decription,description, flavour, final_amt, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            const sqlValues = [
                reser_id, reser_catid, resersubcatid, userid, type, date, time, peoples,
                photohanging, photoshoot, bouquet, firecracks, balloon, cake_shape,
                cake_weight, cake_decription, decription, flaver, final_amt, formatDate
            ];
            con.query(insertBirthdayQuery, sqlValues, async (error, result) => {
                if (error) {
                    console.log(error)
                    return res.json({
                        Response: {
                            Success: "0",
                            Message: "Booking failed"
                        }
                    });
                } else {
                    const reservationId = result.insertId;
                    await birthdaymailbooking(reservationId)
                    return res.json({
                        Response: {
                            Success: "1",
                            Message: "Booked!"
                        }
                    });
                }
            });
        } else if (type === "TA") {
            const insertTableBookingQuery = `
            INSERT INTO reservation_booking (
              reservation_id, reservation_catid, reservation_sub_catid, user_id, 
              reservation_type, date, time, total_people, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
            const sqlValues = [
                reser_id, reser_catid, resersubcatid, userid, type, date, time, peoples, formatDate
            ];

            con.query(insertTableBookingQuery, sqlValues, async (error, result) => {
                if (error) {
                    return res.json({
                        Response: {
                            Success: "0",
                            Message: "Booking failed"
                        }
                    });
                } else {
                    const reservationId = result.insertId;
                    await mailbooking(reservationId)
                    return res.json({
                        Response: {
                            Success: "1",
                            Message: "Booked!"
                        }
                    });
                }
            });
        }
    } else {
        return res.json({ Response: { Success: "0", Message: "Please Provide Valid Booking Type" } });
    }
});


// ------------------------------------------------------------------Reservation Booking update
// update payment status
app.post("/reservation/booking/update", async (req, res) => {

    console.log(req.body);
    const { userid, razorpay_payment_status, booking_id, razorpay_payment_id } = req.body;
    if (!userid) { return res.send({ Response: { success: '0', message: "User ID is required!", } }); }
    if (!booking_id) { return res.send({ Response: { success: '0', message: "Booking ID is required!", } }); }
    if (!razorpay_payment_id) { return res.send({ Response: { success: '0', message: "Payment ID Id is required!", } }); }

    const userResult = await executeQuery(`SELECT * FROM users WHERE id = ? `, [userid]); //check user exist in DB   
    if (userResult.length <= 0) { return res.send({ Response: { success: '0', message: "Please Signup!", } }); }

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
    con.query(updateSQL, updateParams, (Error, result) => {
        if (Error) {
            console.log(Error)
            return res.json({ Response: { Success: "0", Message: "Error in Update payment details" } });
        } else {
            return res.json({ Response: { Success: "1", Message: "Booked!" } });
        }
    });
});


// ------------------------------------------------------------------Reservation Booking list
// Cart
app.post("/cart/api", async (req, res) => {
    try {
        // const { userid } = req.body;
        let userid = 61008;

        if (!userid) { return res.send({ Response: { success: '0', message: "User Id is required!", } }); }

        const userResult = await executeQuery(`SELECT * FROM users WHERE id = ? `, [userid]); //check user exist in DB   
        if (userResult.length <= 0) { return res.send({ Response: { success: '0', message: "Please Signup!", } }); }

        let reservationbookingsql = `SELECT 
            reservation_booking.booking_id, 
            reservation_booking.date, 
            reservation_booking.time, 
            reservation_booking.total_people, 
            reservation_booking.menu_type, 
            reservation_booking.veg_or_nonveg, 
            reservation_booking.guest_name, 
            reservation_booking.cake, 
            reservation_booking.cake_msg, 
            reservation_booking.booking_status, 
            reservation_booking.razorpay_payment_status, 
            reservation_booking.razorpay_payment_amount, 
            reservation_booking.reservation_sub_catid,
            reservation_booking.remarks,
            users.name as username,
            users.email as email,
            users.mobile as mobile,

            reservation_sub_category.*,
            reservation.reser_main_title,
            reservation.description,
            reservation_category.cat_title,
            reservation_category.cat_image
        from reservation_booking JOIN reservation_sub_category ON reservation_sub_category.reser_sub_id = reservation_booking.reservation_sub_catid
        JOIN reservation_category ON reservation_category.cat_id = reservation_sub_category.reser_cat_id
        JOIN reservation ON reservation.reser_id = reservation_category.reser_id
        JOIN users ON users.id = reservation_booking.user_id
        where reservation_sub_category.status = "1"ORDER BY reservation_booking.created_at DESC`;

        const executereservationbookingsql = await executeQuery(reservationbookingsql)

        if (executereservationbookingsql.length > 0) {
            const result = executereservationbookingsql.map((item) => {
                const extraImages = JSON.parse(item.sub_extra_img).map(imageName => baseImageUrl + imageName);
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

                    reser_main_title: item.reser_main_title,
                    description: item.description,
                    cat_title: item.cat_title,
                    cat_image: baseImageUrl + item.cat_image,

                    // booking
                    booking_id: "BOOKID" + item.booking_id,
                    booking_date: format(new Date(item.date), 'yyyy-MM-dd'),
                    booking_time: item.time,
                    booking_total_people: item.total_people,
                    booking_menu_type: item.menu_type,
                    booking_veg_or_nonveg: item.veg_or_nonveg,
                    booking_guest_name: item.guest_name,
                    booking_cake: item.cake,
                    booking_cake_msg: item.cake_msg,
                    booking_status: item.booking_status,
                    booking_payment_status: item.razorpay_payment_status,
                    booking_payment_amount: item.razorpay_payment_amount,
                    remarks: item.remarks,

                    // user
                    user_name: item.username,
                    user_email: item.email,
                    user_mobile: item.mobile,
                };
            });
            // objfile['reservation_booking'] = result;
            // objfile['user'] = userResult;

            res.send({ Response: { Success: "1", Message: "Success", Result: result } })
        } else {
            res.send({ Response: { Success: "0", Message: "NO Records", Result: [] } });
        }
    } catch (error) {
        return res.status(500).json({ success: '0', message: error.message, Result: [] });
    }
});



//   ================================================================
app.post("/payment/status1", async (req, res) => {
    const booking_id = req.body.booking_id;
    const payment = req.body.pstatus;


    console.log("payment", payment)
    if (!booking_id) {
        const response = {
            Response: {
                Success: "0",
                message: "Please Provide booking_id!"
            }
        };
        return res.send(response);
    }

    if (!payment) {
        const response = {
            Response: {
                Success: "0",
                message: "Please Provide payment  1"
            }
        };
        return res.send(response);
    }
    const sql = `SELECT * FROM reservation_booking WHERE  approval_status = "0" AND payment_status = "0" AND booking_status = "W" AND booking_id = ${booking_id} `;
    con.query(sql, (error, result) => {
        if (error) {
            return res.send(error);
        }
        if (result.length === 0) {
            const response = {
                Response: {
                    Success: "0",
                    message: "Invalid Order Id"
                }
            };
            return res.json(response);
        }
        const tableStatus = result[0].payment_status;
        console.log("tableStatus", tableStatus)
        if (tableStatus != 1) {
            const formatedate = new Date()
            const sql2 = ` UPDATE reservation_booking SET payment_status =? , updated_at =?, approval_status = "1", booking_status = "B" WHERE approval_status = "0" AND booking_id = ${booking_id} `;
            con.query(sql2, [payment, formatedate], (Error, result) => {
                if (Error) {
                    const response = {
                        Response: {
                            Success: "0",
                            message: "Failed to Added!"
                        }
                    };
                    return res.json(response);
                } else {
                    const response = {
                        Response: {
                            Success: "1",
                            message: "Payment!"
                        }
                    };
                    return res.json(response);
                }
            });
        } else {
            const response = {
                Response: {
                    Success: "0",
                    message: "already Paid!"
                }
            };
            return res.json(response);
        }
    });
})





app.get("/waiting/table/booking", async (req, res) => {
    let fromdate = req.query.fromdate;
    let todate = req.query.todate;
    if (!fromdate || !todate) {
        return res.send({
            Response: {
                success: '0',
                message: "Please provide fromdate and Todate!",
            }
        });
    }


    const fromDateParts = fromdate.split('/');
    const fromDateWithTime = `${fromDateParts[0]} 00:00:00`;
    const toDateParts = todate.split('/');
    const toDateWithTime = ` ${toDateParts[0]} 23: 59: 59`;


    let sql = `SELECT booking_id, reservation_id, reservation_catid, reservation_sub_catid, reservation_type, user_id, date, time, total_people, menu_type, approval_status, payment_status, booking_status, status, created_at FROM reservation_booking where booking_status = "W" AND reservation_type = "TA" AND(created_at >= '${fromDateWithTime}' AND created_at <= '${toDateWithTime}') ORDER BY created_at DESC`;
    const result = await new Promise((resolve, reject) => {
        con.query(sql, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
    console.log(result)

    let promises = result.map(async (row) => {
        return new Promise((resolve, reject) => {
            const sql1 = ` SELECT  cat_title FROM reservation_category WHERE cat_id = ${row.reservation_catid}; `
            con.query(sql1, (error, result1) => {
                if (error) {
                    reject(error);
                } else {
                    if (result1 && result1.length > 0) {
                        row.user = result1[0];
                    }
                    resolve(row);
                }
            });
        })
            .then((row) => {
                return new Promise((resolve, reject) => {
                    const sql2 = `SELECT sub_tilte, sub_cat_price_range  FROM reservation_sub_category WHERE reser_sub_id = ${row.reservation_sub_catid} `;
                    con.query(sql2, (error, result2) => {
                        if (error) {
                            reject(error);
                        } else {
                            if (result2 && result2.length > 0) {
                                row.vendor = result2[0];
                            }
                            resolve(row);
                        }
                    });
                })
            }).then((row) => {
                return new Promise((resolve, reject) => {
                    const sql2 = `SELECT name as user_name, mobile as user_mobile  FROM users WHERE id = ${row.user_id} `;
                    con.query(sql2, (error, result2) => {
                        if (error) {
                            reject(error);
                        } else {
                            if (result2 && result2.length > 0) {
                                row.reser = result2[0];
                            }
                            resolve(row);
                        }
                    });
                })
            })

    });


    const rows = await Promise.all(promises);
    rows.forEach((row) => {
        row.user = row.user || {};
        row.vendor = row.vendor || {};
        row.reser = row.reser || {};
        Object.assign(row, row.user, row.vendor, row.reser);
        delete row.user;
        delete row.vendor;
        delete row.reser;
    });

    if (rows.length > 0) {
        const response = {
            Response: {
                Success: "1",
                Message: "Success",
                Result: rows
            }
        };
        return res.json(response);
    } else {
        const response = {
            Response: {
                Success: "0",
                Message: "NO Records",
            }
        };
        return res.json(response)
    }
})



app.get("/payment/table/booking", async (req, res) => {
    let fromdate = req.query.fromdate;
    let todate = req.query.todate;
    if (!fromdate || !todate) {
        return res.send({
            Response: {
                success: '0',
                message: "Please provide fromdate and Todate!",
            }
        });
    }


    const fromDateParts = fromdate.split('/');
    const fromDateWithTime = `${fromDateParts[0]} 00:00:00`;
    const toDateParts = todate.split('/');
    const toDateWithTime = `${toDateParts[0]} 23: 59: 59`;


    let sql = `SELECT reservation_id, reservation_catid, reservation_sub_catid, reservation_type, user_id, date, time, total_people, menu_type, approval_status, payment_status, booking_status, status, created_at, updated_at FROM reservation_booking where payment_status = "1" AND approval_status = "1" AND booking_status = "B" AND reservation_type = "TA" AND(created_at >= '${fromDateWithTime}' AND created_at <= '${toDateWithTime}') ORDER BY created_at DESC`;
    const result = await new Promise((resolve, reject) => {
        con.query(sql, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });

    let promises = result.map(async (row) => {
        return new Promise((resolve, reject) => {
            const sql1 = `SELECT  cat_title FROM reservation_category WHERE cat_id = ${row.reservation_catid} `;
            con.query(sql1, (error, result1) => {
                if (error) {
                    reject(error);
                } else {
                    if (result1 && result1.length > 0) {
                        row.user = result1[0];
                    }
                    resolve(row);
                }
            });
        })
            .then((row) => {
                return new Promise((resolve, reject) => {
                    const sql2 = `SELECT sub_tilte, sub_cat_price_range  FROM reservation_sub_category WHERE reser_sub_id = ${row.reservation_sub_catid} `;
                    con.query(sql2, (error, result2) => {
                        if (error) {
                            reject(error);
                        } else {
                            if (result2 && result2.length > 0) {
                                row.vendor = result2[0];
                            }
                            resolve(row);
                        }
                    });
                })
            }).then((row) => {
                return new Promise((resolve, reject) => {
                    const sql2 = `SELECT name as user_name, mobile as user_mobile  FROM users WHERE id = ${row.user_id} `;
                    con.query(sql2, (error, result2) => {
                        if (error) {
                            reject(error);
                        } else {
                            if (result2 && result2.length > 0) {
                                row.reser = result2[0];
                            }
                            resolve(row);
                        }
                    });
                })
            })

    });


    const rows = await Promise.all(promises);

    rows.forEach((row) => {

        row.user = row.user || {};
        row.vendor = row.vendor || {};
        row.reser = row.reser || {};
        Object.assign(row, row.user, row.vendor, row.reser);
        delete row.user;
        delete row.vendor;
        delete row.reser;
    });

    if (rows.length > 0) {
        const response = {
            Response: {
                Success: "1",
                Message: "Success",
                Result: rows
            }
        };
        return res.json(response);
    } else {
        const response = {
            Response: {
                Success: "0",
                Message: "NO Records",
            }
        };
        return res.json(response)
    }
})



app.get("/waiting/birthday/list", async (req, res) => {
    let fromdate = req.query.fromdate;
    let todate = req.query.todate;
    if (!fromdate || !todate) {
        return res.send({
            Response: {
                success: '0',
                message: "Please provide fromdate and Todate!",
            }
        });
    }

    const fromDateParts = fromdate.split('/');
    const fromDateWithTime = `${fromDateParts[0]} 00:00:00`;
    const toDateParts = todate.split('/');
    const toDateWithTime = `${toDateParts[0]} 23: 59: 59`;

    let sql = ` SELECT * FROM reservation_booking where  payment_status = "0" AND approval_status = "0" AND  booking_status = "W" AND reservation_type = "BP" AND(created_at >= '${fromDateWithTime}' AND created_at <= '${toDateWithTime}') ORDER BY created_at DESC`;
    const result = await new Promise((resolve, reject) => {
        con.query(sql, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
    console.log(result)

    let promises = result.map(async (row) => {
        return new Promise((resolve, reject) => {
            const sql1 = `SELECT  cat_title FROM reservation_category WHERE cat_id = ${row.reservation_catid} `;
            con.query(sql1, (error, result1) => {
                if (error) {
                    reject(error);
                } else {
                    if (result1 && result1.length > 0) {
                        row.user = result1[0];
                    }
                    resolve(row);
                }
            });
        })
            .then((row) => {
                return new Promise((resolve, reject) => {
                    const sql2 = `SELECT sub_tilte, sub_cat_price_range  FROM reservation_sub_category WHERE reser_sub_id = ${row.reservation_sub_catid} `;
                    con.query(sql2, (error, result2) => {
                        if (error) {
                            reject(error);
                        } else {
                            if (result2 && result2.length > 0) {
                                row.vendor = result2[0];
                            }
                            resolve(row);
                        }
                    });
                })
            }).then((row) => {
                return new Promise((resolve, reject) => {
                    const sql2 = `SELECT name as user_name, mobile as user_mobile  FROM users WHERE id = ${row.user_id} `;
                    con.query(sql2, (error, result2) => {
                        if (error) {
                            reject(error);
                        } else {
                            if (result2 && result2.length > 0) {
                                row.reser = result2[0];
                            }
                            resolve(row);
                        }
                    });
                })
            })

    });


    const rows = await Promise.all(promises);

    rows.forEach((row) => {

        row.user = row.user || {};
        row.vendor = row.vendor || {};
        row.reser = row.reser || {};
        Object.assign(row, row.user, row.vendor, row.reser);
        delete row.user;
        delete row.vendor;
        delete row.reser;
    });

    if (rows.length > 0) {
        const response = {
            Response: {
                Success: "1",
                Message: "Success",
                Result: rows
            }
        };
        return res.json(response);
    } else {
        const response = {
            Response: {
                Success: "0",
                Message: "NO Records",
            }
        };
        return res.json(response)
    }
})



app.get("/payment/birthday/list", async (req, res) => {
    let fromdate = req.query.fromdate;
    let todate = req.query.todate;
    if (!fromdate || !todate) {
        return res.send({
            Response: {
                success: '0',
                message: "Please provide fromdate and Todate!",
            }
        });
    }


    const fromDateParts = fromdate.split('/');
    const fromDateWithTime = `${fromDateParts[0]} 00:00:00`;
    const toDateParts = todate.split('/');
    const toDateWithTime = `${toDateParts[0]} 23: 59: 59`;


    let sql = `SELECT * FROM reservation_booking where  payment_status = "1" AND approval_status = "1" AND  booking_status = "B" AND reservation_type = "BP" AND(created_at >= '${fromDateWithTime}' AND created_at <= '${toDateWithTime}') ORDER BY created_at DESC`;
    const result = await new Promise((resolve, reject) => {
        con.query(sql, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });

    let promises = result.map(async (row) => {
        return new Promise((resolve, reject) => {
            const sql1 = `SELECT  cat_title FROM reservation_category WHERE cat_id = ${row.reservation_catid} `;
            con.query(sql1, (error, result1) => {
                if (error) {
                    reject(error);
                } else {
                    if (result1 && result1.length > 0) {
                        row.user = result1[0];
                    }
                    resolve(row);
                }
            });
        })
            .then((row) => {
                return new Promise((resolve, reject) => {
                    const sql2 = `SELECT sub_tilte, sub_cat_price_range  FROM reservation_sub_category WHERE reser_sub_id = ${row.reservation_sub_catid} `;
                    con.query(sql2, (error, result2) => {
                        if (error) {
                            reject(error);
                        } else {
                            if (result2 && result2.length > 0) {
                                row.vendor = result2[0];
                            }
                            resolve(row);
                        }
                    });
                })
            }).then((row) => {
                return new Promise((resolve, reject) => {
                    const sql2 = `SELECT name as user_name, mobile as user_mobile  FROM users WHERE id = ${row.user_id} `;
                    con.query(sql2, (error, result2) => {
                        if (error) {
                            reject(error);
                        } else {
                            if (result2 && result2.length > 0) {
                                row.reser = result2[0];
                            }
                            resolve(row);
                        }
                    });
                })
            })

    });


    const rows = await Promise.all(promises);

    rows.forEach((row) => {

        row.user = row.user || {};
        row.vendor = row.vendor || {};
        row.reser = row.reser || {};
        Object.assign(row, row.user, row.vendor, row.reser);
        delete row.user;
        delete row.vendor;
        delete row.reser;
    });

    if (rows.length > 0) {
        const response = {
            Response: {
                Success: "1",
                Message: "Success",
                Result: rows
            }
        };
        return res.json(response);
    } else {
        const response = {
            Response: {
                Success: "0",
                Message: "NO Records",
            }
        };
        return res.json(response)
    }
})


// ===========================================usergetdetails
app.get("/usergetdetails", async (req, res) => {
    const userid = req.query.userid
    let sql;
    if (!userid) {
        sql = `select * from users where status = "1"`
    } else {
        sql = `select * from users where status = "1" and id = ${userid} `
    }
    const exesqlquery = await executeQuery(sql)

    if (exesqlquery.length > 0) {
        const response = {
            Response: {
                Success: "1",
                message: "Success",
                result: exesqlquery
            }
        };
        return res.json(response);
    }
    else {
        const response = {
            Response: {
                Success: "0",
                message: "No Records!",
            }
        };
        return res.json(response);
    }
})


// ==================================================usergetdetails/update
app.post("/usergetdetails/update/api", async (req, res) => {
    try {
        const id = req.body.id;
        if (!id) {
            return res.json({
                success: '0',
                message: "User ID required!"
            });
        }

        const sql = `SELECT * FROM users WHERE status = "1" AND  id = ${id} `;
        con.query(sql, async (error, result) => {
            if (error) {
                return res.json({
                    success: '0',
                    message: error.message
                });
            } else {
                if (result.length === 0) {
                    return res.json({
                        success: '0',
                        message: "User not found."
                    });
                }


                const existingData = result[0];


                const { name, email, password, mobile, address } = req.body;



                const updatename = name || existingData.name;
                const updateemail = email || existingData.email;
                const updatepassword = password || existingData.password;
                const updatemobile = mobile || existingData.mobile;
                const updateaddress = address || existingData.address;


                const updateSql = ` UPDATE user SET name =?, email =?, password =?, mobile =?, address =? WHERE  status = "1"  AND id =? `;
                con.query(updateSql, [updatename, updateemail, updatepassword, updatemobile, updateaddress, id], (updateError, updateResult) => {
                    if (updateError) {
                        return res.json({
                            success: '0',
                            message: updateError.message
                        });
                    } else {
                        return res.json({
                            success: '1',
                            message: "Updated!"
                        });
                    }
                });
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: '0',
            message: error.message,
        });
    }
});

// ===========================================================changepassword
app.post("/changepassword/api", async (req, res) => {
    try {
        const id = req.body.id;
        if (!id) {
            return res.json({
                success: '0',
                message: "User ID required!"
            });
        }

        const sql = `SELECT * FROM users WHERE status = "1" AND  id = ${id} `;
        con.query(sql, async (error, result) => {
            if (error) {
                return res.json({
                    success: '0',
                    message: error.message
                });
            } else {
                if (result.length === 0) {
                    return res.json({
                        success: '0',
                        message: "User not found."
                    });
                }


                const { Password } = req.body;

                if (result.length === 0) {
                    return res.json({
                        success: '0',
                        message: "User not found."
                    });
                }

                const existingData = result[0];
                const oldPassword = existingData.password;
                if (oldPassword !== Password) {
                    return res.json({
                        success: '0',
                        message: "Old password is incorrect"
                    });
                }

                const updateSql = `UPDATE user SET  password =? WHERE  status = "1"  AND id =? `;
                con.query(updateSql, [Password, id], (updateError, updateResult) => {
                    if (updateError) {
                        return res.json({
                            success: '0',
                            message: updateError.message
                        });
                    } else {
                        return res.json({
                            success: '1',
                            message: "Updated!"
                        });
                    }
                });
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: '0',
            message: error.message,
        });
    }
});



// ===========================================================


app.get("/candle/light/dinner/res/subcat", async (req, res) => {
    try {
        let objfile = {};
        const res_id = req.query.res_id
        const res_cat_id = req.query.res_cat_id
        const reser_sub_id = req.query.reser_sub_id
        if (!reser_sub_id) {
            return res.send({
                success: '0',
                message: "reser_sub_id required!",
            });
        }

        let reservationcategorysql = `select
        reservation_sub_category.*,
            reservation.reser_main_title,
            reservation.description,
            reservation_category.cat_title,
            reservation_category.cat_image 
        from reservation_sub_category
        JOIN reservation_category ON reservation_category.cat_id = reservation_sub_category.reser_cat_id
        JOIN reservation ON reservation.reser_id = reservation_category.reser_id
        where reservation_sub_category.status = "1" and reservation_sub_category.reser_sub_id = ${reser_sub_id} `
        const executereservationcategorysql = await executeQuery(reservationcategorysql)

        if (executereservationcategorysql.length > 0) {
            const result = executereservationcategorysql.map((item) => {
                const extraImages = JSON.parse(item.sub_extra_img).map(imageName => baseImageUrl + imageName);
                const veg_images = JSON.parse(item.veg_images).map(imageName => baseImageUrl + imageName);
                const nonveg_images = JSON.parse(item.nonveg_images).map(imageName => baseImageUrl + imageName);
                // console.log(JSON.parse(item.veg_menus).map(el => el != ""));
                // console.log(JSON.parse(item.nonveg_menus));
                // console.log(typeof JSON.parse(item.nonveg_menus));
                // let veg_menus = await removeEmpty(JSON.parse(item.veg_menus));
                // let veg_menus = Object.keys(JSON.parse(item.veg_menus)).map(key => ({ key: key, value: JSON.parse(item.veg_menus)[key] }));
                let veg_menus = Object.keys(JSON.parse(item.veg_menus))
                    .map(key => JSON.parse(item.veg_menus)[key])           // Get values
                    .filter(value => value);
                console.log(veg_menus);

                let nonveg_menus = Object.keys(JSON.parse(item.nonveg_menus))
                    .map(key => JSON.parse(item.nonveg_menus)[key])           // Get values
                    .filter(value => value);
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
                    nonveg_images: nonveg_images,
                    veg_menus: veg_menus,
                    nonveg_menus: nonveg_menus,
                    sub_cat_price_range: item.sub_cat_price_range,
                    status: item.status,
                    created_at: item.created_at,
                    updated_at: item.updated_at,

                    reser_main_title: item.reser_main_title,
                    description: item.description,
                    cat_title: item.cat_title,
                    cat_image: baseImageUrl + item.cat_image,

                };
            });
            objfile['reservation_subcategory'] = result;

            const response = {
                Response: {
                    Success: "1",
                    message: "Success",
                    result: objfile
                }
            }
            res.send(response)

        } else {
            const response = {
                Response: {
                    Success: "0",
                    message: "No Records!",
                }
            };
            return res.json(response);
        }
    } catch (error) {
        return res.status(500).json({
            success: '0',
            message: error.message,
        });
    }
})

async function removeEmpty(array) {
    if (Array.isArray(array)) {

        let filtered = array.filter(el => el != null);
        // console.log(filtered);
        return filtered;
    } else {
        console.error('Expected an array but got:', array);
    }

}

app.get("/candle/light/dinner/menulist", async (req, res) => {
    const reser_sub_id = req.query.reser_sub_id
    if (!reser_sub_id) {
        return res.send({
            success: '0',
            message: "reser_sub_id required!",
        });
    }

    let sql;
    sql = `select menu_id, menu_title from menu_item where menu_type = "C" and manu_reser_sub_cat_id = ${reser_sub_id} `
    con.query(sql, (error, result) => {
        if (error) {
            return res.json({
                success: '0',
                message: error.message,
            });
        } else {
            return res.json({
                success: '1',
                message: "Success",
                result: result
            });
        }
    });
})


app.get("/candle/light/dinner/menu_item_list", async (req, res) => {
    const menuitem_id = req.query.menuitem_id
    if (!menuitem_id) {
        return res.send({
            success: '0',
            message: "menuitem_id required!",
        });
    }

    let sql;
    sql = `select menu_id, menu_title, menu_img, menu_type, manu_reser_sub_cat_id, menu_cat_id from menu_item where menu_type = "S" and menu_cat_id = ${menuitem_id} `
    con.query(sql, (error, result) => {
        if (error) {
            return res.json({
                success: '0',
                message: error.message,
            });
        } else {

            const resposne = result.map((item) => {

                return {
                    menu_id: item.menu_id,
                    menu_title: item.menu_title,
                    menu_type: item.menu_type,
                    menu_cat_id: item.menu_cat_id,
                }
            })


            return res.json({
                success: '1',
                message: "Success",
                result: resposne
            });
        }
    });
})



app.get("/candle/light/dinner/menu_item_image/list", async (req, res) => {
    const reser_sub_id = req.query.reser_sub_id;
    let sql;

    sql = `SELECT * FROM menu_item WHERE menu_type = "C" AND manu_reser_sub_cat_id = ${reser_sub_id} `;

    try {
        const exesqlquery = await executeQuery(sql);

        if (exesqlquery.length > 0) {
            const result = await Promise.all(exesqlquery.map(async (item) => {

                const categoryquery = `SELECT CONCAT('${baseImageUrl}', menu_img) AS image_url FROM menu_item WHERE menu_type = "S" and menu_cat_id = ? `;

                return await executeQuery(categoryquery, [item.menu_id]);


            }));

            return res.json({
                Success: "1",
                message: "Success",
                result: result.flat()
            });
        } else {
            return res.json({
                Success: "0",
                message: "No Records!",
            });
        }
    } catch (error) {
        console.error("Error executing SQL query:", error);
        return res.status(500).json({
            Success: "0",
            message: "Internal Server Error"
        });
    }
});


// =-=-=-=-=-=--=-=--=-=-=-=-=-=-=-=-=-


app.post("/birthday/category/add", async (req, res) => {
    try {
        const { menuitem_title, reser_sub_catid, menu_type } = req.body;

        // Validate required fields
        if (!menuitem_title) {
            return res.send({
                success: '0',
                message: "menuitem_title required!",
            });
        }
        if (!reser_sub_catid) {
            return res.send({
                success: '0',
                message: "reser_sub_catid required!",
            });
        }
        if (!menu_type) {
            return res.send({
                success: '0',
                message: "menu_type required!",
            });
        }

        const formattedDate = new Date();

        // Insert data into MySQL table
        const sql = `INSERT INTO menu_item(menu_title, manu_reser_sub_cat_id, menu_type, created_at) VALUES(?,?,?,?)`;
        const sqlValues = [menuitem_title, reser_sub_catid, menu_type, formattedDate];

        con.query(sql, sqlValues, (error, result) => {
            if (error) {
                return res.json({
                    success: '0',
                    message: error.message, // Sending only error message
                });
            } else {
                return res.json({
                    success: '1',
                    message: "Added!",
                });
            }
        });
    } catch (error) {
        return res.status(200).json({
            success: '0',
            message: error.message,
        });
    }
});


app.post("/birthday/category/cat/add", async (req, res) => {
    try {
        const { menuitem_title, catid, menu_type, amount } = req.body;

        // Validate required fields
        if (!menuitem_title) {
            return res.send({
                success: '0',
                message: "menuitem_title required!",
            });
        }
        if (!catid) {
            return res.send({
                success: '0',
                message: "catid required!",
            });
        }
        if (!menu_type) {
            return res.send({
                success: '0',
                message: "menu_type required!",
            });
        }

        if (!amount) {
            return res.send({
                success: '0',
                message: "amount required!",
            });
        }

        const formattedDate = new Date();

        const sql = `INSERT INTO menu_item(menu_title, menu_cat_id, menu_type, amount, created_at) VALUES(?,?,?,?,?)`;
        const sqlValues = [menuitem_title, catid, menu_type, amount, formattedDate];

        con.query(sql, sqlValues, (error, result) => {
            if (error) {
                return res.json({
                    success: '0',
                    message: error.message,
                });
            } else {
                return res.json({
                    success: '1',
                    message: "Added!",
                });
            }
        });
    } catch (error) {
        return res.status(200).json({
            success: '0',
            message: error.message,
        });
    }
});


app.get("/birthday/category/get", async (req, res) => {
    const reser_cat_id = req.query.reser_cat_id;
    const type = req.query.type;

    if (!reser_cat_id) {
        return res.send({
            success: '0',
            message: "reser_cat_id required!",
        });
    }

    if (!type) {
        return res.send({
            success: '0',
            message: "type required!",
        });
    }

    let arrayresponse = [];
    let response = {};

    try {
        const sql = `SELECT menu_title, menu_id, menu_img FROM menu_item WHERE menu_type =? AND manu_reser_sub_cat_id =? `;
        const queryParams = [type, reser_cat_id];
        const execQuery = await executeQuery(sql, queryParams);

        if (execQuery.length > 0) {
            response.menu_title = execQuery[0].menu_title;
            response.menu_id = execQuery[0].menu_id;


            const sql2 = `SELECT menu_title, menu_id, amount FROM menu_item WHERE menu_type =? AND menu_cat_id =? `;
            const queryParams2 = [type, execQuery[0].menu_id];
            const execQuery2 = await executeQuery(sql2, queryParams2);


            response.pricelist = execQuery2.map(item => ({
                menu_sub_title: item.menu_title,
                menu_sub_id: item.menu_id,
                amount: item.amount
            }));

            arrayresponse.push(response);
        }

        if (arrayresponse.length === 0) {
            return res.send({
                success: '0',
                message: "No Records!",
            });
        } else {
            return res.send({
                success: '1',
                message: "Success",
                result: arrayresponse
            });
        }
    } catch (error) {
        console.error(error);
        return res.send({
            success: '0',
            message: "An error occurred while fetching data",
        });
    }
});

//RazorPay Create Order
async function createOrder(option) {

    const options = {
        amount: option.amount * 100, // amount in paise
        currency: 'INR',
        receipt: option.receipt,
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
async function fetchPaymentDetails(paymentId) {
    try {
        const paymentDetails = await razorpay.payments.fetch(paymentId);
        console.log(paymentDetails);
        return paymentDetails;
    } catch (error) {
        console.error('Error fetching payment details:', error);
        return error;
    }
}


async function reg(reg, v) {
    let err = true;
    if (reg.test(v)) {
        err = false;
    }
    return err;
};

async function getUserInfo(user_id) {
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


async function validateEncrypt(key) {
    // let ENCRYPT_KEY = await getUserInfo(user_id);
    // if (ENCRYPT_KEY == null) { return false }
    return (key === process.env.ENCRYPT_KEY.ENCRYPT_KEY) ? true : false;
};

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



async function getFileName(field_name, table_name, form_name) {
    const getLastId = `select MAX(${field_name}) as ${field_name} from ${table_name}`
    const getLastIdQuery = await executeQuery(getLastId)
    var lastId = 1;
    if (getLastIdQuery.length > 0) {
        lastId = getLastIdQuery[0][`${field_name}`] + 1
    }
    console.log(lastId)
    console.log(form_name + lastId)
    return form_name + lastId;
}

async function fileUploading(filename, file) {
    const currentDate = new Date();
    const timestamp = currentDate.getTime();
    const imageUrl = timestamp + "_" + filename;
    console.log(imageUrl)

    const imagePath = path.join(
        __dirname,
        "./", process.env.UPLOAD_IMAGE_DIR,
        imageUrl);

    file.mv(imagePath, (error) => {
        if (error) {
            const response = {
                Response: {
                    Success: "0",
                    Message: "Error uploading image.",

                }
            };
            return res.json(response)
        } else {
            return res.json({
                Response: {
                    Success: "1",
                    Message: "Success uploading image.",
                }
            })
        }
    })
}

// ------------------------------------------------------

// const nodemailer = require('nodemailer')
import nodemailer from 'nodemailer';

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
        html: `
            < !DOCTYPE html >
                <html dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
                    <head>
                        <meta charset="UTF-8">
                            <meta content="width=device-width, initial-scale=1" name="viewport">
                                <meta name="x-apple-disable-message-reformatting">
                                    <meta http-equiv="X-UA-Compatible" content="IE=edge">
                                        <meta content="telephone=no" name="format-detection">
                                            <link href="https://fonts.googleapis.com/css2?family=Rubik+Scribble&display=swap" rel="stylesheet">
                                                <link href="https://fonts.googleapis.com/css2?family=Courgette&family=Rubik+Scribble&display=swap" rel="stylesheet">
                                                    <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400..700&family=Lobster&display=swap" rel="stylesheet">
                                                        <title>Reservation Confirmation</title>
                                                        <style>
                                                            .over_all {
                                                                background: linear-gradient(to bottom, rgba(255, 215, 0, 0.9),rgba(0, 0, 0, 0.8),
                                                            rgba(0, 0, 0, 0.8),rgba(0, 0, 0, 0.8),rgba(255, 215, 0, 0.9));
                                                            background-position: center;
                                                            background-size: cover;
                                                            background-repeat: no-repeat;
                                                            border-radius: 3vh;
                                                            width: 50%;
                                                            margin-left: auto;
                                                            margin-right: auto;
                                                            padding-bottom: 3vh;
                                                            padding-top: 2vh;
          }

                                                            #logo {
                                                                display: block;
                                                            box-shadow:
                                                            0 0 10px rgba(255, 215, 0, 0.8),
                                                            0 0 20px rgba(255, 215, 0, 0.9),
                                                            0 0 20px rgba(255, 215, 0, 0.9);
                                                            border-radius: 50%;
                                                            background-color: black;
                                                            margin-top: 2vh;
                                                            padding: 1vh;
                                                            width: 14vh;
          }

                                                            h1 {
                                                                margin - top: 2vh;
                                                            margin-bottom: 0;
                                                            font-family: Lobster;
          }

                                                            .top_content {
                                                                font - size: 2.6vh;
                                                            margin-left: 5vh;
                                                            font-family: Lobster;
          }

                                                            .content {
                                                                color: white;
                                                            align-items: start;
                                                            padding-left: 5vh;
                                                            padding-right: 5vh;
          }

                                                            .bill_table {
                                                                background - image: url('https://img.freepik.com/free-vector/yellow-diagonal-geometric-striped-background-with-halftone-detailed_1409-1451.jpg?w=1380&t=st=1711880527~exp=1711881127~hmac=d6c710b52ef8ad9c099eb3e16469a5e0914d54d6e436dec891cc2e6b977cd654');
                                                            background-position: center;
                                                            background-size: cover;
                                                            background-repeat: no-repeat;
                                                            border-radius: 1vh;
                                                            width: 70%;
                                                            border: 2px solid #fcb713;
                                                            border-collapse: collapse;
                                                            margin: 0 auto;
                                                            text-align: center;
                                                            color: #000;
                                                            font-family: Courgette;
                                                            margin-top: 3vh;
          }

                                                            tr {
                                                                font - weight: 400;
                                                            font-size: 3vh;
          }

                                                            .tr_head {
                                                                font - weight: bolder;
                                                            font-size: 3vh;
          }

                                                            .btm_content {
                                                                font - size: 2.6vh;
                                                            font-family: Lobster;
          }

                                                            .footer {
                                                                display: flex;
                                                            justify-content: space-around;
                                                            width: 90%;
                                                            text-align: center;
          }

                                                            .footer_content {
                                                                color: white;
                                                            font-size: 2.6vh;
                                                            font-family: Lobster;
          }

                                                            @media all and (max-width: 425px) {
            .over_all {
                                                                background: linear-gradient(to bottom, rgba(255, 215, 0, 0.9),rgba(0, 0, 0, 0.8),
                                                            rgba(0, 0, 0, 0.8),rgba(0, 0, 0, 0.8),rgba(255, 215, 0, 0.9));
                                                            background-position: center;
                                                            background-size: cover;
                                                            background-repeat: no-repeat;
                                                            border-radius: 3vh;
                                                            width: 100%;
                                                            margin-left: auto;
                                                            margin-right: auto;
                                                            padding-bottom: 3vh;
            }
                                                            #logo {
                                                                display: block;
                                                            box-shadow:
                                                            0 0 10px rgba(255, 215, 0, 0.8),
                                                            0 0 20px rgba(255, 215, 0, 0.9),
                                                            0 0 20px rgba(255, 215, 0, 0.9);
                                                            border-radius: 50%;
                                                            background-color: black;
                                                            margin-top: 2vh;
                                                            padding: 1vh;
                                                            width: 6vh;
            }

                                                            h1 {
                                                                margin - top: 0;
                                                            margin-bottom: 0;
                                                            font-family: Lobster;
                                                            font-size: 2.5vh;
                                                            margin-top: 2vh;
            }

                                                            .top_content {
                                                                font - size: 1.6vh;
                                                            margin-left: 2vh;
                                                            font-family: Lobster;
            }

                                                            .content {
                                                                color: white;
                                                            align-items: start;
                                                            padding-left: 1.5vh;
                                                            padding-right: 1.5vh;
            }

                                                            .bill_table {
                                                                background - image: url('https://img.freepik.com/free-vector/yellow-diagonal-geometric-striped-background-with-halftone-detailed_1409-1451.jpg?w=1380&t=st=1711880527~exp=1711881127~hmac=d6c710b52ef8ad9c099eb3e16469a5e0914d54d6e436dec891cc2e6b977cd654');
                                                            background-position: center;
                                                            background-size: cover;
                                                            background-repeat: no-repeat;
                                                            border-radius: 1vh;
                                                            width: 100%;
                                                            border: 2px solid #fcb713;
                                                            border-collapse: collapse;
                                                            margin: 0 auto;
                                                            text-align: center;
                                                            color: #000;
                                                            font-family: Courgette;
                                                            margin-top: 3vh;
            }

                                                            tr {
                                                                font - weight: 400;
                                                            font-size: 1.6vh;
            }

                                                            .tr_head {
                                                                font - weight: bolder;
                                                            font-size: 2vh;
            }

                                                            .btm_content {
                                                                font - size: 1.6vh;
                                                            font-family: Lobster;
            }

                                                            .footer {
                                                                display: flex;
                                                            flex-direction: row;
                                                            justify-content: space-around;
                                                            width: 100%;
                                                            text-align: center;
            }

                                                            .footer_content {
                                                                color: white;
                                                            font-size: 1.6vh;
                                                            font-family: Lobster;
            }
          }
                                                        </style>
                                                    </head>

                                                    <body>
                                                        <div class="over_all">
                                                            <table style="text-align: center; margin: 0 auto;">
                                                                <tr>
                                                                    <td style="display: flex; justify-content: center;">
                                                                        <img id="logo" class="adapt-img esdev-stretch-width esdev-banner-rendered"
                                                                            src="http://hifivecafe.com/wp-content/uploads/2021/03/Hifive-Logo-1.png" alt="title">
                                                                    </td>
                                                                </tr>
                                                            </table>

                                                            <div class="content">
                                                                <h1>Dear Customer , welcome to Hifive</h1>
                                                                <p class="top_content">We are thrilled to inform you that your table reservation has been successfully confirmed! Thank you for choosing Hifive Cafe for your special occasion.</p>

                                                                <h2>Reservation Details</h2>
                                                                <h6>${reservationDetails.reservation_type}</h6>
                                                                <p class="top_content">
                                                                    Reservation Category: ${reservationDetails.cat_title}<br>
                                                                        Price Range: ${reservationDetails.price_range}<br>
                                                                            Reservation Sub Category: ${reservationDetails.sub_tilte}<br>
                                                                                Sub Category Price Range: ${reservationDetails.sub_cat_price_range}<br>
                                                                                    Booking  Date: ${new Date(reservationDetails.date).toLocaleDateString()}<br>
                                                                                        Booking Time: ${reservationDetails.time}<br>
                                                                                            Name: ${reservationDetails.name}<br>
                                                                                                Email: ${reservationDetails.email}<br>
                                                                                                    Mobile: ${reservationDetails.mobile}
                                                                                                </p>

                                                                                                <p class="btm_content">
                                                                                                    Please review the details above and let us know if there are any discrepancies or if you require any further modifications.
                                                                                                    <br><br>
                                                                                                        Your reservation is scheduled for the mentioned date and time. We look forward to serving you.
                                                                                                        <br><br>
                                                                                                            Should you have any questions or concerns regarding your reservation, feel free to reach out to us at the below contact number.
                                                                                                        </p>

                                                                                                            <div class="footer">
                                                                                                                <p class="footer_content">📞9940888633</p>
                                                                                                                <p class="footer_content">📧contact@hifivecafe.com</p>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    </body>
                                                                                                </html>
                                                                                                `
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


// ----------------------------------------------------------------------------
async function birthdaymailbooking(id) {
    const booking_id = id

    let arrayresponse = [];
    let response;

    try {
        const sql = ` SELECT * FROM reservation_booking WHERE booking_status = "W" AND booking_id = ?`;
        const executequerysql = await executeQuery(sql, [booking_id]);
        response = {
            reservation_id: executequerysql[0].reservation_id,
            reservation_catid: executequerysql[0].reservation_catid,
            reservation_sub_catid: executequerysql[0].reservation_sub_catid,
            user_id: executequerysql[0].user_id,
            date: executequerysql[0].date,
            time: executequerysql[0].time,
            menu_type: executequerysql[0].menu_type,
            reservation_type: executequerysql[0].reservation_type == "TA" ? "Table Booking" : executequerysql[0].reservation_type == "CL" ? "Candle Light Dinner" : executequerysql[0].reservation_type == "BP" ? "BIRTHDAY PARTY" : "",
            photo_shoot: executequerysql[0].photo_shoot,
            bouquet: executequerysql[0].bouquet,
            fire_crackers: executequerysql[0].fire_crackers,
            balloon: executequerysql[0].balloon,
            cake_shape: executequerysql[0].cake_shape,
            cake_decription: executequerysql[0].cake_decription,
            final_amt: executequerysql[0].final_amt,
            flavour: executequerysql[0].flavour,
        }

        const sql2 = `SELECT cat_title, price_range FROM reservation_category WHERE cat_id = ?`;
        const executequerysql2 = await executeQuery(sql2, [response.reservation_catid]);
        if (executequerysql2.length > 0) {
            Object.assign(response, executequerysql2[0]);
        }

        const sql3 = ` SELECT sub_tilte, sub_cat_price_range FROM reservation_sub_category WHERE reser_sub_id = ?`;
        const executequerysql3 = await executeQuery(sql3, [response.reservation_sub_catid]);
        if (executequerysql3.length > 0) {
            Object.assign(response, executequerysql3[0]);
        }

        const sql4 = `SELECT name, email, mobile FROM users WHERE id = ?`;
        const executequerysql4 = await executeQuery(sql4, [response.user_id]);
        if (executequerysql4.length > 0) {
            Object.assign(response, executequerysql4[0]);
        }

        arrayresponse.push(response);
        console.log(arrayresponse)
        await birthday_mailcodefunction(arrayresponse)

    } catch (error) {
        console.error("Error executing query:", error);

    }
}

async function birthday_mailcodefunction(data) {
    const reservationDetails = data[0]
    var mailOptions = {
        from: 'boopathiperiyasamy2@gmail.com',
        to: 'gowthamjohnson6@gmail.com',
        subject: 'Reservation Confirmation',
        html: `
                                                                                                <!DOCTYPE html>
                                                                                                <html dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
                                                                                                    <head>
                                                                                                        <meta charset="UTF-8">
                                                                                                            <meta content="width=device-width, initial-scale=1" name="viewport">
                                                                                                                <meta name="x-apple-disable-message-reformatting">
                                                                                                                    <meta http-equiv="X-UA-Compatible" content="IE=edge">
                                                                                                                        <meta content="telephone=no" name="format-detection">
                                                                                                                            <link href="https://fonts.googleapis.com/css2?family=Rubik+Scribble&display=swap" rel="stylesheet">
                                                                                                                                <link href="https://fonts.googleapis.com/css2?family=Courgette&family=Rubik+Scribble&display=swap" rel="stylesheet">
                                                                                                                                    <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400..700&family=Lobster&display=swap" rel="stylesheet">
                                                                                                                                        <title>Reservation Confirmation</title>
                                                                                                                                        <style>
                                                                                                                                            .over_all {
                                                                                                                                                background: linear-gradient(to bottom, rgba(255, 215, 0, 0.9),rgba(0, 0, 0, 0.8),
                                                                                                                                            rgba(0, 0, 0, 0.8),rgba(0, 0, 0, 0.8),rgba(255, 215, 0, 0.9));
                                                                                                                                            background-position: center;
                                                                                                                                            background-size: cover;
                                                                                                                                            background-repeat: no-repeat;
                                                                                                                                            border-radius: 3vh;
                                                                                                                                            width: 50%;
                                                                                                                                            margin-left: auto;
                                                                                                                                            margin-right: auto;
                                                                                                                                            padding-bottom: 3vh;
                                                                                                                                            padding-top: 2vh;
          }

                                                                                                                                            #logo {
                                                                                                                                                display: block;
                                                                                                                                            box-shadow:
                                                                                                                                            0 0 10px rgba(255, 215, 0, 0.8),
                                                                                                                                            0 0 20px rgba(255, 215, 0, 0.9),
                                                                                                                                            0 0 20px rgba(255, 215, 0, 0.9);
                                                                                                                                            border-radius: 50%;
                                                                                                                                            background-color: black;
                                                                                                                                            margin-top: 2vh;
                                                                                                                                            padding: 1vh;
                                                                                                                                            width: 14vh;
          }

                                                                                                                                            h1 {
                                                                                                                                                margin - top: 2vh;
                                                                                                                                            margin-bottom: 0;
                                                                                                                                            font-family: Lobster;
          }

                                                                                                                                            .top_content {
                                                                                                                                                font - size: 2.6vh;
                                                                                                                                            margin-left: 5vh;
                                                                                                                                            font-family: Lobster;
          }

                                                                                                                                            .content {
                                                                                                                                                color: white;
                                                                                                                                            align-items: start;
                                                                                                                                            padding-left: 5vh;
                                                                                                                                            padding-right: 5vh;
          }

                                                                                                                                            .bill_table {
                                                                                                                                                background - image: url('https://img.freepik.com/free-vector/yellow-diagonal-geometric-striped-background-with-halftone-detailed_1409-1451.jpg?w=1380&t=st=1711880527~exp=1711881127~hmac=d6c710b52ef8ad9c099eb3e16469a5e0914d54d6e436dec891cc2e6b977cd654');
                                                                                                                                            background-position: center;
                                                                                                                                            background-size: cover;
                                                                                                                                            background-repeat: no-repeat;
                                                                                                                                            border-radius: 1vh;
                                                                                                                                            width: 70%;
                                                                                                                                            border: 2px solid #fcb713;
                                                                                                                                            border-collapse: collapse;
                                                                                                                                            margin: 0 auto;
                                                                                                                                            text-align: center;
                                                                                                                                            color: #000;
                                                                                                                                            font-family: Courgette;
                                                                                                                                            margin-top: 3vh;
          }

                                                                                                                                            tr {
                                                                                                                                                font - weight: 400;
                                                                                                                                            font-size: 3vh;
          }

                                                                                                                                            .tr_head {
                                                                                                                                                font - weight: bolder;
                                                                                                                                            font-size: 3vh;
          }

                                                                                                                                            .btm_content {
                                                                                                                                                font - size: 2.6vh;
                                                                                                                                            font-family: Lobster;
          }

                                                                                                                                            .footer {
                                                                                                                                                display: flex;
                                                                                                                                            justify-content: space-around;
                                                                                                                                            width: 90%;
                                                                                                                                            text-align: center;
          }

                                                                                                                                            .footer_content {
                                                                                                                                                color: white;
                                                                                                                                            font-size: 2.6vh;
                                                                                                                                            font-family: Lobster;
          }

                                                                                                                                            @media all and (max-width: 425px) {
            .over_all {
                                                                                                                                                background: linear-gradient(to bottom, rgba(255, 215, 0, 0.9),rgba(0, 0, 0, 0.8),
                                                                                                                                            rgba(0, 0, 0, 0.8),rgba(0, 0, 0, 0.8),rgba(255, 215, 0, 0.9));
                                                                                                                                            background-position: center;
                                                                                                                                            background-size: cover;
                                                                                                                                            background-repeat: no-repeat;
                                                                                                                                            border-radius: 3vh;
                                                                                                                                            width: 100%;
                                                                                                                                            margin-left: auto;
                                                                                                                                            margin-right: auto;
                                                                                                                                            padding-bottom: 3vh;
            }
                                                                                                                                            #logo {
                                                                                                                                                display: block;
                                                                                                                                            box-shadow:
                                                                                                                                            0 0 10px rgba(255, 215, 0, 0.8),
                                                                                                                                            0 0 20px rgba(255, 215, 0, 0.9),
                                                                                                                                            0 0 20px rgba(255, 215, 0, 0.9);
                                                                                                                                            border-radius: 50%;
                                                                                                                                            background-color: black;
                                                                                                                                            margin-top: 2vh;
                                                                                                                                            padding: 1vh;
                                                                                                                                            width: 6vh;
            }

                                                                                                                                            h1 {
                                                                                                                                                margin - top: 0;
                                                                                                                                            margin-bottom: 0;
                                                                                                                                            font-family: Lobster;
                                                                                                                                            font-size: 2.5vh;
                                                                                                                                            margin-top: 2vh;
            }

                                                                                                                                            .top_content {
                                                                                                                                                font - size: 1.6vh;
                                                                                                                                            margin-left: 2vh;
                                                                                                                                            font-family: Lobster;
            }

                                                                                                                                            .content {
                                                                                                                                                color: white;
                                                                                                                                            align-items: start;
                                                                                                                                            padding-left: 1.5vh;
                                                                                                                                            padding-right: 1.5vh;
            }

                                                                                                                                            .bill_table {
                                                                                                                                                background - image: url('https://img.freepik.com/free-vector/yellow-diagonal-geometric-striped-background-with-halftone-detailed_1409-1451.jpg?w=1380&t=st=1711880527~exp=1711881127~hmac=d6c710b52ef8ad9c099eb3e16469a5e0914d54d6e436dec891cc2e6b977cd654');
                                                                                                                                            background-position: center;
                                                                                                                                            background-size: cover;
                                                                                                                                            background-repeat: no-repeat;
                                                                                                                                            border-radius: 1vh;
                                                                                                                                            width: 100%;
                                                                                                                                            border: 2px solid #fcb713;
                                                                                                                                            border-collapse: collapse;
                                                                                                                                            margin: 0 auto;
                                                                                                                                            text-align: center;
                                                                                                                                            color: #000;
                                                                                                                                            font-family: Courgette;
                                                                                                                                            margin-top: 3vh;
            }

                                                                                                                                            tr {
                                                                                                                                                font - weight: 400;
                                                                                                                                            font-size: 1.6vh;
            }

                                                                                                                                            .tr_head {
                                                                                                                                                font - weight: bolder;
                                                                                                                                            font-size: 2vh;
            }

                                                                                                                                            .btm_content {
                                                                                                                                                font - size: 1.6vh;
                                                                                                                                            font-family: Lobster;
            }

                                                                                                                                            .footer {
                                                                                                                                                display: flex;
                                                                                                                                            flex-direction: row;
                                                                                                                                            justify-content: space-around;
                                                                                                                                            width: 100%;
                                                                                                                                            text-align: center;
            }

                                                                                                                                            .footer_content {
                                                                                                                                                color: white;
                                                                                                                                            font-size: 1.6vh;
                                                                                                                                            font-family: Lobster;
            }
          }
                                                                                                                                        </style>
                                                                                                                                    </head>

                                                                                                                                    <body>
                                                                                                                                        <div class="over_all">
                                                                                                                                            <table style="text-align: center; margin: 0 auto;">
                                                                                                                                                <tr>
                                                                                                                                                    <td style="display: flex; justify-content: center;">
                                                                                                                                                        <img id="logo" class="adapt-img esdev-stretch-width esdev-banner-rendered"
                                                                                                                                                            src="http://hifivecafe.com/wp-content/uploads/2021/03/Hifive-Logo-1.png" alt="title">
                                                                                                                                                    </td>
                                                                                                                                                </tr>
                                                                                                                                            </table>

                                                                                                                                            <div class="content">
                                                                                                                                                <h1>Dear Customer , welcome to Hifive</h1>
                                                                                                                                                <p class="top_content">We are thrilled to inform you that your table reservation has been successfully confirmed! Thank you for choosing Hifive Cafe for your special occasion.</p>

                                                                                                                                                <h2>Reservation Details</h2>
                                                                                                                                                <h6>${reservationDetails.reservation_type}</h6>
                                                                                                                                                <p class="top_content">
                                                                                                                                                    Reservation Category: ${reservationDetails.cat_title}<br>
                                                                                                                                                        Price Range: ${reservationDetails.price_range}<br>
                                                                                                                                                            Reservation Sub Category: ${reservationDetails.sub_tilte}<br>
                                                                                                                                                                Reservation Category: ${reservationDetails.cat_title}<br>
                                                                                                                                                                    photo_shoot : ${reservationDetails.photo_shoot}<br>
                                                                                                                                                                        bouquet: ${reservationDetails.fire_crackers}<br>
                                                                                                                                                                            fire_crackers: ${reservationDetails.cat_title}<br>
                                                                                                                                                                                balloon: ${reservationDetails.balloon}<br>
                                                                                                                                                                                    cake_shape: ${reservationDetails.cake_shape}<br>
                                                                                                                                                                                        cake_decription: ${reservationDetails.cake_decription}<br>
                                                                                                                                                                                            final_amt: ${reservationDetails.final_amt}<br>
                                                                                                                                                                                                flavour: ${reservationDetails.flavour}<br>
                                                                                                                                                                                                    Sub Category Price Range: ${reservationDetails.sub_cat_price_range}<br>
                                                                                                                                                                                                        Booking  Date: ${new Date(reservationDetails.date).toLocaleDateString()}<br>
                                                                                                                                                                                                            Booking Time: ${reservationDetails.time}<br>
                                                                                                                                                                                                                Name: ${reservationDetails.name}<br>
                                                                                                                                                                                                                    Email: ${reservationDetails.email}<br>
                                                                                                                                                                                                                        Mobile: ${reservationDetails.mobile}
                                                                                                                                                                                                                    </p>

                                                                                                                                                                                                                    <p class="btm_content">
                                                                                                                                                                                                                        Please review the details above and let us know if there are any discrepancies or if you require any further modifications.
                                                                                                                                                                                                                        <br><br>
                                                                                                                                                                                                                            Your reservation is scheduled for the mentioned date and time. We look forward to serving you.
                                                                                                                                                                                                                            <br><br>
                                                                                                                                                                                                                                Should you have any questions or concerns regarding your reservation, feel free to reach out to us at the below contact number.
                                                                                                                                                                                                                            </p>

                                                                                                                                                                                                                                <div class="footer">
                                                                                                                                                                                                                                    <p class="footer_content">📞9940888633</p>
                                                                                                                                                                                                                                    <p class="footer_content">📧contact@hifivecafe.com</p>
                                                                                                                                                                                                                                </div>
                                                                                                                                                                                                                            </div>
                                                                                                                                                                                                                        </div>
                                                                                                                                                                                                                        </body>
                                                                                                                                                                                                                    </html>
                                                                                                                                                                                                                    `
    };

    // Send email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
            res.status(200).send('Internal Server Error');
        } else {
            console.log('Email sent: ' + info.response);
            res.status(200).send('Email sent successfully');
        }
    });
}


app.listen(3004)

