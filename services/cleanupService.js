/**
 * 定时清理过期图片服务
 */
import fs from 'fs-extra';
import path from 'path';
import dbService from './database.js';
import logger from '../logger.js';
import config from '../config.js';

const __dirname = process.cwd();
const uploadDir = path.join(__dirname, 'uploads');
const thumbDir = path.join(uploadDir, 'thumbs');

class CleanupService {
    constructor() {
        this.timer = null;
        this.isRunning = false;
    }

    start() {
        if (!config.enableAutoCleanup) {
            logger.info('自动清理功能已禁用');
            return;
        }

        logger.info('启动定时清理服务', {
            interval: `${config.cleanupExpiredInterval / 1000 / 60}分钟`
        });

        // 立即执行一次
        this.cleanup();

        // 定时执行
        this.timer = setInterval(() => {
            this.cleanup();
        }, config.cleanupExpiredInterval);
    }

    async cleanup() {
        if (this.isRunning) {
            logger.debug('清理任务正在运行中，跳过本次执行');
            return;
        }

        this.isRunning = true;
        const startTime = Date.now();

        try {
            const expiredImages = dbService.getExpiredImages();

            if (expiredImages.length === 0) {
                logger.debug('没有过期图片需要清理');
                this.isRunning = false;
                return;
            }

            logger.info(`发现 ${expiredImages.length} 张过期图片，开始清理`);

            let deletedFiles = 0;
            let deletedThumbs = 0;
            const deletedIds = [];

            for (const img of expiredImages) {
                try {
                    // 删除原图
                    const filePath = path.join(uploadDir, img.filename);
                    if (await fs.pathExists(filePath)) {
                        await fs.remove(filePath);
                        deletedFiles++;
                    }

                    // 删除缩略图
                    if (img.thumbName) {
                        const thumbPath = path.join(thumbDir, img.thumbName);
                        if (await fs.pathExists(thumbPath)) {
                            await fs.remove(thumbPath);
                            deletedThumbs++;
                        }
                    }

                    deletedIds.push(img.id);
                } catch (err) {
                    logger.error('删除图片文件失败', {
                        imageId: img.id,
                        filename: img.filename,
                        error: err.message
                    });
                }
            }

            // 从数据库中删除记录
            const deletedCount = dbService.deleteExpiredImageRecords(deletedIds);

            const duration = Date.now() - startTime;
            logger.info('清理完成', {
                duration: `${duration}ms`,
                deletedFiles,
                deletedThumbs,
                deletedRecords: deletedCount
            });

        } catch (err) {
            logger.error('清理任务失败', { error: err.message });
        } finally {
            this.isRunning = false;
        }
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            logger.info('定时清理服务已停止');
        }
    }
}

// 导出单例
export const cleanupService = new CleanupService();
export default cleanupService;
