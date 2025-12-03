/**
 * 结构化日志系统
 */
import fs from 'fs-extra';
import path from 'path';
import config from './config.js';

const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
};

const COLORS = {
    debug: '\x1b[36m', // 青色
    info: '\x1b[32m',  // 绿色
    warn: '\x1b[33m',  // 黄色
    error: '\x1b[31m', // 红色
    reset: '\x1b[0m'
};

class Logger {
    constructor() {
        this.level = LOG_LEVELS[config.logLevel] || LOG_LEVELS.info;
        this.logToFile = config.logToFile;
        this.logFilePath = config.logFilePath;

        if (this.logToFile) {
            const logDir = path.dirname(this.logFilePath);
            fs.ensureDirSync(logDir);
        }
    }

    formatMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
    }

    log(level, message, meta = {}) {
        if (LOG_LEVELS[level] < this.level) return;

        const formattedMsg = this.formatMessage(level, message, meta);

        // 控制台输出（带颜色）
        const color = COLORS[level] || COLORS.reset;
        console.log(`${color}${formattedMsg}${COLORS.reset}`);

        // 文件输出（无颜色）
        if (this.logToFile) {
            fs.appendFileSync(this.logFilePath, formattedMsg + '\n', 'utf-8');
        }
    }

    debug(message, meta) {
        this.log('debug', message, meta);
    }

    info(message, meta) {
        this.log('info', message, meta);
    }

    warn(message, meta) {
        this.log('warn', message, meta);
    }

    error(message, meta) {
        this.log('error', message, meta);
    }

    // 记录HTTP请求
    logRequest(req, responseTime, statusCode) {
        const { method, originalUrl, ip } = req;
        this.info('HTTP Request', {
            method,
            url: originalUrl,
            ip,
            status: statusCode,
            responseTime: `${responseTime}ms`
        });
    }

    // 记录上传操作
    logUpload(userId, filename, size) {
        this.info('Image Upload', {
            userId,
            filename,
            size: `${(size / 1024).toFixed(2)}KB`
        });
    }

    // 记录删除操作
    logDelete(userId, imageIds) {
        this.info('Image Delete', {
            userId,
            count: imageIds.length,
            ids: imageIds.join(',')
        });
    }

    // 记录数据库操作
    logDbOperation(operation, duration) {
        this.debug('DB Operation', {
            operation,
            duration: `${duration}ms`
        });
    }
}

// 导出单例
export const logger = new Logger();
export default logger;
