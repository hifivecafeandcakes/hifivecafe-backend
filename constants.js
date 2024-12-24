import dotenv from 'dotenv';
dotenv.config();

export const baseImageUrl = process.env.NODE_APP_API_URL + "/" + process.env.UPLOAD_IMAGE_DIR + "/";
export const baseVideoUrl = process.env.NODE_APP_API_URL + "/" + process.env.UPLOAD_VIDEO_DIR + "/";
export const deleteImageUrl = process.env.UPLOAD_IMAGE_DIR + "\\";
export const deleteVideoUrl = process.env.UPLOAD_VIDEO_DIR + "\\";
