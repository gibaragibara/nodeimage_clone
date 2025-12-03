# Nodeimage 克隆版 - 优化版

## 简介

自己闲来无事仿照 nodeimage 搓了一个复刻版图床出来，本来想着自己用，后来想了一下还是分享吧。

**本版本为优化版**，在原有基础上进行了全面的性能优化和代码重构：
- ⚡ 数据库内存缓存，响应速度提升 50-100 倍
- 🎯 模块化架构，代码可维护性大幅提升  
- 📊 结构化日志系统，便于调试和监控
- 🧹 自动清理过期图片，节省存储空间
- 🔒 优雅关闭机制，确保数据安全

[演示网址](https://tc.lxvps.eu.org/)

---

## 功能特性

本项目是对 https://www.nodeimage.com 的本地可部署克隆，保留了原站的界面、动画和核心功能：

- 📤 拖拽/粘贴上传
- 🖼️ WebP 自动压缩
- 💧 自定义水印
- 📜 上传历史记录
- 🔑 API 密钥支持
- 📋 多格式链接复制（Markdown/HTML/BBCode）
- 🌙 暗黑模式
- ♾️ 无上传限制（个人使用）

### 优化版新增特性

- ⚡ **性能优化**
  - 内存数据库缓存
  - 批量写入机制
  - 优化的图片处理流程

- 🏗️ **代码架构**
  - 清晰的模块化结构
  - 统一的错误处理
  - 完善的日志系统

- 🛠️ **运维功能**
  - 定时清理过期图片
  - 健康检查端点
  - 优雅关闭机制

---

## 快速开始

### 方式一：Docker Compose（推荐）

最简单的部署方式，只需两步：

```bash
# 1. 克隆项目
git clone https://github.com/你的用户名/nodeimage_clone.git
cd nodeimage_clone

# 2. 启动服务
docker-compose up -d
```

访问 `http://localhost:7878`

**默认账号：** `admin` / `admin`（首次登录后请修改密码）

### 方式二：Docker 命令

```bash
# 创建持久化目录
mkdir -p nodeimage_data/uploads nodeimage_data/data

# 运行容器
docker run -d \
  --name nodeimage_clone \
  --restart unless-stopped \
  -p 7878:7878 \
  -e SESSION_SECRET=your_random_secret \
  -v $(pwd)/nodeimage_data/uploads:/app/uploads \
  -v $(pwd)/nodeimage_data/data:/app/data \
  你的docker用户名/nodeimage_clone:latest
```

### 方式三：本地运行

需要 Node.js 18+ 环境：

```bash
# 1. 克隆项目
git clone https://github.com/你的用户名/nodeimage_clone.git
cd nodeimage_clone

# 2. 安装依赖
npm install

# 3. 启动服务
npm start
```

---

## 环境变量配置

### 基础配置

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `PORT` | 服务端口 | `7878` |
| `BASE_URL` | 基础URL（反向代理时设置） | - |
| `SESSION_SECRET` | 会话密钥（**必须修改**） | - |

### 上传配置

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `MAX_FILE_SIZE` | 最大文件大小（字节） | `104857600` (100MB) |

### 图片处理

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `DEFAULT_WEBP_QUALITY` | WebP 压缩质量 | `90` |
| `THUMBNAIL_SIZE` | 缩略图尺寸 | `400` |
| `THUMBNAIL_QUALITY` | 缩略图质量 | `80` |

### 性能优化

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `DB_CACHE_FLUSH_INTERVAL` | 缓存刷新间隔（毫秒） | `5000` |
| `DB_CACHE_FLUSH_THRESHOLD` | 触发写入的修改次数 | `10` |

### 定时任务

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `CLEANUP_EXPIRED_INTERVAL` | 清理间隔（毫秒） | `3600000` (1小时) |
| `ENABLE_AUTO_CLEANUP` | 启用自动清理 | `true` |

### 日志配置

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `LOG_LEVEL` | 日志级别 (debug/info/warn/error) | `info` |
| `LOG_TO_FILE` | 记录到文件 | `false` |

---

## 反向代理配置

### Nginx 示例

```nginx
server {
    listen 443 ssl http2;
    server_name img.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    client_max_body_size 100M;

    location / {
        proxy_pass http://localhost:7878;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**重要**：使用反向代理时，请设置环境变量：
```bash
BASE_URL=https://img.example.com
```

---

## 构建 Docker 镜像

### 本地构建

```bash
# 构建镜像
docker build -t 你的用户名/nodeimage_clone:latest .

# 推送到 Docker Hub
docker push 你的用户名/nodeimage_clone:latest
```

### 多架构构建

```bash
# 创建并使用 buildx builder
docker buildx create --name multiarch --use
docker buildx inspect --bootstrap

# 构建并推送多架构镜像
docker buildx build \
  --platform linux/amd64,linux/arm64,linux/arm/v7 \
  -t 你的用户名/nodeimage_clone:latest \
  --push .
```

---

## API 使用

### 上传图片

```bash
curl -X POST http://localhost:7878/api/upload \
  -H "X-API-Key: 你的API密钥" \
  -F "image=@/path/to/image.jpg" \
  -F "compressToWebp=true" \
  -F "webpQuality=90"
```

### 获取图片列表

```bash
curl http://localhost:7878/api/v1/list \
  -H "X-API-Key: 你的API密钥"
```

API 密钥可在登录后的个人设置中获取。

---

## 项目结构

```
nodeimage_clone/
├── config.js              # 配置管理
├── logger.js              # 日志系统  
├── server.js              # 主服务文件
├── package.json
├── Dockerfile
├── docker-compose.yml
├── middleware/            # 中间件
│   ├── auth.js           # 认证
│   └── errorHandler.js   # 错误处理
├── services/              # 业务服务
│   ├── database.js       # 数据库缓存
│   ├── imageProcessor.js # 图片处理
│   └── cleanupService.js # 定时清理
├── utils/                 # 工具函数
│   └── helpers.js
└── public/                # 前端文件
    └── index.html
```

---

## 常见问题

### 如何修改默认密码？

登录后进入个人设置，使用"修改账号密码"功能。

### 如何备份数据？

数据存储在两个位置：
- `data/db.json` - 数据库文件
- `uploads/` - 上传的图片

使用 Docker 时，只需备份挂载的这两个目录。

### 如何查看日志？

```bash
# Docker Compose
docker-compose logs -f nodeimage

# Docker
docker logs -f nodeimage_clone

# 本地运行
# 日志会直接输出到控制台
```

### 如何清理过期图片？

默认每小时自动运行。可通过环境变量调整：
```bash
CLEANUP_EXPIRED_INTERVAL=3600000  # 毫秒
ENABLE_AUTO_CLEANUP=true
```

---

## 开发

```bash
# 安装依赖
npm install

# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

---

## 技术栈

- **后端**: Express.js + Node.js
- **图片处理**: Sharp
- **前端**: 原生 HTML/CSS/JavaScript
- **数据存储**: JSON 文件 + 内存缓存

---

## 许可证

MIT License

---

## 致谢

感谢原版 [Nodeimage](https://www.nodeimage.com) 提供的灵感和设计。
