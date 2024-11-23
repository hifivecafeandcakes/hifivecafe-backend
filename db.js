import mysql from 'mysql';
import dotenv from 'dotenv'
dotenv.config()

// Create a MySQL connection
const con = mysql.createConnection({
    host: process.env.DBHOST,
    port: process.env.DBPORT,
    user: process.env.DBUSER,
    password: process.env.DBPASSWORD,
    database: process.env.DBNAME,
});

// Connect to the database
con.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
        process.exit(1); // Exit the application on connection error
    } else {
        console.log('Connected to the database!');
    }
});

export default con;
