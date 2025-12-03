/**
 * 图片处理服务 - 优化图片处理性能
 */
import sharp from 'sharp';
import mime from 'mime-types';
import logger from '../logger.js';
import config from '../config.js';

/**
 * 创建水印 SVG
 */
function createWatermarkSvg(text, width = 800) {
    const fontSize = Math.max(16, Math.round(width / 25));
    const padding = Math.round(fontSize * 0.6);
    return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${fontSize * 3}">
      <style>
        .watermark {
          fill: rgba(255,255,255,0.7);
          font-size: ${fontSize}px;
          font-family: 'Helvetica Neue', Arial, sans-serif;
          font-weight: 600;
          paint-order: stroke;
          stroke: rgba(0,0,0,0.35);
          stroke-width: 2px;
        }
      </style>
      <text x="${width - padding}" y="${fontSize + padding}" text-anchor="end" class="watermark">${text}</text>
    </svg>
  `;
}

/**
 * 处理图片 - 压缩、水印、格式转换
 */
export async function processImage(buffer, options = {}) {
    const startTime = Date.now();

    const {
        compressToWebp = true,
        webpQuality = config.defaultWebpQuality,
        watermarkText = ''
    } = options;

    try {
        // 创建 sharp 实例并自动旋转
        const base = sharp(buffer).rotate();
        const meta = await base.metadata();

        logger.debug('开始处理图片', {
            format: meta.format,
            width: meta.width,
            height: meta.height,
            size: `${(buffer.length / 1024).toFixed(2)}KB`
        });

        let pipeline = base;

        // 添加水印
        if (watermarkText && meta.width) {
            const svg = createWatermarkSvg(watermarkText, meta.width);
            pipeline = pipeline.composite([
                { input: Buffer.from(svg), gravity: 'southeast' }
            ]);
        }

        // 格式转换和压缩
        let outputMime = meta.format ? mime.lookup(meta.format) || 'application/octet-stream' : 'application/octet-stream';
        let ext = meta.format || 'png';

        // 对于 GIF 和 SVG 保持原格式
        if (compressToWebp && meta.format !== 'gif' && meta.format !== 'svg') {
            pipeline = pipeline.webp({ quality: webpQuality });
            outputMime = 'image/webp';
            ext = 'webp';
        }

        const outputBuffer = await pipeline.toBuffer();
        const finalMeta = await sharp(outputBuffer).metadata();

        const duration = Date.now() - startTime;
        logger.debug('图片处理完成', {
            duration: `${duration}ms`,
            outputFormat: ext,
            outputSize: `${(outputBuffer.length / 1024).toFixed(2)}KB`,
            compression: `${((1 - outputBuffer.length / buffer.length) * 100).toFixed(1)}%`
        });

        return {
            buffer: outputBuffer,
            mime: outputMime,
            ext,
            width: finalMeta.width,
            height: finalMeta.height,
            size: outputBuffer.length
        };
    } catch (err) {
        logger.error('图片处理失败', { error: err.message });
        throw err;
    }
}

/**
 * 生成缩略图
 */
export async function generateThumbnail(buffer, options = {}) {
    const startTime = Date.now();

    const {
        size = config.thumbnailSize,
        quality = config.thumbnailQuality
    } = options;

    try {
        const thumbBuffer = await sharp(buffer)
            .resize({
                width: size,
                height: size,
                fit: 'inside',
                withoutEnlargement: true
            })
            .webp({ quality })
            .toBuffer();

        const duration = Date.now() - startTime;
        logger.debug('缩略图生成完成', {
            duration: `${duration}ms`,
            size: `${(thumbBuffer.length / 1024).toFixed(2)}KB`
        });

        return thumbBuffer;
    } catch (err) {
        logger.error('缩略图生成失败', { error: err.message });
        throw err;
    }
}

/**
 * 验证图片文件
 */
export async function validateImage(buffer, maxSize = config.maxFileSize) {
    try {
        // 检查文件大小
        if (buffer.length > maxSize) {
            return {
                valid: false,
                error: `文件大小超过限制 (${(maxSize / 1024 / 1024).toFixed(0)}MB)`
            };
        }

        // 使用 Sharp 验证图片有效性
        const meta = await sharp(buffer).metadata();

        // 检查图片格式
        if (!meta.format) {
            return { valid: false, error: '无法识别的图片格式' };
        }

        // 检查图片尺寸（可选，防止超大图片）
        const maxDimension = 20000; // 20000px
        if (meta.width > maxDimension || meta.height > maxDimension) {
            return {
                valid: false,
                error: `图片尺寸超过限制 (${maxDimension}x${maxDimension})`
            };
        }

        return { valid: true, metadata: meta };
    } catch (err) {
        logger.warn('图片验证失败', { error: err.message });
        return { valid: false, error: '图片文件损坏或格式不支持' };
    }
}

export default {
    processImage,
    generateThumbnail,
    validateImage
};
