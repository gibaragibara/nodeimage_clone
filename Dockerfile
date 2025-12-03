FROM node:18-alpine

WORKDIR /app

# 安装构建依赖（Sharp 需要）
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    vips-dev

# 复制 package.json 并安装依赖
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# 复制应用代码和新增模块
COPY config.js ./
COPY logger.js ./
COPY server.js ./
COPY public ./public
COPY services ./services
COPY middleware ./middleware
COPY utils ./utils

# 创建必要的目录
RUN mkdir -p uploads/thumbs data logs

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=7878
ENV LOG_LEVEL=info

# 暴露端口
EXPOSE 7878

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:7878/api/stats', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动应用
CMD ["node", "server.js"]
