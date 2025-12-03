/**
 * 认证中间件
 */
import dbService from '../services/database.js';
import logger from '../logger.js';

/**
 * 获取当前用户
 */
export async function getUser(req) {
    let user = null;

    // 1. 首先检查 session
    if (req.session?.userId) {
        user = dbService.findUserById(req.session.userId);
    }

    // 2. 如果 session 中没有，检查 API Key
    if (!user) {
        const apiKey = req.get('x-api-key') || req.get('X-API-Key');
        if (apiKey) {
            user = dbService.findUserByApiKey(apiKey);
        }
    }

    return user;
}

/**
 * 附加用户信息到请求（不强制登录）
 */
export async function attachUser(req, res, next) {
    try {
        req.user = await getUser(req);
        next();
    } catch (err) {
        logger.error('附加用户信息失败', { error: err.message });
        next(err);
    }
}

/**
 * 要求用户必须登录
 */
export async function requireAuth(req, res, next) {
    try {
        req.user = await getUser(req);

        if (!req.user) {
            return res.status(401).json({ message: 'AUTH_REQUIRED' });
        }

        next();
    } catch (err) {
        logger.error('认证检查失败', { error: err.message });
        next(err);
    }
}

export default {
    getUser,
    attachUser,
    requireAuth
};
