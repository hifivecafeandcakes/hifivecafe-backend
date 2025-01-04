import winston from 'winston';
import path from 'path';
import fs from 'fs';


// Generate log folder and file name
const logFolder = path.resolve('logs'); // Specify the folder for logs
if (!fs.existsSync(logFolder)) {
    fs.mkdirSync(logFolder); // Create the folder if it doesn't exist
}

const today = new Date().toISOString().split('T')[0]; // Get the date in YYYY-MM-DD format
const logFileName = `${today}.log`; // Use the date as the file name
const logFilePath = path.join(logFolder, logFileName); // Full path to the log file

const indianTimestamp = () => {
    return new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
};

const customLevels = {
    levels: {
        error: 0,
        warn: 1,
        success: 2, // Add a custom "success" level
        info: 3,
        verbose: 4,
        debug: 5,
    },
    colors: {
        error: 'red',
        warn: 'yellow',
        success: 'green', // Assign a color to "success"
        info: 'blue',
        verbose: 'cyan',
        debug: 'magenta',
    },
};

// Add colors for custom log levels
winston.addColors(customLevels.colors);


const logger = winston.createLogger({
    levels: customLevels.levels, // Use custom levels
    level: 'debug', // Minimum level to log
    format: winston.format.combine(
        winston.format.timestamp({ format: indianTimestamp }), // Use custom timestamp
        winston.format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] [${level.toUpperCase()}]: ${message}`;
        })
    ),
    transports: [
        // new winston.transports.Console({
        //     format: winston.format.combine(
        //         winston.format.colorize(), // Enable colorization for console
        //         winston.format.printf(({ timestamp, level, message }) => {
        //             return `[${timestamp}] [${level.toUpperCase()}]: ${message}`;
        //         })
        //     ),
        // }),
        new winston.transports.File({
            filename: logFilePath,
            format: winston.format.combine(
                winston.format.uncolorize(), // Disable colorization for file
                winston.format.printf(({ timestamp, level, message }) => {
                    return `[${timestamp}] [${level.toUpperCase()}]: ${message}`;
                })
            ),
        }),
    ],
});




export default logger; // Export as default
