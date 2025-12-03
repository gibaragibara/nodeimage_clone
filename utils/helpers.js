/**
 * 工具函数库
 */
import { nanoid } from 'nanoid';

/**
 * 生成 API Key
 */
export function generateApiKey() {
    return nanoid(48);
}

/**
 * 生成唯一 ID
 */
export function generateId(length = 12) {
    return nanoid(length);
}

/**
 * 获取今日时间范围
 */
export function getTodayRange() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start: start.getTime(), end: end.getTime() };
}

/**
 * 获取基础 URL
 */
export function getBaseUrl(req, configBaseUrl = '') {
    if (configBaseUrl) return configBaseUrl;

    const xfProto = req.get('x-forwarded-proto');
    const protocol = (xfProto || req.protocol || 'http').split(',')[0].trim();
    const host = req.get('x-forwarded-host') || req.get('host');
    return `${protocol}://${host}`;
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * 安全的字符串截取
 */
export function sanitizeString(str, maxLength = 100) {
    if (typeof str !== 'string') return '';
    return str.trim().slice(0, maxLength);
}

/**
 * 验证用户名
 */
export function validateUsername(username) {
    if (!username || typeof username !== 'string') {
        return { valid: false, error: '用户名不能为空' };
    }

    const trimmed = username.trim();
    if (trimmed.length < 3 || trimmed.length > 30) {
        return { valid: false, error: '用户名长度必须在3-30个字符之间' };
    }

    // 只允许字母、数字、下划线、中文
    if (!/^[\w\u4e00-\u9fa5]+$/.test(trimmed)) {
        return { valid: false, error: '用户名只能包含字母、数字、下划线和中文' };
    }

    return { valid: true, value: trimmed };
}

/**
 * 验证密码
 */
export function validatePassword(password) {
    if (!password || typeof password !== 'string') {
        return { valid: false, error: '密码不能为空' };
    }

    if (password.length < 6) {
        return { valid: false, error: '密码长度至少6个字符' };
    }

    if (password.length > 100) {
        return { valid: false, error: '密码长度不能超过100个字符' };
    }

    return { valid: true, value: password };
}

/**
 * Sleep 函数
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 创建延迟执行的函数（防抖）
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export default {
    generateApiKey,
    generateId,
    getTodayRange,
    getBaseUrl,
    formatFileSize,
    sanitizeString,
    validateUsername,
    validatePassword,
    sleep,
    debounce
};
