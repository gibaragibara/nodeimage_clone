# Nodeimage Clone - 优化版图床

[![Docker Pulls](https://img.shields.io/docker/pulls/jbyyy/nodeimage_clone)](https://hub.docker.com/r/jbyyy/nodeimage_clone)
[![GitHub](https://img.shields.io/badge/GitHub-gibaragibara/nodeimage__clone-blue)](https://github.com/gibaragibara/nodeimage_clone)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/gibaragibara/nodeimage_clone/blob/main/LICENSE)

基于 Node.js 的现代化图床系统，支持多用户、WebP 压缩、水印添加等功能。本版本经过全面性能优化，响应速度提升 50-100 倍。

**演示地址**: https://image.gibara.org/

## ✨ 核心特性

- 🚀 **高性能**: 内存数据库缓存，批量写入优化
- 📤 **便捷上传**: 支持拖拽、粘贴、API上传
- 🖼️ **智能压缩**: WebP自动转换，可配置质量
- 💧 **水印功能**: 自定义水印文字
- 👥 **多用户**: 支持用户注册，数据完全隔离
- 📋 **多格式**: 直链/Markdown/HTML/BBCode
- 🌙 **暗黑模式**: 精美的UI界面
- 🔑 **API密钥**: 支持程序化上传
- 🧹 **自动清理**: 定时清理过期图片

## 🚀 快速开始

### Docker Compose（推荐）

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  nodeimage:
    image: jbyyy/nodeimage_clone:latest
    container_name: nodeimage
    restart: unless-stopped
    ports:
      - "7878:7878"
    environment:
      - SESSION_SECRET=change_me_to_random_string
      - TZ=Asia/Shanghai
    volumes:
      - ./uploads:/app/uploads
      - ./data:/app/data
      - ./logs:/app/logs
```

启动服务：

```bash
docker compose up -d
```

访问 `http://localhost:7878`

**默认管理员账号**: `admin` / `admin`（请首次登录后立即修改）

### Docker 命令

```bash
# 创建数据目录
mkdir -p nodeimage/{uploads,data,logs}
cd nodeimage

# 运行容器
docker run -d \
  --name nodeimage \
  --restart unless-stopped \
  -p 7878:7878 \
  -e SESSION_SECRET=your_random_secret_here \
  -e TZ=Asia/Shanghai \
  -v $(pwd)/uploads:/app/uploads \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  jbyyy/nodeimage_clone:latest
```

## ⚙️ 环境变量配置

### 必需配置

| 变量名 | 说明 | 默认值 | 示例 |
|--------|------|--------|------|
| `SESSION_SECRET` | 会话加密密钥（**必须修改**） | - | `my_super_secret_key_123` |

### 基础配置

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `PORT` | 服务端口 | `7878` |
| `TZ` | 时区设置 | `UTC` |
| `BASE_URL` | 基础URL（反向代理必填） | - |
| `TRUST_PROXY` | 信任代理头 | `false` |

### 上传配置

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `MAX_FILE_SIZE` | 最大文件大小（字节） | `104857600` (100MB) |
| `DEFAULT_WEBP_QUALITY` | WebP压缩质量(1-100) | `90` |
| `THUMBNAIL_SIZE` | 缩略图尺寸 | `400` |

### 性能优化（优化版特有）

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `DB_CACHE_FLUSH_INTERVAL` | 缓存刷新间隔(毫秒) | `5000` |
| `DB_CACHE_FLUSH_THRESHOLD` | 触发写入的修改次数 | `10` |
| `ENABLE_AUTO_CLEANUP` | 启用自动清理过期图片 | `true` |
| `CLEANUP_EXPIRED_INTERVAL` | 清理间隔(毫秒) | `3600000` (1小时) |

### 日志配置

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `LOG_LEVEL` | 日志级别(debug/info/warn/error) | `info` |
| `LOG_TO_FILE` | 记录到文件 | `false` |

## 📦 数据持久化

**重要**：必须挂载以下目录以保证数据持久化

| 容器路径 | 说明 | 必需 |
|---------|------|------|
| `/app/uploads` | 上传的图片文件 | ✅ 必需 |
| `/app/data` | 数据库文件(db.json) | ✅ 必需 |
| `/app/logs` | 日志文件 | ⚪ 可选 |

## 🌐 反向代理配置

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

配置环境变量：

```yaml
environment:
  - BASE_URL=https://img.example.com
  - TRUST_PROXY=true
```

### Caddy 示例

```
img.example.com {
    reverse_proxy localhost:7878
}
```

## 🔧 维护操作

### 查看日志

```bash
# Docker Compose
docker compose logs -f nodeimage

# Docker
docker logs -f nodeimage

# 查看最近100行
docker logs --tail 100 nodeimage
```

### 更新镜像

```bash
# 拉取最新版本
docker compose pull

# 重启服务
docker compose up -d

# 或一条命令
docker compose up -d --pull always
```

### 备份数据

```bash
# 备份所有数据
tar -czf nodeimage-backup-$(date +%Y%m%d).tar.gz uploads/ data/

# 仅备份数据库
cp data/db.json data/db.json.backup
```

### 恢复数据

```bash
# 停止容器
docker compose down

# 恢复备份
tar -xzf nodeimage-backup-20231203.tar.gz

# 启动容器
docker compose up -d
```

## 📖 API 使用示例

### 用户注册

```bash
curl -X POST http://localhost:7878/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"user1","password":"password123"}'
```

### 图片上传（需登录或API密钥）

```bash
# 使用API密钥上传
curl -X POST http://localhost:7878/api/upload \
  -H "X-API-Key: your_api_key" \
  -F "image=@/path/to/image.jpg"

# 响应示例
{
  "success": true,
  "data": {
    "url": "http://localhost:7878/uploads/abc123.webp",
    "markdown": "![image](http://localhost:7878/uploads/abc123.webp)",
    "html": "<img src=\"http://localhost:7878/uploads/abc123.webp\" alt=\"image\" />"
  }
}
```

## 🏗️ 架构特点（优化版）

本镜像基于 [lx969788249/nodeimage_clone](https://github.com/lx969788249/nodeimage_clone) 优化而来：

- ⚡ **内存缓存**: 数据库操作响应提升50-100倍
- 📊 **结构化日志**: 便于调试和监控
- 🏗️ **模块化架构**: 代码可维护性大幅提升
- 🧹 **智能清理**: 自动清理过期图片节省空间
- 🔒 **优雅关闭**: 确保数据安全不丢失

## 🐳 镜像信息

- **基础镜像**: `node:18-alpine`
- **架构支持**: `linux/amd64`, `linux/arm64`, `linux/arm/v7`
- **镜像大小**: ~150MB
- **自动构建**: GitHub Actions自动构建推送

## 📚 文档和支持

- **完整文档**: https://github.com/gibaragibara/nodeimage_clone/blob/main/README.md
- **问题反馈**: https://github.com/gibaragibara/nodeimage_clone/issues
- **源代码**: https://github.com/gibaragibara/nodeimage_clone

## 📄 许可证

MIT License - 详见 [LICENSE](https://github.com/gibaragibara/nodeimage_clone/blob/main/LICENSE)

---

**喜欢这个项目？** 给个 ⭐ Star 吧！
