# Nodeimage 克隆版

本项目是对 https://www.nodeimage.com 的本地可部署克隆，保留了原站的界面、动画和核心功能：拖拽/粘贴上传、WebP 压缩、水印、历史记录、API 密钥、复制多格式链接、暗黑模式等。后端基于 Express + sharp，文件与数据均存储在本地。

## 目录结构
- `server.js`：Express 服务，处理上传、历史记录、API 密钥、鉴权等。
- `public/`：前端页面与静态资源（CSS/JS/Favicon）。
- `uploads/`：上传后的原图与缩略图（运行时生成，已在 `.gitignore`）。
- `data/db.json`：用户与图片元数据的轻量存储（运行时生成，已在 `.gitignore`）。
- `package.json`：依赖与脚本。

## 运行要求
- Node.js 18+（推荐 20+/24+）。
- npm（或 pnpm/yarn，脚本以 npm 示例）。
- Linux/macOS 需要 `libvips` 依赖（sharp 用）。常见发行版可通过包管理器安装：
  - Debian/Ubuntu: `sudo apt-get install -y libvips`
  - CentOS/RHEL: `sudo yum install -y vips`

## 快速开始（本地）
```bash
npm install
npm start   # 默认 http://localhost:3000
```
启动后访问 `http://localhost:3000`。默认账号密码：`admin / admin`，登录后可在“修改账号密码”中更改。

## 环境变量
| 变量名 | 说明 | 默认值 |
| --- | --- | --- |
| `PORT` | 服务监听端口 | `3000` |
| `SESSION_SECRET` | 会话签名密钥 | `nodeimage-clone-secret` |
| `BASE_URL` | 外部访问地址，用于生成链接（未设置时按请求 Host/Protocol 自动推断） | 自动推断 |

## 核心功能
- 拖拽/点击/粘贴上传，支持 JPG/JPEG/PNG/GIF/WebP/AVIF/SVG，最大 100MB。
- 可选 WebP 压缩与质量调节；可选水印（站点名、用户名）。
- 自动复制直链/Markdown/HTML/BBCode（可开关）。
- 自动删除天数选项（元数据记录，可在生产中按需实现定时清理）。
- 历史记录、分页、批量复制、批量删除、单图删除、预览大图（缩放/拖拽）。
- API 密钥获取/重置，API 说明与 cURL 示例。
- 暗黑模式切换、设置卡片翻转动画、通知浮层等 UI/动效。

## API 简要
所有接口默认需要会话登录；使用 API 时可在 Header 附带 `X-API-Key` 进行鉴权。

- `POST /api/upload`
  - Form-Data 字段：`image`(文件)；可选：`compressToWebp`(bool)、`webpQuality`(10-100)、`autoWatermark`、`watermarkContent`、`autoDelete`、`deleteDays`。
  - 返回：`url`、`thumbUrl`、`markdown`、`html`、`bbcode`、宽高、大小等。

- `GET /api/images?page=1&limit=18`：当前用户历史列表，含分页信息。
- `POST /api/images/delete`：JSON `{ ids: ["id1","id2"] }` 批量删除。
- `GET /api/v1/list`：历史列表（简单版）。
- `DELETE /api/v1/delete/:id`：删除单图。
- `GET /api/user/api-key`：获取当前用户 API Key。
- `POST /api/user/regenerate-api-key`：重置 API Key。
- `GET /api/stats`：站点总览（总数/今日/累计大小）。

### cURL 示例
```bash
# 上传
curl -X POST "http://localhost:3000/api/upload" \
  -H "X-API-Key: <你的API密钥>" \
  -F "image=@/path/to/image.jpg"

# 删除
curl -X DELETE "http://localhost:3000/api/v1/delete/<image_id>" \
  -H "X-API-Key: <你的API密钥>"

# 列表
curl -X GET "http://localhost:3000/api/v1/list" \
  -H "X-API-Key: <你的API密钥>"
```

## Docker 部署

### 直接运行
已推送的镜像：`lx969788249/nodeimage_clone:latest`

```bash
docker pull lx969788249/nodeimage_clone:latest
docker run -d --name nodeimage \
  -p 3000:3000 \
  -e SESSION_SECRET=change_me \
  -e BASE_URL=https://img.example.com \
  -v nodeimage_uploads:/app/uploads \
  -v nodeimage_data:/app/data \
  lx969788249/nodeimage_clone:latest
```
访问 `http://localhost:3000` 登录（admin/admin），再按需修改账号密码。

### Docker Compose
新建 `docker-compose.yml`：
```yaml
services:
  nodeimage:
    image: lx969788249/nodeimage_clone:latest
    ports:
      - "3000:3000"
    environment:
      SESSION_SECRET: change_me
      # BASE_URL: https://img.example.com
    volumes:
      - nodeimage_uploads:/app/uploads
      - nodeimage_data:/app/data
volumes:
  nodeimage_uploads:
  nodeimage_data:
```
执行：
```bash
docker compose up -d
```

## 部署指南（本机或服务器）
1. **安装依赖**
   ```bash
   npm install --production
   ```
2. **准备目录**
   - 确保 `uploads/` 与 `data/` 可写（启动时会自动创建）。
3. **配置环境变量**（按需）：
   ```bash
   export PORT=8080
   export SESSION_SECRET=your-secret
   export BASE_URL=https://img.example.com
   ```
4. **启动服务**
   ```bash
   npm start
   ```
   或使用 `pm2`/`forever`/`systemd` 等守护进程：
   ```bash
   pm2 start server.js --name nodeimage-clone
   pm2 save
   ```
5. **反向代理（可选）**：Nginx 示例
   ```nginx
   server {
     listen 80;
     server_name img.example.com;

     location / {
       proxy_pass http://127.0.0.1:3000;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
     }

     client_max_body_size 100m;
   }
   ```

## 数据与持久化
- **图片文件**：`uploads/` 下按 `id.ext` 保存，缩略图在 `uploads/thumbs/`。
- **元数据**：`data/db.json` 记录用户、图片信息。可替换为正式数据库（MongoDB/MySQL 等），逻辑集中在 `server.js`，可按需改写持久层。
- **清理任务**：若启用“自动删除”选项，可在生产环境添加定时任务遍历 `data/db.json` 清理过期文件。

## 常见问题
- 401/未授权：点击右上角“NodeSeek 授权”按钮完成本地登录，或在 API 请求头带上 `X-API-Key`。
- 复制失败：浏览器权限限制时手动选择文本，或在安全上下文使用 HTTPS。
- sharp 报错：确认已安装 `libvips`，并使用兼容的 Node 版本。

部署过程中如需进一步帮助，可直接反馈。祝使用愉快！
