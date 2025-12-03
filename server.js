/**
 * Nodeimage 克隆版 - 优化版
 * 图床服务主文件
 */
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import fs from 'fs-extra';
import path from 'path';
import bcrypt from 'bcryptjs';

// 导入配置和服务
import config from './config.js';
import logger from './logger.js';
import dbService from './services/database.js';
import { processImage, generateThumbnail, validateImage } from './services/imageProcessor.js';
import cleanupService from './services/cleanupService.js';

// 导入中间件
import { requireAuth, attachUser } from './middleware/auth.js';
import { errorHandler, asyncHandler } from './middleware/errorHandler.js';

// 导入工具函数
import { generateApiKey, generateId, getTodayRange, getBaseUrl } from './utils/helpers.js';

const __dirname = process.cwd();
const app = express();

const uploadDir = path.join(__dirname, 'uploads');
const thumbDir = path.join(uploadDir, 'thumbs');

// ============================================================================
// 初始化
// ============================================================================

// 确保目录存在
await fs.ensureDir(uploadDir);
await fs.ensureDir(thumbDir);

// 初始化数据库服务
await dbService.initialize();

// 配置 multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxFileSize }
});

// Express 设置
app.set('trust proxy', config.trustProxy);

// 中间件
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: config.sessionMaxAge }
  })
);

// 静态文件服务
app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(__dirname, 'public')));

// 请求日志中间件
app.use((req, res, next) => {
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    if (req.path.startsWith('/api/')) {
      logger.logRequest(req, duration, res.statusCode);
    }
  });
  next();
});

// ============================================================================
// API 路由
// ============================================================================

// 用户状态
app.get('/api/user/status', attachUser, asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) {
    return res.json({ authenticated: false });
  }

  res.json({
    authenticated: true,
    username: user.username,
    level: user.level,
    apiKey: user.apiKey
  });
}));

// 登录
app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const username = (req.body.username || '').trim().slice(0, 30);
  const password = req.body.password || '';

  if (!username || !password) {
    return res.status(400).json({ message: '用户名和密码不能为空' });
  }

  const user = dbService.findUserByUsername(username);
  if (!user) {
    logger.warn('登录失败: 用户不存在', { username });
    return res.status(401).json({ message: '用户不存在' });
  }

  // 若旧用户没有密码，则用首次登录的密码初始化
  if (!user.passwordHash) {
    user.passwordHash = await bcrypt.hash(password, 10);
    dbService.markDirty();
  } else {
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      logger.warn('登录失败: 密码错误', { username });
      return res.status(401).json({ message: '密码错误' });
    }
  }

  req.session.userId = user.id;
  const isDefault = user.username === 'admin' && password === 'admin';

  logger.info('用户登录成功', { username: user.username, userId: user.id });

  res.json({
    message: '登录成功',
    user: { username: user.username, level: user.level },
    defaultCreds: isDefault
  });
}));

// 注册
app.post('/api/auth/register', asyncHandler(async (req, res) => {
  const username = (req.body.username || '').trim().slice(0, 30);
  const password = req.body.password || '';

  if (!username || !password) {
    return res.status(400).json({ message: '用户名和密码不能为空' });
  }

  if (username.length < 3) {
    return res.status(400).json({ message: '用户名至少需要3个字符' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: '密码至少需要6个字符' });
  }

  // 检查用户名是否已存在
  const existingUser = dbService.findUserByUsername(username);
  if (existingUser) {
    return res.status(409).json({ message: '用户名已存在' });
  }

  // 创建新用户
  const newUser = {
    id: generateId(16),
    username: username,
    passwordHash: await bcrypt.hash(password, 10),
    apiKey: generateApiKey(),
    level: 0,  // 普通用户权限
    createdAt: Date.now()
  };

  dbService.addUser(newUser);
  logger.info('新用户注册成功', { username: newUser.username, userId: newUser.id });

  res.json({
    message: '注册成功，请登录',
    user: { username: newUser.username, level: newUser.level }
  });
}));

// 登出
app.post('/api/auth/logout', asyncHandler(async (req, res) => {
  const userId = req.session?.userId;
  req.session.destroy(() => {
    logger.info('用户登出', { userId });
    res.json({ message: '已注销' });
  });
}));

