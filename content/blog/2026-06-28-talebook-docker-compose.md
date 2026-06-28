---
title: Talebook 搭建指南：Docker Compose + 豆瓣元数据刮削
description: 用 Docker Compose 一键部署 Talebook（Calibre 电子书库），搭配豆瓣 API 自动刮削书籍封面和元数据。
date: 2026-06-28
tags:
  - Docker
  - Talebook
draft: false
pinned: false
---

Talebook 是一个基于 Calibre 的自托管电子书管理与在线阅读系统，支持多用户、OPDS 推送和豆瓣元数据自动刮削。下面用 Docker Compose 把 Talebook 本体和豆瓣刮削插件一起拉起来。

## 1. 创建工作目录

在服务器或 NAS 上新建一个目录，用来存放 Talebook 的所有数据和配置。这里以 `/data/talebook` 为例：

```bash
mkdir -p /data/talebook
cd /data/talebook
```

## 2. 编写 docker-compose.yml

在目录下创建 `docker-compose.yml`：

```bash
vi docker-compose.yml
```

将以下内容粘贴进去：

```yaml
version: "3"

services:
  # Talebook 主服务
  talebook:
    image: talebook/talebook:latest
    container_name: talebook
    restart: always
    volumes:
      - ./data:/data
    ports:
      - "8080:80"
      - "8443:443"
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=Asia/Shanghai
      - SSR=OFF   # 如需搜索引擎友好可改为 ON，但会增加服务器负载
    depends_on:
      - douban-rs-api

  # 豆瓣元数据刮削插件（强烈推荐）
  douban-rs-api:
    image: ghcr.io/cxfksword/douban-api-rs
    container_name: douban-api-rs
    restart: always
```

### 参数说明

| 参数 | 说明 |
|------|------|
| `./data`（缩写对应 `/data/talebook/data`） | 书籍文件和系统数据实际存放的路径 |
| `8080:80` | 左侧 `8080` 是浏览器访问端口，可按需改成其他未被占用的端口 |
| `PUID` / `PGID` | 运行容器的用户和组 ID，确保容器对 `./data` 目录有读写权限 |
| `SSR` | 设为 `ON` 后服务端会渲染页面，对搜索引擎更友好，但更吃 CPU |

## 3. 启动与常用管理命令

> Talebook 镜像内包含了完整的 Calibre 引擎，体积约 2GB，初次拉取需要稍等片刻。

```bash
# 初次启动（拉取镜像 + 后台运行）
docker-compose up -d

# 停止（数据卷不受影响，书籍和配置不会丢）
docker-compose down

# 再次启动（配置没改过，直接 up -d 即可）
docker-compose up -d

# 修改过 docker-compose.yml 后需要重建
docker-compose up -d --force-recreate
```

简单记：**启动用 `up -d`，停止用 `down`**。不管停了多少次，只要没改配置，`up -d` 都能重新拉起来。

启动完成后，浏览器访问 `http://<你的服务器IP>:8080` 就能看到 Talebook 的界面了。

添加书籍时，豆瓣刮削插件会自动拉取封面、作者、简介等元数据，省去手工编辑的麻烦。