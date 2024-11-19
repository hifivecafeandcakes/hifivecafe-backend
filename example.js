//admin reservation list 
app.get("/admin/reservation/subcategory/list", async (req, res) => {

    let sql = `select reservation_sub_category.* reservation_category.cat_title as cat_title, reservation.reser_main_title as reser_title from reservation_sub_category LEFT JOIN reservation_category ON reservation_sub_category.reser_cat_id = reservation_category.reser_id LEFT JOIN reservation ON reservation.reser_id = reservation_category.reser_id order by reservation_sub_category.reser_cat_id_id ASC`
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
    let sql = `select reservation_sub_category.* reservation_category.cat_title as cat_title, reservation.reser_main_title as reser_title from reservation_sub_category LEFT JOIN reservation_category ON reservation_sub_category.reser_cat_id = reservation_category.reser_id LEFT JOIN reservation ON reservation.reser_id = reservation_category.reser_id where reser_sub_id=${id}`
    const exesqlquery = await executeQuery(sql)

    if (exesqlquery.length > 0) {

        const firstimgurl = baseImageUrl;
        const Arrayimgurl = baseImageUrl;

        const result = exesqlquery.map((item) => {
            const extraImages = (item.sub_extra_img != "" && item.sub_extra_img != null) ? JSON.parse(item.sub_extra_img).map(imageName => Arrayimgurl + imageName) : [];

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
        const { sub_tilte, reser_cat_id, reser_id, sub_cat_price_range, veg_menus, nonveg_menus, status } = req.body;
        const sub_img = req.files && req.files.sub_img ? req.files.sub_img : null;
        const extra_imgs = req.files && req.files.img ? (Array.isArray(req.files.img) ? req.files.img : [req.files.img]) : [];
        const veg_images = req.files ? (Array.isArray(req.files.veg_images) ? req.files.veg_images : [req.files.veg_images]) : [];
        const nonveg_images = req.files ? (Array.isArray(req.files.nonveg_images) ? req.files.nonveg_images : [req.files.nonveg_images]) : [];
        // console.log(reser_img);
        // console.log(video);
        console.log(extra_imgs);
        // Validate required fields
        if (!sub_tilte || !reser_cat_id || !reser_id || !sub_img || !sub_cat_price_range) { return res.json({ Response: { Success: '0', message: "All Feilds required!" } }); }
        if (!sub_img) { return res.json({ Response: { Success: '0', message: "Reservation subcategory image is required!" } }); }

        if (veg_images.length <= 0 && nonveg_images.length <= 0 && veg_menus.length <= 0 && nonveg_menus.length <= 0) {
            return res.json({ success: '0', message: "veg, Non-veg menus and images required", });
        }
        await imageValidation(reser_img);
        // Move and handle main image
        const imageUrl = await moveImage(sub_img);
        console.log("imageUrl");
        console.log(imageUrl);
        // Move and handle extra images
        let imges = null;
        if (extra_imgs.length > 0) {
            const uploadedFiles = await Promise.all(extra_imgs.map(moveImage));
            imges = JSON.stringify(uploadedFiles);
        }
        console.log("imges"); console.log(imges);

        let veg_images_imges = null;
        if (veg_images.length > 0) {
            const uploadedFiles = await Promise.all(veg_images.map(moveImage));
            imges = JSON.stringify(uploadedFiles);
        }
        console.log("veg_images_imges"); console.log(veg_images_imges);

        let nonveg_images_imges = null;
        if (nonveg_images.length > 0) {
            const uploadedFiles = await Promise.all(nonveg_images.map(moveImage));
            imges = JSON.stringify(uploadedFiles);
        }
        console.log("nonveg_images_imges"); console.log(nonveg_images_imges);

        //vegmenu and nonmenu stringify
        const veg_menus_str = JSON.stringify(veg_menus);
        const nonveg_menus_str = JSON.stringify(nonveg_menus);
        const formattedDate = new Date();

        // Insert data into MySQL table
        const insert_sql = `INSERT INTO reservation_sub_category (sub_tilte, reser_cat_id, reser_id, sub_img,sub_extra_img,veg_images,nonveg_images, sub_cat_price_range,veg_menus,nonveg_menus,status,created_at) VALUES (?, ?, ?, ?, ?,?,?,?,?,?,?)`;
        const insert_sqlValues = [sub_tilte, reser_cat_id, reser_id, imageUrl, imges, veg_images_imges, nonveg_images_imges, sub_cat_price_range, veg_menus_str, nonveg_menus_str, status, formattedDate];

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
        const { id, sub_tilte, reser_cat_id, reser_id, sub_cat_price_range, veg_menus, nonveg_menus, status } = req.body;
        const sub_img = req.files && req.files.sub_img ? req.files.sub_img : null;
        const extra_imgs = req.files && req.files.img ? (Array.isArray(req.files.img) ? req.files.img : [req.files.img]) : [];
        const veg_images = req.files ? (Array.isArray(req.files.veg_images) ? req.files.veg_images : [req.files.veg_images]) : [];
        const nonveg_images = req.files ? (Array.isArray(req.files.nonveg_images) ? req.files.nonveg_images : [req.files.nonveg_images]) : [];
        // console.log(reser_img);

        let deleteImgs = (req.body.deleteImgs) ? (typeof req.body.deleteImgs === 'string') ? [req.body.deleteImgs] : req.body.deleteImgs : [];
        let deleteVegImages = (req.body.deleteVegImages) ? (typeof req.body.deleteVegImages === 'string') ? [req.body.deleteVegImages] : req.body.deleteVegImages : [];
        let deleteNonVegImages = (req.body.deleteNonVegImages) ? (typeof req.body.deleteNonVegImages === 'string') ? [req.body.deleteNonVegImages] : req.body.deleteNonVegImages : [];

        const res_rec = await executeQuery(`select * from reservation_sub_category where reser_sub_id=${id}`)
        if (res_rec.length <= 0) { return res.json({ Response: { Success: '0', message: "Reservation sub category Record Not Found" } }); }
        // Validate required fields
        if (!sub_tilte || !reser_cat_id || !reser_id || !sub_img || !sub_cat_price_range) { return res.json({ Response: { Success: '0', message: "All Feilds required!" } }); }
        if (!sub_img) { return res.json({ Response: { Success: '0', message: "Reservation subcategory image is required!" } }); }

        if (veg_menus.length <= 0 && nonveg_menus.length <= 0) {
            return res.json({ success: '0', message: "veg, Non-veg menus required", });
        }

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


        let veg_images_imges = JSON.parse(res_rec[0].veg_images);
        if (deleteImgs?.length > 0) {
            for (const element of deleteImgs) {
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



        let nonveg_images_imges = JSON.parse(res_rec[0].nonveg_images);
        if (deleteImgs?.length > 0) {
            for (const element of deleteImgs) {
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
        const veg_menus_str = JSON.stringify(veg_menus);
        const nonveg_menus_str = JSON.stringify(nonveg_menus);
        const formattedDate = new Date();
        const update_sql = `UPDATE reservation_sub_category SET sub_tilte=?, reser_cat_id=?, reser_id=?, sub_img=?,sub_extra_img=?,veg_images=?,nonveg_images=?, sub_cat_price_range=?,veg_menus=?,nonveg_menus=?,  status=?, updated_at = ? WHERE reser_sub_id = ?`;
        const update_sqlValues = [sub_tilte, reser_cat_id, reser_id, imageUrl, imges, veg_images_imges, nonveg_images_imges, sub_cat_price_range, veg_menus_str, nonveg_menus_str, status, formattedDate];
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

    let sub_image = deletingRecord[0].sub_image;
    let extra_img = deletingRecord[0].sub_extra_img;
    let veg_images = deletingRecord[0].veg_images;
    let nonveg_images = deletingRecord[0].nonveg_images;

    console.log(sub_image);
    console.log(extra_img);

    if (sub_image != "" && sub_image != null) {
        await deleteImage("reservation_sub_category", "reser_sub_id", id, "sub_image");
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


app.post("/admin/category/select", async (req, res) => {
    const { reser_id } = req.body;

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