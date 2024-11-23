import fs from 'fs';
import { baseImageUrl, baseVideoUrl, deleteImageUrl, deleteVideoUrl } from './constants.js';
import { executeQuery } from './dbHelper.js';
import path from 'path'
import dotenv from 'dotenv'
dotenv.config()

export async function deleteImage(table, record_name, record_id, img_name) {
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

export async function deleteVideoFile(table, record_name, record_id, video_name) {
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

export async function deleteImageByValue(table, record_name, record_id, img_name, img) {
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


export async function moveImage(image) {
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

export async function moveVideo(video) {
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