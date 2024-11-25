import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import fileupload from 'express-fileupload'
import dotenv from 'dotenv'


import userRouter from './routes/userRouter.js';
import adminRouter from './routes/adminRouter.js';

// Use the website router
const app = express()
app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(fileupload())

dotenv.config()

app.use("/" + process.env.UPLOAD_IMAGE_DIR, express.static(process.env.UPLOAD_IMAGE_DIR));
app.use("/" + process.env.UPLOAD_VIDEO_DIR, express.static(process.env.UPLOAD_VIDEO_DIR));


app.get("/backend/test", (req, res) => {
    console.log("Connected to database");
    res.send("success");
})

app.use('/backend/website', userRouter);

// Use the admin router
app.use('/backend/admin', adminRouter);









app.listen(3004)
