# Nodeimage 克隆版

## 唠嗑

眼馋nodeimage很久了。非常喜欢这种简洁好看的图床。一直想要一个，之前听说@shuai大佬说会开源，给我高兴的等了好久，但是等了很久实在是等不下去了（没有任何催开源的意思，纯粹是太眼馋了），所以就想着借助ai自己手搓一个，前前后后搞了两天（codex还是不太行，太傻），终于是搓出来了。本来想着自己用，后来一想，干脆分享出来算了，大家如果喜欢的话也欢迎部署哈。我个人觉得相似度还是挺高的嘿嘿

[演示网址](https://tc.vpsyyds.eu.org/)

![image](https://tc.cxkikun.com/i/2025/12/01/692d6c06d0630.webp)


## 介绍

本项目是对 https://www.nodeimage.com 的本地可部署克隆，保留了原站的界面、动画和核心功能：拖拽/粘贴上传、WebP 压缩、水印、历史记录、API 密钥、复制多格式链接、暗黑模式等。后端基于 Express + sharp，文件与数据均存储在本地。

## Docker run部署

### 直接运行
```bash
mkdir -p /root/nodeimage_clone/{data,uploads} && \
docker run -d --name nodeimage_clone \
  --restart unless-stopped \
  -p 7878:7878 \
  -e SESSION_SECRET=change_me \
  -v "/root/nodeimage_clone/uploads:/app/uploads" \
  -v "/root/nodeimage_clone/data:/app/data" \
  lx969788249/nodeimage_clone:latest
```
访问 `http://localhost:3000` 登录，*默认账号：**admin** 默认密码：**admin***

再按需修改账号密码。

### Docker Compose（推荐）

创建并进入文件夹

```bash
mkdir -p /root/nodeimage_clone/{data,uploads} && cd nodeimage_clone
```

新建 `docker-compose.yml`，输入下面的内容
```yaml
services:
  nodeimage:
    image: lx969788249/nodeimage_clone:latest
    ports:
      - "7878:7878"
    restart: unless-stopped
    environment:
      SESSION_SECRET: change_me   # 自定义字符串，用于安全校验，随便填，不用记
      # BASE_URL: https://img.example.com
    volumes:
      - /root/nodeimage/uploads:/app/uploads
      - /root/nodeimage/data:/app/data
```
执行保存之后执行
```bash
docker compose up -d
```

访问 `http://localhost:3000` 登录，*默认账号：**admin** 默认密码：**admin***
