# 服务器部署指南

## 问题诊断

如果遇到"登录后仍提示未登录"的问题，通常是以下原因：

### 1. **HTTPS 环境下 Cookie 配置问题**

**症状**：本地 HTTP 环境正常，服务器 HTTPS 环境登录失败

**解决方案**：

设置环境变量：
```bash
# 在 .env 文件或 docker-compose.yml 中设置
NODE_ENV=production
TRUST_PROXY=true
```

### 2. **CORS 跨域问题**

**症状**：浏览器控制台显示 CORS 错误

**解决方案**：

设置允许的域名：
```bash
# 允许特定域名
CORS_ORIGIN=https://yourdomain.com

# 或允许所有域名（不推荐生产环境）
CORS_ORIGIN=true
```

### 3. **反向代理配置**

使用 Nginx 或 Caddy 等反向代理时，需要正确转发协议信息。

#### Nginx 配置示例

```nginx
server {
    listen 443 ssl http2;
    server_name image.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:7878;
        
        # 必须的代理头
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;  # 重要！告诉应用使用 HTTPS
        
        # 支持大文件上传
        client_max_body_size 100M;
    }
}
```

#### Caddy 配置示例

```caddy
image.yourdomain.com {
    reverse_proxy localhost:7878
}
```

Caddy 会自动处理 HTTPS 和代理头。

## Docker Compose 部署（推荐）

### 1. 创建 docker-compose.yml

```yaml
version: '3.8'

services:
  nodeimage:
    image: jbyyy/nodeimage_clone:latest
    container_name: nodeimage
    restart: unless-stopped
    ports:
      - "7878:7878"
    volumes:
      - ./data:/app/data
      - ./uploads:/app/uploads
    environment:
      - NODE_ENV=production
      - TRUST_PROXY=true
      - SESSION_SECRET=your-random-secret-key-here
      - CORS_ORIGIN=true
      # 如果只允许特定域名访问，设置为：
      # - CORS_ORIGIN=https://yourdomain.com
```

### 2. 启动服务

```bash
docker-compose up -d
```

### 3. 查看日志

```bash
docker-compose logs -f
```

## 传统部署方式

### 1. 安装依赖

```bash
npm install
```

### 2. 创建 .env 文件

```bash
cp .env.example .env
nano .env  # 编辑配置
```

必须修改的配置：
```bash
NODE_ENV=production
SESSION_SECRET=your-random-secret-key-here  # 修改为随机字符串
CORS_ORIGIN=https://yourdomain.com  # 设置为您的域名
```

### 3. 使用 PM2 运行

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start server.js --name nodeimage

# 设置开机自启
pm2 startup
pm2 save
```

## 测试 Cookie 配置

### 使用浏览器开发者工具

1. 打开 **DevTools (F12)**
2. 进入 **Application** 标签
3. 左侧选择 **Cookies**
4. 查看 cookie 属性：

正确的 cookie 应该有：
- ✅ `HttpOnly`: Yes
- ✅ `Secure`: Yes (HTTPS 环境)
- ✅ `SameSite`: Lax
- ✅ `Domain`: 您的域名

### 使用 curl 测试

```bash
# 登录并保存 cookie
curl -v -c cookies.txt -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'

# 使用 cookie 检查状态
curl -v -b cookies.txt https://yourdomain.com/api/user/status
```

应该看到 `authenticated: true`。

## 常见问题

### Q: 为什么本地可以，服务器不行？

**A**: 因为本地使用 HTTP，服务器使用 HTTPS。HTTPS 要求 cookie 的 `secure` 属性为 `true`，但浏览器会根据协议自动判断。确保设置了 `TRUST_PROXY=true`。

### Q: 多域名部署如何配置？

**A**: 可以设置 CORS_ORIGIN 为数组（需要代码修改），或使用通配符。推荐为每个域名单独配置：

```javascript
// 修改 server.js 中的 CORS 配置
app.use(cors({
  origin: ['https://domain1.com', 'https://domain2.com'],
  credentials: true
}));
```

### Q: 使用 Docker 时如何查看日志？

**A**: 
```bash
docker logs -f nodeimage
```

### Q: 如何重新生成 Session 密钥？

**A**: 修改 `.env` 中的 `SESSION_SECRET`，重启应用。注意：这会导致所有用户被登出。

## 安全建议

1. ✅ 生产环境必须修改 `SESSION_SECRET`
2. ✅ 限制 CORS 到特定域名
3. ✅ 使用 HTTPS
4. ✅ 定期备份 `data` 和 `uploads` 目录
5. ✅ 设置合理的文件大小限制

## 性能优化

1. 使用 Redis 存储 session（大量用户时）
2. 使用 CDN 加速静态资源
3. 启用 Nginx gzip 压缩
4. 定期清理过期图片

如有问题，请查看项目 [GitHub Issues](https://github.com/gibaragibara/nodeimage_clone/issues)
