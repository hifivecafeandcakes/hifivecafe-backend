import con from "./db.js";
import logger from "./logger.js";

export async function executeQuery(query, values, route_name = "") {
    return new Promise((resolve, reject) => {
        con.query(query, values, (error, result) => {
            if (error) {
                logger.error(`Start Route: "${route_name}"`);
                logger.error(`MySQL Error: ${error.message}`);
                logger.error(`SQL Query: ${query}`);
                logger.error(`Values: ${JSON.stringify(values)}`);

                let stackLines = error.stack?.split('\n') || [];
                let errorLine = stackLines[1]?.trim();
                if (errorLine) {
                    logger.error(`Error occurred at: ${errorLine}`);
                }
                logger.error(`End Route: "${route_name}"`);
                reject(error);
            } else {
                logger.success(`DB Record Event Done Route: "${route_name}"`);
                resolve(result);
            }
        });
    });
}