const mysql = require('mysql2');
require('dotenv').config();

const cloudUrl = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_PRIVATE_URL;
const dbPrimary = (process.env.DB_PRIMARY || '').toLowerCase();
const dbMirrorEnabled = String(process.env.DB_MIRROR_ENABLED || 'false').toLowerCase() === 'true';
const explicitMirrorUrl = process.env.DB_MIRROR_URL;
const localSslEnabled = String(process.env.DB_SSL || 'false').toLowerCase() === 'true';

const cloudSsl = { rejectUnauthorized: false };

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

function buildLocalConfig() {
    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'todo_app',
        port: Number(process.env.DB_PORT || 3306),
    };

    if (localSslEnabled) {
        config.ssl = cloudSsl;
    }

    return config;
}

function buildCloudConfig() {
    const fromUrl = cloudUrl ? parseDbUrl(cloudUrl) : null;
    if (!fromUrl) return null;

    // DB_* variables intentionally override URL parts when provided.
    return {
        host: process.env.DB_HOST || fromUrl.host,
        user: process.env.DB_USER || fromUrl.user,
        password: process.env.DB_PASSWORD || fromUrl.password,
        database: process.env.DB_NAME || fromUrl.database,
        port: Number(process.env.DB_PORT || fromUrl.port || 3306),
        ssl: cloudSsl,
    };
}

function buildMirrorConfig(primaryMode, localConfig, cloudConfig) {
    if (explicitMirrorUrl) {
        const parsedMirror = parseDbUrl(explicitMirrorUrl);
        if (!parsedMirror) return null;
        return {
            host: parsedMirror.host,
            user: parsedMirror.user,
            password: parsedMirror.password,
            database: parsedMirror.database,
            port: Number(parsedMirror.port || 3306),
            ssl: cloudSsl,
        };
    }

    if (!dbMirrorEnabled) return null;
    if (primaryMode === 'local') return cloudConfig;
    if (primaryMode === 'cloud') return localConfig;
    return null;
}

function looksLikeSameDatabase(a, b) {
    if (!a || !b) return false;
    return (
        String(a.host || '').toLowerCase() === String(b.host || '').toLowerCase() &&
        Number(a.port || 0) === Number(b.port || 0) &&
        String(a.user || '') === String(b.user || '') &&
        String(a.database || '') === String(b.database || '')
    );
}

function isWriteQuery(sql) {
    return /^\s*(INSERT|UPDATE|DELETE|REPLACE|CREATE|ALTER|DROP|TRUNCATE)\b/i.test(sql || '');
}

const localConfig = buildLocalConfig();
const cloudConfig = buildCloudConfig();

if (cloudUrl && !cloudConfig) {
    console.warn('Invalid DATABASE_URL/MYSQL_URL format. Cloud DB config ignored.');
}

let primaryMode = 'local';
if (dbPrimary === 'cloud' && cloudConfig) primaryMode = 'cloud';
if (dbPrimary === 'local') primaryMode = 'local';
if (!dbPrimary && !process.env.DB_HOST && cloudConfig) primaryMode = 'cloud';

const primaryConfig = primaryMode === 'cloud' && cloudConfig ? cloudConfig : localConfig;
let mirrorConfig = buildMirrorConfig(primaryMode, localConfig, cloudConfig);

if (looksLikeSameDatabase(primaryConfig, mirrorConfig)) {
    mirrorConfig = null;
}

const primaryPool = mysql.createPool(primaryConfig).promise();
const mirrorPool = mirrorConfig ? mysql.createPool(mirrorConfig).promise() : null;

async function query(sql, params) {
    const primaryResult = await primaryPool.query(sql, params);

    if (mirrorPool && isWriteQuery(sql)) {
        mirrorPool.query(sql, params).catch((err) => {
            console.error('Mirror DB write failed:', err.message);
        });
    }

    return primaryResult;
}

console.log(`DB primary mode: ${primaryMode}${mirrorPool ? ' (mirror enabled)' : ''}`);

module.exports = { query };
