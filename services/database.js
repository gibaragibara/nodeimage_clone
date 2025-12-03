/**
 * 数据库缓存服务 - 性能优化核心
 */
import fs from 'fs-extra';
import path from 'path';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import config from '../config.js';
import logger from '../logger.js';

const __dirname = process.cwd();
const dataFile = path.join(__dirname, 'data', 'db.json');

function generateApiKey() {
    return nanoid(48);
}

function ensureDefaultUser(db) {
    const hasUsers = Array.isArray(db.users) && db.users.length > 0;
    const existingAdmin = hasUsers ? db.users.find((u) => u.id === 'admin') : null;
    if (!hasUsers || !existingAdmin) {
        const passwordHash = bcrypt.hashSync('admin', 10);
        const admin = {
            id: 'admin',
            username: 'admin',
            passwordHash,
            apiKey: generateApiKey(),
            level: 1,
            createdAt: Date.now()
        };
        db.users = [admin];
        if (Array.isArray(db.images)) {
            db.images = db.images.map((img) => ({ ...img, userId: admin.id }));
        }
    }
}

class DatabaseService {
    constructor() {
        this.cache = null;
        this.isDirty = false;
        this.dirtyCount = 0;
        this.saveTimer = null;
        this.isShuttingDown = false;
        this.lastSaveTime = Date.now();
    }

    async initialize() {
        await fs.ensureDir(path.dirname(dataFile));
        await this.load();
        this.startAutoSave();
        logger.info('数据库服务初始化完成', { cacheFlushInterval: config.dbCacheFlushInterval });
    }

    async load() {
        const startTime = Date.now();

        if (!(await fs.pathExists(dataFile))) {
            const initial = {
                users: [],
                images: [],
                settings: {
                    branding: {
                        name: 'Nodeimage',
                        subtitle: 'NodeSeek专用图床·克隆版',
                        icon: '',
                        footer: 'Nodeimage 克隆版 · 本地演示'
                    }
                }
            };
            ensureDefaultUser(initial);
            await fs.writeJSON(dataFile, initial, { spaces: 2 });
            this.cache = initial;
        } else {
            this.cache = await fs.readJSON(dataFile);
            ensureDefaultUser(this.cache);
            await this.save();
        }

        const duration = Date.now() - startTime;
        logger.logDbOperation('初始加载', duration);
    }

    getDb() {
        if (!this.cache) {
            throw new Error('数据库未初始化');
        }
        return this.cache;
    }

    markDirty() {
        this.isDirty = true;
        this.dirtyCount++;

        // 如果修改次数达到阈值，立即保存
        if (this.dirtyCount >= config.dbCacheFlushThreshold) {
            this.save();
        }
    }

    startAutoSave() {
        this.saveTimer = setInterval(() => {
            if (this.isDirty && !this.isShuttingDown) {
                this.save();
            }
        }, config.dbCacheFlushInterval);
    }

    async save() {
        if (!this.isDirty || this.isShuttingDown) return;

        const startTime = Date.now();
        try {
            await fs.writeJSON(dataFile, this.cache, { spaces: 2 });
            this.isDirty = false;
            this.dirtyCount = 0;
            this.lastSaveTime = Date.now();

            const duration = Date.now() - startTime;
            logger.logDbOperation('保存数据库', duration);
        } catch (err) {
            logger.error('数据库保存失败', { error: err.message });
            throw err;
        }
    }

    async shutdown() {
        logger.info('数据库服务正在关闭...');
        this.isShuttingDown = true;

        if (this.saveTimer) {
            clearInterval(this.saveTimer);
        }

        // 最后一次保存
        if (this.isDirty) {
            await this.save();
        }

        logger.info('数据库服务已安全关闭');
    }

    // 用户相关操作
    findUserById(userId) {
        return this.cache.users.find(u => u.id === userId) || null;
    }

    findUserByUsername(username) {
        return this.cache.users.find(u => u.username === username) || null;
    }

    findUserByApiKey(apiKey) {
        return this.cache.users.find(u => u.apiKey === apiKey) || null;
    }

    addUser(user) {
        this.cache.users.push(user);
        this.markDirty();
    }

    updateUser(userId, updates) {
        const user = this.findUserById(userId);
        if (user) {
            Object.assign(user, updates);
            this.markDirty();
        }
        return user;
    }

    // 图片相关操作
    addImage(imageRecord) {
        this.cache.images.unshift(imageRecord);
        this.markDirty();
    }

    getImagesByUserId(userId) {
        return this.cache.images.filter(img => img.userId === userId);
    }

    getImageById(imageId) {
        return this.cache.images.find(img => img.id === imageId) || null;
    }

    deleteImages(imageIds, userId) {
        const before = this.cache.images.length;
        this.cache.images = this.cache.images.filter(
            img => !(img.userId === userId && imageIds.includes(img.id))
        );
        const deleted = before - this.cache.images.length;
        if (deleted > 0) {
            this.markDirty();
        }
        return deleted;
    }

    // 获取今日上传数量
    getTodayUploadCount(userId) {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);

        return this.cache.images.filter(
            img => img.userId === userId &&
                img.createdAt >= start.getTime() &&
                img.createdAt <= end.getTime()
        ).length;
    }

    // 获取过期图片
    getExpiredImages() {
        const now = Date.now();
        return this.cache.images.filter(img => {
            if (!img.autoDelete || !img.deleteAfterDays) return false;
            const expiryTime = img.createdAt + (img.deleteAfterDays * 24 * 60 * 60 * 1000);
            return now > expiryTime;
        });
    }

    // 删除过期图片记录
    deleteExpiredImageRecords(imageIds) {
        const before = this.cache.images.length;
        this.cache.images = this.cache.images.filter(img => !imageIds.includes(img.id));
        const deleted = before - this.cache.images.length;
        if (deleted > 0) {
            this.markDirty();
        }
        return deleted;
    }

    // 设置相关
    getBranding() {
        return this.cache.settings?.branding || {
            name: 'Nodeimage',
            subtitle: 'NodeSeek专用图床·克隆版',
            icon: '',
            footer: 'Nodeimage 克隆版 · 本地演示'
        };
    }

    updateBranding(branding) {
        this.cache.settings = this.cache.settings || {};
        this.cache.settings.branding = branding;
        this.markDirty();
    }

    // 统计信息
    getStats() {
        const total = this.cache.images.length;
        const totalSize = this.cache.images.reduce((sum, img) => sum + (img.size || 0), 0);

        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        const today = this.cache.images.filter(
            img => img.createdAt >= start.getTime() && img.createdAt <= end.getTime()
        ).length;

        return { total, today, totalSize };
    }
}

// 导出单例
export const dbService = new DatabaseService();
export default dbService;
