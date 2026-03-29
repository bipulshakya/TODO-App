const mysql = require('mysql2');
require('dotenv').config();

const defaultSsl = { rejectUnauthorized: false };
const dbUrl = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_PRIVATE_URL;

function parseDbUrl(url) {
    try {
        const parsed = new URL(url);
        return {
            host: parsed.hostname,
            user: decodeURIComponent(parsed.username || ''),
            password: decodeURIComponent(parsed.password || ''),
            database: (parsed.pathname || '').replace(/^\//, ''),
            port: Number(parsed.port || 3306),
        };
    } catch {
        return null;
    }
}

function getDbConfig() {
    const fromUrl = dbUrl ? parseDbUrl(dbUrl) : null;

    // DB_* variables intentionally override URL parts when provided.
    // This helps with providers where URL passwords include special chars
    // and users choose to provide password separately.
    const config = {
        host: process.env.DB_HOST || fromUrl?.host || 'localhost',
        user: process.env.DB_USER || fromUrl?.user || 'root',
        password: process.env.DB_PASSWORD || fromUrl?.password || 'password',
        database: process.env.DB_NAME || fromUrl?.database || 'todo_app',
        port: Number(process.env.DB_PORT || fromUrl?.port || 3306),
        ssl: defaultSsl,
    };

    if (dbUrl && !fromUrl) {
        console.warn('Invalid DATABASE_URL/MYSQL_URL format. Falling back to DB_* variables.');
    }

    return config;
}

const pool = mysql.createPool(getDbConfig());

module.exports = pool.promise();
