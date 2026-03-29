const mysql = require('mysql2');
require('dotenv').config();

const defaultSsl = { rejectUnauthorized: false };

function getDbConfig() {
    if (process.env.DATABASE_URL) {
        const parsed = new URL(process.env.DATABASE_URL);
        return {
            host: parsed.hostname,
            user: decodeURIComponent(parsed.username || ''),
            password: decodeURIComponent(parsed.password || ''),
            database: (parsed.pathname || '').replace(/^\//, '') || process.env.DB_NAME || 'todo_app',
            port: Number(parsed.port || 3306),
            ssl: defaultSsl,
        };
    }

    return {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'todo_app',
        port: Number(process.env.DB_PORT || 3306),
        ssl: defaultSsl,
    };
}

const pool = mysql.createPool(getDbConfig());

module.exports = pool.promise();
