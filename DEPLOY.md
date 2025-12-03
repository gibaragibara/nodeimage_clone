# GitHub + Docker Hub 部署指南

## 步骤 1: 准备 Git 仓库

```bash
# 初始化 Git（如果还没有）
cd d:\fantasy\nodeimage_clone
git init

# 添加所有文件
git add .

# 提交
git commit -m "feat: 优化版本 - 添加性能优化和模块化架构"

# 添加远程仓库（替换为你的 GitHub 仓库地址）
git remote add origin https://github.com/gibaragibara/nodeimage_clone.git

# 推送到 GitHub
git push -u origin main
```

## 步骤 2: 构建并推送 Docker 镜像

### 方法A: 本地构建（单架构）

```bash
# 登录 Docker Hub
docker login

# 构建镜像
docker build -t jbyyy/nodeimage_clone:latest .

# 测试镜像
docker run -d -p 7878:7878 --name test_nodeimage jbyyy/nodeimage_clone:latest

# 如果测试成功，推送到 Docker Hub
docker push jbyyy/nodeimage_clone:latest

# 清理测试容器
docker stop test_nodeimage && docker rm test_nodeimage
```

### 方法B: 多架构构建（推荐）

支持 AMD64、ARM64、ARMv7 等多种架构：

```bash
# 创建 buildx builder
docker buildx create --name multiarch --use
docker buildx inspect --bootstrap

# 构建并推送多架构镜像
docker buildx build \
  --platform linux/amd64,linux/arm64,linux/arm/v7 \
  -t jbyyy/nodeimage_clone:latest \
  --push .
```

## 步骤 3: 使用 GitHub Actions 自动构建（可选）

创建 `.github/workflows/docker-publish.yml`:

```yaml
name: Docker Build and Push

on:
  push:
    branches: [ main ]
    tags: [ 'v*' ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up QEMU
        uses: docker/setup-qemu-action@v2
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: jbyyy/nodeimage_clone
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=raw,value=latest,enable={{is_default_branch}}
      
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          platforms: linux/amd64,linux/arm64,linux/arm/v7
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
```

在 GitHub 仓库设置中添加 Secrets:
- `DOCKERHUB_USERNAME`: 你的 Docker Hub 用户名
- `DOCKERHUB_TOKEN`: Docker Hub Access Token

## 步骤 4: 用户使用

更新 README.md 中的镜像地址：

```bash
docker run -d \
  --name nodeimage_clone \
  -p 7878:7878 \
  -e SESSION_SECRET=随机字符串 \
  -v ./data:/app/data \
  -v ./uploads:/app/uploads \
  jbyyy/nodeimage_clone:latest
```

或使用 docker-compose:

```yaml
services:
  nodeimage:
    image: jbyyy/nodeimage_clone:latest
    ports:
      - "7878:7878"
    environment:
      - SESSION_SECRET=随机字符串
    volumes:
      - ./data:/app/data
      - ./uploads:/app/uploads
```

## 常见问题

### Q: 如何给镜像打标签（版本号）？

```bash
# 构建时指定版本
docker build -t jbyyy/nodeimage_clone:v1.0.0 .
docker build -t jbyyy/nodeimage_clone:latest .

# 推送所有标签
docker push jbyyy/nodeimage_clone:v1.0.0
docker push jbyyy/nodeimage_clone:latest
```

### Q: 如何测试 Docker 镜像？

```bash
# 本地测试
docker-compose up

# 检查日志
docker-compose logs -f

# 访问 http://localhost:7878 测试功能
```

### Q: 忘记推送了什么？

检查 `.dockerignore` 和 `.gitignore` 确保没有排除必要文件。

## 完整清单

- [ ] 代码已提交到 GitHub
- [ ] Docker 镜像已构建
- [ ] Docker 镜像已推送到 Docker Hub
- [ ] README.md 已更新镜像地址
- [ ] 在另一台机器上测试 `docker pull` 和运行
- [ ] （可选）设置 GitHub Actions 自动构建