// 更新密码（只能修改密码，不能修改用户名）
app.post('/api/user/password', requireAuth, asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body || {};

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: '请提供原密码和新密码' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: '新密码至少需要6个字符' });
  }

  const user = dbService.findUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ message: '用户不存在' });
  }

  const ok = user.passwordHash ? await bcrypt.compare(oldPassword, user.passwordHash) : false;
  if (!ok) {
    return res.status(401).json({ message: '原密码错误' });
  }

  // 只更新密码，不修改用户名
  dbService.updateUser(user.id, {
    passwordHash: await bcrypt.hash(newPassword, 10)
  });

  req.session.destroy(() => { });

  logger.info('用户更新密码', { userId: user.id, username: user.username });

  res.json({ message: '密码已更新，请重新登录' });
}));

// 获取 API Key
app.get('/api/user/api-key', requireAuth, asyncHandler(async (req, res) => {
  res.json({ apiKey: req.user.apiKey });
}));

// 获取品牌设置
app.get('/api/settings/branding', asyncHandler(async (req, res) => {
  const branding = dbService.getBranding();
  res.json(branding);
}));

// 更新品牌设置
app.post('/api/settings/branding', requireAuth, asyncHandler(async (req, res) => {
  const branding = {
    name: req.body.name || 'Nodeimage',
    subtitle: req.body.subtitle || 'NodeSeek专用图床·克隆版',
    icon: req.body.icon || '',
    footer: req.body.footer || 'Nodeimage 克隆版 · 本地演示'
  };

  dbService.updateBranding(branding);
  logger.info('品牌设置已更新', { branding });

  res.json({ message: '已更新图床设置', branding });
}));

// 重新生成 API Key
app.post('/api/user/regenerate-api-key', requireAuth, asyncHandler(async (req, res) => {
  const user = dbService.findUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ message: '用户不存在' });
  }

  const newApiKey = generateApiKey();
  dbService.updateUser(user.id, { apiKey: newApiKey });

  logger.info('API Key 已重新生成', { userId: user.id });

  res.json({ apiKey: newApiKey });
}));

// 获取统计信息
app.get('/api/stats', asyncHandler(async (req, res) => {
  const stats = dbService.getStats();
  res.json(stats);
}));

// 上传图片
app.post('/api/upload', requireAuth, upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: '缺少图片文件' });
  }

  if (!config.allowedMimeTypes.has(req.file.mimetype)) {
    return res.status(400).json({ message: '不支持的文件类型' });
  }

  // 验证图片
  const validation = await validateImage(req.file.buffer);
  if (!validation.valid) {
    return res.status(400).json({ message: validation.error });
  }

  const compressToWebp = String(req.body.compressToWebp ?? 'true') !== 'false';
  const webpQuality = Math.min(100, Math.max(10, Number(req.body.webpQuality) || config.defaultWebpQuality));
  const autoWatermark = String(req.body.autoWatermark ?? 'false') === 'true';
  const watermarkContent = (req.body.watermarkContent || '').trim();
  const autoDelete = String(req.body.autoDelete ?? 'false') === 'true';
  const deleteDays = Math.min(365, Math.max(1, Number(req.body.deleteDays) || 30));

  // 已移除上传限制（个人使用）

  const watermarkText = autoWatermark ? (watermarkContent || 'nodeimage.com clone') : '';

  // 处理图片
  const processed = await processImage(req.file.buffer, {
    compressToWebp,
    webpQuality,
    watermarkText
  });

  const id = generateId(12);
  const filename = `${id}.${processed.ext}`;
  const filePath = path.join(uploadDir, filename);
  await fs.writeFile(filePath, processed.buffer);

  // 生成缩略图
  const thumbBuffer = await generateThumbnail(processed.buffer);
  const thumbName = `${id}_thumb.webp`;
  await fs.writeFile(path.join(thumbDir, thumbName), thumbBuffer);

  const baseUrl = getBaseUrl(req, config.baseUrl);
  const fileUrl = `${baseUrl}/uploads/${filename}`;
  const thumbUrl = `${baseUrl}/uploads/thumbs/${thumbName}`;

  const record = {
    id,
    userId: req.user.id,
    filename,
    thumbName,
    mime: processed.mime,
    size: processed.size,
    width: processed.width,
    height: processed.height,
    createdAt: Date.now(),
    autoDelete,
    deleteAfterDays: autoDelete ? deleteDays : null
  };

  dbService.addImage(record);
  logger.logUpload(req.user.id, filename, processed.size);

  res.json({
    id,
    url: fileUrl,
    thumbUrl,
    size: processed.size,
    width: processed.width,
    height: processed.height,
    format: processed.ext,
    markdown: `![image](${fileUrl})`,
    html: `<img src="${fileUrl}" alt="image" />`,
    bbcode: `[img]${fileUrl}[/img]`
  });
}));

