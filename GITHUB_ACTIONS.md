# GitHub Actions 自动构建 Docker 镜像指南

## 步骤 1: 创建 Docker Hub Access Token

1. 登录 [Docker Hub](https://hub.docker.com/)
2. 点击右上角头像 → **Account Settings**
3. 左侧菜单选择 **Security**
4. 点击 **New Access Token**
5. 填写信息:
   - Token Description: `GitHub Actions`
   - Access permissions: `Read, Write, Delete`
6. 点击 **Generate** 并**复制保存** Token（只显示一次！）

## 步骤 2: 在 GitHub 仓库中添加 Secrets

1. 进入你的 GitHub 仓库
2. 点击 **Settings** 标签
3. 左侧菜单找到 **Secrets and variables** → **Actions**
4. 点击 **New repository secret** 添加以下两个 secrets:

### Secret 1: DOCKERHUB_USERNAME
- **Name**: `DOCKERHUB_USERNAME`
- **Value**: 你的 Docker Hub 用户名（例如：`zhangsan`）

### Secret 2: DOCKERHUB_TOKEN
- **Name**: `DOCKERHUB_TOKEN`
- **Value**: 刚才复制的 Docker Hub Access Token

## 步骤 3: 提交代码到 GitHub

```bash
cd d:\fantasy\nodeimage_clone

# 初始化 Git（如果还没有）
git init

# 添加所有文件
git add .

# 提交
git commit -m "feat: 添加 GitHub Actions 自动构建"

# 添加远程仓库
git remote add origin https://github.com/gibaragibara/nodeimage_clone.git

# 推送到 GitHub
git push -u origin main
```

## 步骤 4: 查看构建状态

1. 打开 GitHub 仓库页面
2. 点击 **Actions** 标签
3. 你会看到正在运行的 workflow
4. 点击进去可以查看详细的构建日志

## 自动触发条件

GitHub Actions 会在以下情况自动运行：

### ✅ 自动构建和推送
- 推送到 `main` 或 `master` 分支
- 创建版本标签（如 `v1.0.0`）

### ✅ 仅构建测试（不推送）
- Pull Request 到 `main` 或 `master` 分支

## 生成的镜像标签

根据不同的触发方式，会生成不同的标签：

| 触发方式 | 生成的标签 | 示例 |
|---------|-----------|------|
| 推送到 main 分支 | `latest`, `main` | `gibara/nodeimage_clone:latest` |
| 推送标签 v1.0.0 | `v1.0.0`, `1.0`, `1`, `latest` | `gibara/nodeimage_clone:v1.0.0` |
| Pull Request | `pr-123` | `gibara/nodeimage_clone:pr-123` |

## 发布新版本

当你想发布一个新版本时：

```bash
# 创建并推送标签
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions 会自动：
1. 构建多架构镜像（amd64, arm64, arm/v7）
2. 推送到 Docker Hub
3. 打上版本标签

## 使用发布的镜像

构建完成后，用户可以直接拉取：

```bash
# 拉取最新版本
docker pull gibara/nodeimage_clone:latest

# 拉取指定版本
docker pull gibara/nodeimage_clone:v1.0.0
```

## 查看构建日志

如果构建失败：
1. 进入 **Actions** 标签
2. 点击失败的 workflow
3. 查看详细错误信息
4. 修复后重新推送代码

## 高级功能

### 手动触发构建

在 GitHub 仓库页面：
1. 点击 **Actions**
2. 选择 `Build and Push Docker Image`
3. 点击 **Run workflow**
4. 选择分支并点击绿色的 **Run workflow** 按钮

要启用此功能，在 `.github/workflows/docker-publish.yml` 的 `on:` 部分添加：

```yaml
on:
  workflow_dispatch:  # 添加这一行
  push:
    branches:
      - main
```

### 构建缓存

workflow 已经配置了 GitHub Actions 缓存，可以加快后续构建速度：
- 首次构建: ~5-10 分钟
- 后续构建: ~2-3 分钟（有缓存）

## 常见问题

### Q: 如何验证 Secrets 是否正确？

在 Actions 日志中，如果看到 "Login to Docker Hub" 步骤成功，说明配置正确。

### Q: 构建很慢怎么办？

多架构构建需要时间。如果只需要 amd64，可以修改 workflow:

```yaml
platforms: linux/amd64  # 只构建 amd64
```

### Q: 如何只在发布时推送镜像？

修改 workflow，移除 `push.branches` 部分，只保留 `tags`。

## 完成清单

- [ ] 创建 Docker Hub Access Token
- [ ] 在 GitHub 添加 DOCKERHUB_USERNAME secret
- [ ] 在 GitHub 添加 DOCKERHUB_TOKEN secret
- [ ] 创建 .github/workflows/docker-publish.yml 文件
- [ ] 提交并推送代码到 GitHub
- [ ] 检查 Actions 标签页确认构建成功
- [ ] 在 Docker Hub 验证镜像已发布
- [ ] 测试拉取镜像: `docker pull gibara/nodeimage_clone:latest`

---

完成这些步骤后，每次你推送代码或创建版本标签，GitHub Actions 都会自动构建并推送 Docker 镜像到 Docker Hub！🎉
