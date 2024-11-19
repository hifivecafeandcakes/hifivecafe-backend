import express from 'express'
const router = express.Router();

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

        password = encryptData(password.toString());
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

// Export the router
module.exports = router;