// 获取图片列表
app.get('/api/images', requireAuth, asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(60, Math.max(1, Number(req.query.limit) || 20));
  const start = (page - 1) * limit;
  const end = start + limit;

  const baseUrl = getBaseUrl(req, config.baseUrl);
  const items = dbService.getImagesByUserId(req.user.id);
  const slice = items.slice(start, end).map((img) => ({
    ...img,
    url: `${baseUrl}/uploads/${img.filename}`,
    thumbUrl: `${baseUrl}/uploads/thumbs/${img.thumbName}`
  }));

  const totalPages = Math.max(1, Math.ceil(items.length / limit));

  res.json({
    items: slice,
    total: items.length,
    totalPages,
    currentPage: page
  });
}));

// 删除图片
app.post('/api/images/delete', requireAuth, asyncHandler(async (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  if (!ids.length) {
    return res.status(400).json({ message: '缺少要删除的ID' });
  }

  // 删除文件
  const images = dbService.getImagesByUserId(req.user.id).filter(img => ids.includes(img.id));
  for (const img of images) {
    await fs.remove(path.join(uploadDir, img.filename)).catch(() => { });
    if (img.thumbName) {
      await fs.remove(path.join(thumbDir, img.thumbName)).catch(() => { });
    }
  }

  // 从数据库删除
  const deletedCount = dbService.deleteImages(ids, req.user.id);
  logger.logDelete(req.user.id, ids);

  res.json({ message: '删除完成', count: deletedCount });
}));

// API v1 - 获取列表
app.get('/api/v1/list', requireAuth, asyncHandler(async (req, res) => {
  const baseUrl = getBaseUrl(req, config.baseUrl);
  const items = dbService.getImagesByUserId(req.user.id).map((img) => ({
    id: img.id,
    url: `${baseUrl}/uploads/${img.filename}`,
    thumbUrl: `${baseUrl}/uploads/thumbs/${img.thumbName}`,
    size: img.size,
    width: img.width,
    height: img.height,
    createdAt: img.createdAt
  }));
  res.json({ items });
}));

// API v1 - 删除单个
app.delete('/api/v1/delete/:id', requireAuth, asyncHandler(async (req, res) => {
  const targetId = req.params.id;
  const img = dbService.getImageById(targetId);

  if (!img || img.userId !== req.user.id) {
    return res.status(404).json({ message: '未找到图片' });
  }

  // 删除文件
  await fs.remove(path.join(uploadDir, img.filename)).catch(() => { });
  if (img.thumbName) {
    await fs.remove(path.join(thumbDir, img.thumbName)).catch(() => { });
  }

  // 从数据库删除
  const deletedCount = dbService.deleteImages([targetId], req.user.id);
  logger.logDelete(req.user.id, [targetId]);

  if (deletedCount === 0) {
    return res.status(404).json({ message: '未找到图片' });
  }

  res.json({ message: '删除成功' });
}));

// 前端路由fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 错误处理中间件
app.use(errorHandler);

// ============================================================================
// 启动和关闭
// ============================================================================

const server = app.listen(config.port, () => {
  logger.info(`Nodeimage 克隆版已启动`, {
    port: config.port,
    environment: process.env.NODE_ENV || 'development'
  });
  console.log(`Nodeimage clone running at http://localhost:${config.port}`);
});

// 启动定时清理服务
cleanupService.start();

// 优雅关闭
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown() {
  logger.info('收到关闭信号，开始优雅关闭...');

  // 停止接受新请求
  server.close(() => {
    logger.info('HTTP 服务器已关闭');
  });

  try {
    // 停止定时清理服务
    cleanupService.stop();

    // 保存数据库
    await dbService.shutdown();

    logger.info('应用已安全关闭');
    process.exit(0);
  } catch (err) {
    logger.error('关闭过程中出错', { error: err.message });
    process.exit(1);
  }
}
