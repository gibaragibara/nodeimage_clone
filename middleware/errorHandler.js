/**
 * 错误处理中间件
 */
import logger from '../logger.js';

/**
 * 统一错误响应格式
 */
export function errorHandler(err, req, res, next) {
    // 记录错误
    logger.error('请求处理错误', {
        method: req.method,
        url: req.originalUrl,
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });

    // 确定错误状态码
    const statusCode = err.statusCode || err.status || 500;

    // 统一错误响应格式
    const response = {
        message: err.message || '服务器内部错误',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    };

    res.status(statusCode).json(response);
}

/**
 * 404 处理中间件
 */
export function notFoundHandler(req, res, next) {
    const error = new Error('未找到请求的资源');
    error.statusCode = 404;
    next(error);
}

/**
 * 异步路由处理包装器
 */
export function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

export default {
    errorHandler,
    notFoundHandler,
    asyncHandler
};
