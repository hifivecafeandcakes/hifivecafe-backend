import con from "./db.js";

export async function executeQuery(query, values) {
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