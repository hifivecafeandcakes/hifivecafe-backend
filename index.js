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



// Website

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


app.get("/website/reservation/list", async (req, res) => {
    const reser_id = req.query.reser_id
    let sql;
    let objfile = {};
    let Arrayresposne = [];
    if (!reser_id) {
        sql = `select * from reservation where status="Active"`
    } else {
        sql = `select * from reservation where status="Active" and reser_id=${reser_id}`
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

        const response = { Response: { Success: "1", message: "Success", result: result } };
        return res.json(response);
    }
    else {
        const response = { Response: { Success: "0", message: "No Records!", } };
        return res.json(response);
    }
})


app.get("/website/reservation/category/list", async (req, res) => {

    const reser_id = req.query.reser_id;

    let objfile = {};
    let Arrayresposne = [];

    const sql = `SELECT reservation.reser_main_title,reservation.reser_id,reservation.reser_image,reservation.reser_title,reservation.reser_videos
        FROM reservation
        JOIN reservation_category ON reservation.reser_id = reservation_category.reser_id
        WHERE reservation.status = 'Active' AND reservation_category.status = 'Active'
        AND reservation.reser_id = ${reser_id}`

    const executesql = await executeQuery(sql)

    if (executesql.length > 0) {
        objfile['video'] = baseVideoUrl + executesql[0].videos;
        objfile['reser_img'] = baseImageUrl + executesql[0].reser_image;
        objfile['reser_main_title'] = executesql[0].reser_main_title;
        objfile['reser_title'] = executesql[0].reser_title;
        objfile['reser_id'] = executesql[0].reser_id;

        let reservationcategorysql = `select * from reservation_category where status="Active" and reser_id=${reser_id}`
        const executereservationcategorysql = await executeQuery(reservationcategorysql)

        if (executereservationcategorysql.length > 0) {
            const result = executereservationcategorysql.map((item) => {
                return {
                    cat_id: item.cat_id,
                    cat_title: item.cat_title,
                    price_range: item.price_range,
                    cat_image: baseImageUrl + item.cat_image,
                    status: item.status,
                    created_at: item.created_at,
                    updated_at: item.updated_at,
                };
            });
            objfile['reservation_category_list'] = result;
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


app.get("/website/reservation/subcategory/list", async (req, res) => {

    const reser_id = req.query.reser_id;
    const resercat_id = req.query.resercat_id;

    let objfile = {};
    let Arrayresposne = [];

    const sql = `SELECT reservation.reser_main_title,reservation.reser_videos,reservation.reser_image,reservation.reser_title,reservation.reser_id,reservation_category.cat_title,reservation_category.cat_id FROM reservation JOIN reservation_category ON reservation.reser_id = reservation_category.reser_id WHERE reservation.status = 'Active' AND reservation_category.status = 'Active' AND reservation.reser_id = ${reser_id} AND reservation_category.cat_id=${resercat_id}`

    const executesql = await executeQuery(sql)

    if (executesql.length > 0) {
        objfile['video'] = baseVideoUrl + executesql[0].reser_videos;
        objfile['reser_img'] = baseImageUrl + executesql[0].reser_image;
        objfile['reser_main_title'] = executesql[0].reser_main_title;
        objfile['reser_title'] = executesql[0].reser_title;
        objfile['reser_id'] = executesql[0].reser_id;
        objfile['cat_id'] = executesql[0].cat_id;
        objfile['reser_subtitle'] = executesql[0].cat_title;

        let reservationcategorysql = `select * from reservation_sub_category where status="Active" and reser_id=${reser_id} AND reser_cat_id=${resercat_id}`
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



app.get("/website/reservation/category/subcategory", async (req, res) => {
    try {
        let objfile = {};
        let Arrayresposne = [];

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
            reservation.reser_title,
            reservation.reser_main_title,
            reservation.description,
            reservation_category.cat_title,
            reservation_category.cat_image 
        from reservation_sub_category
        JOIN reservation_category ON reservation_category.cat_id = reservation_sub_category.reser_cat_id
        JOIN reservation ON reservation.reser_id = reservation_category.reser_id
        where reservation.status = "Active" and reservation_category.status = "Active" and reservation_sub_category.status = "Active" and reservation_sub_category.reser_sub_id = ${reser_sub_id} `
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

                };
            });
            objfile['reservation_subcategory'] = result;
            Arrayresposne.push(objfile)

            const response = { Response: { Success: "1", message: "Success", result: Arrayresposne } }
            res.send(response)

        } else {
            const response = { Response: { Success: "0", message: "No Records!", } };
            return res.json(response);
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: '0', message: error.message, });
    }
})

// ------------------------------------------------------------------reservation booking api

app.post("/website/reservation/booking/create", async (req, res) => {

    let { userid } = req.body;
    if (!userid) { return res.send({ Response: { success: '0', message: "User Id is required!", } }); }


    let userInfo = await getUserInfo(userid);
    if (userInfo == null || !userInfo.user_id) { return res.send({ Response: { success: '0', message: "User Info is required!", } }); }

    if (!await validateEncrypt(userInfo.ENCRYPT_KEY)) {
        return res.send({ Response: { success: '0', message: "Key Validation Error", result: [] } });
    }

    userid = userInfo.user_id;
    // let userid = 61008;
    console.log(userid);

    const userResult = await executeQuery(`SELECT * FROM users WHERE id = ?`, [userid]); //check user exist in DB   
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
                    // await mailbooking(reservationId, res)
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
                    return res.json({ Response: { Success: "0", Message: "Booking failed" } });
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
app.post("/website/reservation/booking/update", async (req, res) => {

    console.log(req.body);
    const { razorpay_payment_status, booking_id, razorpay_payment_id } = req.body;
    let { userid } = req.body;

    let userInfo = await getUserInfo(userid);
    if (userInfo == null || !userInfo.user_id) { return res.send({ Response: { success: '0', message: "User Info is required!", } }); }
    userid = userInfo.user_id;

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
app.post("/website/order/api", async (req, res) => {
    try {
        let { userid } = req.body;
        // let userid = 61008;
        let userInfo = await getUserInfo(userid);
        if (userInfo == null || !userInfo.user_id) { return res.send({ Response: { success: '0', message: "User Info is required!", } }); }
        userid = userInfo.user_id;
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
            reservation_booking.created_at,
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
        where reservation_sub_category.status = "Active" ORDER BY reservation_booking.created_at DESC`;

        const executereservationbookingsql = await executeQuery(reservationbookingsql)

        if (executereservationbookingsql.length > 0) {
            const result = executereservationbookingsql.map((item) => {
                const extraImages = JSON.parse(item.sub_extra_img).map(imageName => baseImageUrl + imageName);
                const veg_images = JSON.parse(item.veg_images).map(imageName => baseImageUrl + imageName);
                const nonveg_images = JSON.parse(item.nonveg_images).map(imageName => baseImageUrl + imageName);

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
                    booking_created_at: format(new Date(item.created_at), 'yyyy-MM-dd HH:ii:ss'),


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

async function getUserInfo(v) {
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




app.listen(3004)

