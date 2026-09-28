---
title: "Elasticsearch 本地实践：WSL2 + Docker 安装与 REST 速查"
description: "Windows WSL2 下用 Docker 跑 Elasticsearch 9.5.3 与 Kibana，含 docker run 逐段说明、自定义网络连接、索引/文档 REST API 与常用操作示例。"
date: 2026-09-28
tags:
  - Elasticsearch
  - Docker
  - WSL2
  - Kibana
draft: false
pinned: false
---

## 环境说明

- **系统**：Windows + WSL2
- **代理**：代理工具建议开**虚拟网卡模式**，否则 `docker pull` 拉镜像会很慢
- **ES / Kibana 版本**：本文统一用 **9.5.3**，两者主版本必须一致

查询 DSL（bool、term、match、nested）另读：[Elasticsearch 查询 DSL 从入门到搞懂](/blog/elasticsearch-bool-query-guide)

---

## 一、拉取镜像

```bash
docker pull docker.elastic.co/elasticsearch/elasticsearch:9.5.3
docker pull docker.elastic.co/kibana/kibana:9.5.3
```

---

## 二、快速启动 Elasticsearch（单机实验）

```bash
docker run -d --name es \
  -p 9200:9200 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  docker.elastic.co/elasticsearch/elasticsearch:9.5.3
```

浏览器或命令行访问：<http://localhost:9200/>，应返回集群信息 JSON。

### `docker run` 逐段解释

| 部分 | 含义 |
|------|------|
| `docker run` | **创建并启动**一个新容器（不是「只启动」） |
| `-d` | detached，后台运行 |
| `--name es` | 容器名叫 `es`，便于 `docker stop es` / `docker logs es` |
| `-p 9200:9200` | 端口映射 `宿主机:容器`，访问 `localhost:9200` 即连 ES |
| `-e discovery.type=single-node` | 单节点模式，避免单机环境下集群选举失败 |
| `-e xpack.security.enabled=false` | 关闭认证，实验阶段可直接 `curl http://localhost:9200` |
| 镜像名 `...:9.5.3` | 使用 Elastic 官方 9.5.3 镜像 |

### 常见误区

`docker run` = **创建 + 启动**：

- **第一次**：拉镜像 → 创建容器 `es` → 启动 ✅
- **第二次再跑同一条**：镜像已有，但会再创建一个也叫 `es` 的容器 → **名字冲突报错** ❌

已有容器要用 `docker start es`，不要重复 `docker run`。

---

## 三、Kibana 连接 ES（推荐：自定义网络）

要让 Kibana 用容器名 `es` 访问 Elasticsearch，两个容器必须在**同一 Docker 网络**里。默认 bridge 网络**不能**靠容器名互访。

### 改造现有 ES 容器

若之前没挂数据卷、只是做实验，删掉重建最简单：

```bash
# 1. 停掉并删除旧容器
docker stop es && docker rm es

# 2. 创建自定义网络
docker network create es-net

# 3. 在同一网络里启动 ES（-v 持久化数据）
docker run -d --name es \
  --net es-net \
  -p 9200:9200 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  -v es-data:/usr/share/elasticsearch/data \
  docker.elastic.co/elasticsearch/elasticsearch:9.5.3
```

`-v` 记忆：**左边以 `/` 或 `./` 开头 → 绑定挂载；否则 → 命名卷**（如 `es-data`）。

### 启动 Kibana

```bash
docker run -d --name kibana \
  --net es-net \
  -p 5601:5601 \
  -e "ELASTICSEARCH_HOSTS=http://es:9200" \
  docker.elastic.co/kibana/kibana:9.5.3
```

`http://es:9200` 里的 `es` 是 ES **容器名**；同在 `es-net` 里时，Docker DNS 会解析到 ES 容器 IP。

稍等片刻后打开：<http://localhost:5601/>

### 日常启停

```bash
# 同时启动
docker start es && docker start kibana

# 同时关闭（先停 kibana 再停 es）
docker stop kibana es
```

---

## 四、可视化工具（可选）

- Chrome 插件：**Elasticsearch Multi-head(s)**
- 或该插件对应的开源前端项目

Kibana 功能更全；Multi-head 适合快速看索引与文档。

---

## 五、分词：standard vs IK

默认 **standard** 分词对中文不友好。例如：

```json
POST _analyze
{
  "analyzer": "standard",
  "text": "The 2 QUICK Brown-Foxes jumped over the lazy dog's bone."
}
```

中文场景常用 **IK 分词器**（需安装插件）。例如「我是中国人」可能分为「我 / 是 / 中国 / 人」，而不是 standard 下按单字拆开。也可在 IK 里配置**自定义词典**。

