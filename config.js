/**
 * 统一配置管理
 */

function parseBool(val, defaultVal = true) {
    if (val === undefined || val === null) return defaultVal;
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val.toLowerCase() === 'true';
    return Boolean(val);
}

function parseNumber(val, defaultVal, min = -Infinity, max = Infinity) {
    const num = Number(val) || defaultVal;
    return Math.min(max, Math.max(min, num));
}

export const config = {
    // 服务器配置
    port: parseNumber(process.env.PORT, 7878, 1, 65535),
    baseUrl: process.env.BASE_URL ? process.env.BASE_URL.replace(/\/$/, '') : '',
    trustProxy: parseBool(process.env.TRUST_PROXY, true),

    // 会话配置
    sessionSecret: process.env.SESSION_SECRET || 'nodeimage-clone-secret',
    sessionMaxAge: parseNumber(process.env.SESSION_MAX_AGE, 1000 * 60 * 60 * 24 * 7), // 7天

    // 上传限制
    maxFileSize: parseNumber(process.env.MAX_FILE_SIZE, 100 * 1024 * 1024, 1024, 500 * 1024 * 1024), // 默认100MB, 最大500MB
    // dailyUploadLimit 已移除（个人使用无需限制）

    // 图片处理
    defaultWebpQuality: parseNumber(process.env.DEFAULT_WEBP_QUALITY, 90, 10, 100),
    thumbnailSize: parseNumber(process.env.THUMBNAIL_SIZE, 400, 100, 1000),
    thumbnailQuality: parseNumber(process.env.THUMBNAIL_QUALITY, 80, 10, 100),

    // 数据库配置
    dbCacheFlushInterval: parseNumber(process.env.DB_CACHE_FLUSH_INTERVAL, 5000, 1000, 60000), // 5秒
    dbCacheFlushThreshold: parseNumber(process.env.DB_CACHE_FLUSH_THRESHOLD, 10, 1, 1000), // 10次修改

    // 定时任务
    cleanupExpiredInterval: parseNumber(process.env.CLEANUP_EXPIRED_INTERVAL, 1000 * 60 * 60, 60000), // 1小时
    enableAutoCleanup: parseBool(process.env.ENABLE_AUTO_CLEANUP, true),

    // 日志配置
    logLevel: process.env.LOG_LEVEL || 'info', // debug, info, warn, error
    logToFile: parseBool(process.env.LOG_TO_FILE, false),
    logFilePath: process.env.LOG_FILE_PATH || 'logs/app.log',

    // 允许的MIME类型
    allowedMimeTypes: new Set([
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        'image/avif'
    ])
};

export default config;