---

## 六、REST API 速查

### 针对索引

| 操作 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 创建索引 | `PUT` | `/索引名` | 可带 `mappings` |
| 新增字段 | `PUT` | `/索引名/_mapping` | 追加 mapping |
| 删除索引 | `DELETE` | `/索引名` | 整库删除 |
| 查看索引 | `GET` | `/索引名` | |
| 查看 mapping | `GET` | `/索引名/_mapping` | |

### 针对文档

| 操作 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 新增/全量覆盖 | `PUT` | `/索引名/_doc/文档id` | 必须指定 id |
| 新增（自动 id） | `POST` | `/索引名/_doc` | ES 生成 id |
| 局部更新 | `POST` | `/索引名/_update/文档id` | 推荐改字段 |
| 删除文档 | `DELETE` | `/索引名/_doc/文档id` | |
| 获取文档 | `GET` | `/索引名/_doc/文档id` | |
| 搜索 | `POST` | `/索引名/_search` | 复杂 DSL 用 POST |

### 一句话记忆

```text
PUT  → 增 + 改（全量覆盖），需指定 id
POST → 增（自动 id）+ 改（局部 update）+ 查（search）
GET  → 只查
DELETE → 只删
```

### 为什么搜索用 POST 而不是 GET？

HTTP 规范里 **GET 不应带 body**。ES 搜索 DSL 往往很长，放 URL 会超长且难维护，所以用 **`POST /索引/_search` + JSON body**。

---

## 七、实操示例

以下可在 Kibana Dev Tools 或 `curl` 里执行。

### 7.1 不写 mapping，直接插入文档

```json
PUT /test1/_doc/1
{
  "name": "我爱中国",
  "age": 3
}
```

动态 mapping 下，字符串字段通常会建成 **text + `.keyword` 子字段**（见 [查询 DSL 博文](/blog/elasticsearch-bool-query-guide) 的 title.keyword 说明）。

查看：

```json
GET test1/_mapping
GET test1
```

### 7.2 先建索引，指定字段类型

```json
PUT /test2
{
  "mappings": {
    "properties": {
      "name": { "type": "long" },
      "birthday": { "type": "date" }
    }
  }
}
```

后续追加字段：

```json
PUT /test2/_mapping
{
  "properties": {
    "age": { "type": "integer" }
  }
}

PUT /test2/_mapping
{
  "properties": {
    "my_text": { "type": "text" }
  }
}
```

插入文档：

```json
PUT /test2/_doc/2
{
  "desc": "I do not know what to say"
}
```

### 7.3 修改文档

**全量覆盖（PUT）**：未写的字段会被清掉。

```json
PUT /test1/_doc/1
{
  "name": "我说112"
}
```

上面若原来有 `age`，覆盖后 **age 会消失**。要保留其他字段需写全，或用局部更新：

```json
POST /test1/_update/1
{
  "doc": {
    "age": 81
  }
}
```

### 7.4 删除

```json
DELETE test1
DELETE /test1/_doc/2
```

### 7.5 查询与集群状态

```json
GET /test1/_doc/1

POST test1/_search
{
  "query": { "match_all": {} }
}

GET _cat/health
GET _cat/indices?v
```

复杂条件搜索见 [bool / term / match 入门](/blog/elasticsearch-bool-query-guide)。

---

## 八、Query 层级结构（复习）

```text
query
 └── 只能放一个顶层查询
      ├── match / term / range …   ← 叶子查询
      └── bool                     ← 组合器
           ├── must
           ├── filter
           ├── should
           └── must_not
```

要点：

- `query` 下**只有一个**根查询（要么是 leaf，要么是 `bool`）。
- `must` / `filter` / `should` / `must_not` **只能出现在 bool 里面**，不会和 `bool` 同级。

---

## 踩坑清单

1. **不要对同名容器重复 `docker run`** — 用 `docker start`。
2. **Kibana 与 ES 版本要一致**（如都是 9.5.3）。
3. **Kibana 连 ES 要用自定义网络 + 容器名** — `ELASTICSEARCH_HOSTS=http://es:9200`。
4. **PUT 全量覆盖会丢未写字段** — 改单个字段用 `POST .../_update`。
5. **WSL2 拉镜像慢** — 检查代理是否虚拟网卡模式。

---

## 延伸阅读

- [Elasticsearch 查询 DSL 从入门到搞懂](/blog/elasticsearch-bool-query-guide)
- [为什么 nested 不能用 term 组合代替？](/blog/elasticsearch-nested-vs-term)
- [Elasticsearch 官方 Docker 文档](https://www.elastic.co/guide/en/elasticsearch/reference/current/docker.html)
