---
title: "Elasticsearch 查询 DSL 从入门到搞懂"
description: "bool 的 must/filter/should 怎么分工，term 与 match 如何配对 keyword/text，title.keyword 双字段、nested 嵌套查询，附倒排索引示例、电商搜索 DSL 与常见 FAQ。"
date: 2026-09-23
tags:
  - Elasticsearch
  - bool
  - nested
  - 搜索引擎
draft: false
pinned: false
---

## 先把结论写在前面

第一次写 ES 查询，很容易对着 JSON 发懵：

> 为什么有的写 `bool`，有的写 `term`，还要 `nested`？  
> `must` 和 `filter` 为什么是同级？  
> `should` 不写行不行？写了会不会影响搜索结果总数？

**它们不是同一层级的「三选一」，而是分工不同、经常嵌套在一起用：**

| 关键字                                | 管什么      | 一句话                             |
| ------------------------------------- | ----------- | ---------------------------------- |
| **bool**                              | 逻辑组合    | 这些条件怎么 AND / OR / NOT        |
| **term / match**                      | 具体条件    | 每个条件查什么值                   |
| **nested**                            | 查询范围    | 多个字段是否属于**同一个**嵌套对象 |
| **must / filter / should / must_not** | bool 的子句 | 必须满足 / 只过滤 / 加分 / 排除    |

上表后四项都写在 **`bool` 里面**，不是和 `bool` 平级的顶层查询类型。

记住一句就够：

> **term 是「查什么值」，bool 是「怎么组合」，nested 是「值之间有没有关联」。**

---

## 本文结构

| 章节                                      | 内容                              |
| ----------------------------------------- | --------------------------------- |
| [一、bool 逻辑组合](#一bool-逻辑组合)     | must / filter / should / must_not |
| [二、term 与 match](#二term-与-match)     | 字段类型 → 查询语法 → 倒排索引 → title.keyword |
| [三、nested 嵌套对象](#三nested-嵌套对象) | 何时必须用，为何 term 组合不够    |
| [四、复杂示例串讲](#四复杂示例串讲)       | 需求列表 + 带编号注释的 DSL       |
| [五、常见疑问 FAQ](#五常见疑问-faq)       | 对话里最容易卡住的几个点          |
| [踩坑清单](#踩坑清单)                     | 生产环境注意项                    |

nested 深层原理（扁平化 vs 子文档）另读：[为什么 nested 不能用 term 组合代替？](/blog/elasticsearch-nested-vs-term)

---

## 一、bool 逻辑组合

`bool` 本身不查具体值，只负责**编排**多个子查询：

```json
{
  "bool": {
    "must":     [ ... ],
    "should":   [ ... ],
    "must_not": [ ... ],
    "filter":   [ ... ],
    "minimum_should_match": 1
  }
}
```

### 1.1 四个子句

| 子句         | 含义         | 是否算分          | 类比                |
| ------------ | ------------ | ----------------- | ------------------- |
| **must**     | 必须全部满足 | ✅ 参与 `_score`  | `AND`（且影响排序） |
| **filter**   | 必须全部满足 | ❌ 不算分，可缓存 | `WHERE`（硬过滤）   |
| **should**   | 满足越多越好 | ✅ 命中加分       | 加分项 / 软 OR      |
| **must_not** | 必须不满足   | ❌ 排除           | `NOT`               |

四个子句的值**都是数组**，每一项是一条子查询；同一子句里写多条 = **全部都要满足**（AND）。

### 1.2 简单例子

「已发布 **且** 标题含 vue **且** 描述含组件，标签有 nuxt 或 react 更好，排除草稿」：

```json
{
  "bool": {
    "filter": [{ "term": { "status": "published" } }],
    "must": [
      { "match": { "title": "vue" } },
      { "match": { "description": "组件" } }
    ],
    "should": [{ "term": { "tags": "nuxt" } }, { "term": { "tags": "react" } }],
    "must_not": [{ "term": { "draft": true } }]
  }
}
```

此例 **should 仅加分**：没命中 nuxt/react 标签也会出现在结果里（未设 `minimum_should_match`，详见 [FAQ Q5](#q5should-只影响分数不影响搜索结果总数吗)）。

**filter 里的条件放 must 行不行？** 行。例如 `{ "term": { "status": "published" } }` 放进 `must`，未发布的文档同样不会出现。差别在于：放 **filter** 不参与算分、可走缓存（硬条件更推荐）；放 **must** 会参与 `_score`，对 term 这类条件通常没有排序意义，还可能让分数变乱。所以「过不过」的放 filter，「搜什么、怎么排序」的放 must。

### 1.3 filter / must / should 怎么分工

```text
filter + must + must_not  →  「能不能出现在结果里」
should                    →  「在能出现的里面，谁排更前」（有时也影响总数，见 FAQ）
```

| 子句         | 典型用途                       |
| ------------ | ------------------------------ |
| **filter**   | 状态、价格区间、权限、库存     |
| **must**     | 搜索框关键词、影响相关性的条件 |
| **should**   | 标签加分、高评分优先（可选）   |
| **must_not** | 排除草稿、黑名单               |

### 1.4 层级关系

```text
query
 └── bool
      ├── filter → term / range / nested …
      ├── must   → match / multi_match …
      ├── should → term / range …
      └── must_not
```

---

## 二、term 与 match

这一层回答：**每个条件查哪个字段、用什么方式查**。

阅读顺序建议：**2.1 字段类型 → 2.2 查询语法 → 2.3 倒排索引 → 2.4 title.keyword（重点）**。

| 查询族           | 是否分词 | 适合字段      | SQL 类比     |
| ---------------- | -------- | ------------- | ------------ |
| **term / terms** | 否       | keyword、数字 | `=` / `IN`   |
| **match 系列**   | 是       | text          | 搜索引擎搜词 |

### 2.1 keyword 与 text：两种字段类型

ES 里最常见的两种字段类型，核心差别：

> **text 会分词，适合搜；keyword 不分词，适合筛、排、聚合。**

| | **keyword** | **text** |
|---|-------------|----------|
| 索引方式 | 整词原样存 | 分词后存（analyzer） |
| 典型用途 | 精确匹配、排序、聚合 | 全文搜索 |
| 常用查询 | `term` / `terms` | `match` / `multi_match` |
| SQL 类比 | `=` / `IN` | 搜索引擎搜词 |

#### 同一段文字，存法不同

你写入的 **_source 原文**（两份 mapping 都一样）：

```json
{ "title": "Vue3 实战教程" }
```

**mapping 为 text** — 索引里存的是**拆开的词**，不是整句：

```text
_source 原文：  "Vue3 实战教程"
倒排索引里：    vue3 | 实战 | 教程        ← 只有这 3 个词，没有整句
```

```json
// match 会先分词 "vue 实战" → vue、实战，再去索引里找 → 命中「实战」→ ✅
{ "match": { "title": "vue 实战" } }

// term 查整句 "Vue3 实战教程"，索引里没有整句 → ❌
{ "term": { "title": "Vue3 实战教程" } }
```

**mapping 为 keyword** — 索引里整句原样存，不分词：

```text
_source 原文：  "Vue3 实战教程"
倒排索引里：    Vue3 实战教程            ← 只有这 1 个词，没有 vue3、实战 等
```

```json
// term 查 "Vue3 实战教程"，和索引里的词完全一致 → ✅
{ "term": { "title": "Vue3 实战教程" } }

// match 会分词 "vue" → vue，索引里没有 vue 这个词 → ❌
{ "match": { "title": "vue" } }
```

#### 各适合什么字段

| 字段 | 推荐类型 | 原因 |
|------|----------|------|
| status、tags、category | keyword | 枚举值，精确筛 |
| userId、订单号 | keyword | 精确匹配 |
| 标题、正文、描述 | text | 分词搜索 |

博文里的 **status**（单值）、**tags**（数组）通常都用 keyword——数组只是「一篇文档多个 keyword 值」，每个元素仍整词进索引。单值 vs 数组对 term 的影响见 [2.3](#23-倒排索引单值-vs-数组)。

### 2.2 term、terms 与 match 系列

```json
{ "term":  { "category": "book" } }
{ "terms": { "category": ["book", "course"] } }
```

| 查询 | 含义 | SQL |
|------|------|-----|
| **term** | 等于 1 个值 | `category = 'book'` |
| **terms** | 等于多个值之一 | `category IN ('book', 'course')` |

`terms` = 把多个 `term` + `should` 合并成一条 `IN` 查询。

全文搜索用 **match 系列**（字段须为 text）：

```json
{ "match": { "title": "vue nuxt" } }

{
  "multi_match": {
    "query": "vue",
    "fields": ["title^3", "description"]
  }
}

{ "match_phrase": { "title": "实战教程" } }
```

| 查询 | 用途 |
|------|------|
| **match** | 单字段搜，默认 OR（有 vue 或有 nuxt 即可） |
| **multi_match** | 多字段一起搜；`^3` 表示该字段权重 ×3 |
| **match_phrase** | 短语必须连续 |

`match` 与 `match_phrase` 对同一标题「Vue3 实战入门教程」：

| 查询 | 输入 | 能否命中 |
|------|------|----------|
| match | `实战 教程` | ✅ 两个词都有即可 |
| match_phrase | `实战教程` | ❌ 中间隔了「入门」 |

---

### 2.3 倒排索引：单值 vs 数组

要理解 `term` 为什么有时像 `=`、有时像「其中一个就行」，得先看 **ES 实际怎么存**。

#### 你写入的文档

```json
// post-1
{ "title": "Vue3 实战", "status": "published", "tags": ["vue", "nuxt"] }

// post-2
{ "title": "React 入门", "status": "published", "tags": ["react"] }

// post-3
{ "title": "草稿一篇",   "status": "draft",     "tags": ["vue", "react"] }
```

| 字段 | 存的内容 | 每篇文档几个值 |
|------|----------|----------------|
| **status** | `"published"` | **1 个** |
| **tags** | `["vue", "nuxt"]` | **多个** |

#### 简化倒排索引

ES 用**倒排索引**记录：「某个词出现在哪些文档里」。

```text
status（keyword，单值）
  published → [ post-1, post-2 ]
  draft     → [ post-3 ]

tags（keyword，数组 → 每个元素单独一条）
  vue       → [ post-1, post-3 ]
  nuxt      → [ post-1 ]
  react     → [ post-2, post-3 ]
```

#### term 实际在干什么

`term` 只做一件事：**去倒排索引里查——包含这个词的文档列表里，有没有这篇文档？**

```json
{ "term": { "status": "published" } }
{ "term": { "tags": "vue" } }
```

| 查询 | post-1 | 为何 |
|------|--------|------|
| `term status=published` | ✅ | status 只有 1 个词：`published` |
| `term tags=vue` | ✅ | tags 里有 `vue`（还有 `nuxt`） |
| `term tags=react` | ❌ | tags 里没有 `react` |

**写法完全一样；语义差异来自字段是单值还是数组**（见 [FAQ Q6](#q6term-写法一样为什么-status-像-tags-像有一个就行)）。

tags 要**同时**有 vue 和 nuxt → 两个 term 放 `bool.must`（两次查询取交集）：

```json
{
  "bool": {
    "must": [
      { "term": { "tags": "vue" } },
      { "term": { "tags": "nuxt" } }
    ]
  }
}
```

---

### 2.4 ⭐ title 与 title.keyword 怎么选（生产最常用）

标题往往**两个需求都要**：搜索框能搜关键词，又要能整句精确匹配、排序、统计。  
做法：**同一份 title，mapping 里配 text + keyword 子字段**，查询时**选对字段名**。

**用法速查（建议直接记这张表）：**

| 你想干什么 | 用哪个字段 | 用什么查询 | 示例 |
|------------|------------|------------|------|
| 搜关键词（vue、实战） | **`title`** | `match` | `{ "match": { "title": "vue" } }` |
| 整句必须完全一致 | **`title.keyword`** | `term` | `{ "term": { "title.keyword": "Vue3 实战教程" } }` |
| 按标题字母序排序 | **`title.keyword`** | `sort` | `"sort": [{ "title.keyword": "asc" }]` |
| 按标题分组计数 | **`title.keyword`** | `aggs` | `"terms": { "field": "title.keyword" }` |

```text
记法：要「搜」→ title + match；要「整句 / 排序 / 统计」→ title.keyword + term/sort/aggs
```

mapping 长这样：

```json
{
  "title": {
    "type": "text",
    "fields": {
      "keyword": { "type": "keyword" }
    }
  }
}
```

你写入的 **_source 还是一条**：

```json
{ "title": "Vue3 实战教程" }
```

ES 会按**两个字段名**各建一份倒排索引（同一句标题，存了两遍，方式不同）：

```text
字段 title（text，拆词存）
  ES 里实际有的词：vue3、实战、教程
  （整句「Vue3 实战教程」并不存在）

字段 title.keyword（keyword，整句存）
  ES 里实际有的词：Vue3 实战教程
  （没有 vue3、实战、教程 这些小块）
```

**正确用法：**

```json
// 搜「vue」→ 查 title → ES 里有 vue3、实战、教程 → 能匹配到 → ✅
{ "match": { "title": "vue" } }

// 整句相等 → 查 title.keyword → ES 里有「Vue3 实战教程」→ 完全一致 → ✅
{ "term": { "title.keyword": "Vue3 实战教程" } }
```

**错配用法（字段和查询对不上）：**

```json
// 你想整句匹配「Vue3 实战教程」，却查了 title
// title 里只有 vue3、实战、教程，没有整句 → ❌
{ "term": { "title": "Vue3 实战教程" } }

// 你想搜关键词「vue」，却查了 title.keyword
// title.keyword 里只有整句，没有单独的 vue → ❌
{ "match": { "title.keyword": "vue" } }
```

用白话总结错配原因：

| 错在哪 | 你查的内容 | 那个字段里实际有什么 |
|--------|------------|----------------------|
| term 查了 `title` | 整句「Vue3 实战教程」 | 只有 vue3、实战、教程（拆开的词） |
| match 查了 `title.keyword` | 关键词「vue」 | 只有整句「Vue3 实战教程」 |

排序、聚合示例（都要 `.keyword`）：

```json
"sort": [{ "title.keyword": "asc" }],

"aggs": {
  "titles": { "terms": { "field": "title.keyword" } }
}
```

**一句话**：`_source` 一条标题，ES 里两个字段名——**`title` 拆词用来搜，`title.keyword` 整句用来比相等 / 排序 / 统计**；写查询时先想「搜还是整句」，再选字段名。

### 2.5 查询类型速查

| 查询 | 分词 | 典型字段 | 用什么场景 |
|------|------|----------|------------|
| term | 否 | keyword | 精确等于 1 个值 |
| terms | 否 | keyword | 精确等于多个值之一（IN） |
| match | 是 | text | 单字段搜关键词 |
| multi_match | 是 | 多个 text | 标题+描述一起搜 |
| match_phrase | 是 | text | 短语必须连续 |
| range | 否 | 数字、日期 | 区间过滤 |

**配对口诀**：keyword 配 term/terms，text 配 match；排序/聚合/整句精确 → `字段.keyword`（见 2.4）。

---

## 三、nested 嵌套对象

对象数组若用普通 `object`，ES 会**拍扁**存储，数组内字段的归属关系丢失：

```json
{
  "user": [
    { "first": "Alice", "last": "White" },
    { "first": "John", "last": "Smith" }
  ]
}
```

```text
user.first: [Alice, John]
user.last:  [White, Smith]    ← Alice 和 Smith 可能误配
```

两个 `term` 放 `bool.must` 会产生**跨对象错误匹配**。  
`nested` 把每个数组元素存成独立子文档，查询时限定在**同一子文档内**：

```json
{
  "nested": {
    "path": "user",
    "query": {
      "bool": {
        "must": [
          { "term": { "user.first": "Alice" } },
          { "term": { "user.last": "Smith" } }
        ]
      }
    }
  }
}
```

**何时必须用 nested**：对象数组 + 数组内多字段联合条件 + 归属关系重要（SKU、订单明细等）。  
只对数组内**单个字段**过滤，普通 `object` + `term` 通常够用。

别和 [2.3 的 tags 数组](#23-倒排索引单值-vs-数组) 搞混：tags 用 term 查「有没有这个标签」就够，因为每个标签只是单个字符串。nested 解决的是 **对象数组里多个字段必须属于同一条子对象**（如 SKU 的 color + size + stock 必须来自同一 SKU）。

---

## 四、复杂示例串讲

电商商品搜索：**先列需求，再看 DSL**；JSON 里用 `#1` `#2` … 注释对应上表。

**需求**

| # | 需求 |
|---|------|
| 1 | 已发布、非草稿 |
| 2 | 标题/描述含 vue 或 nuxt，标题权重更高 |
| 3 | 价格 50～150 |
| 4 | 同一 SKU：color=blue、size=L、有库存 |
| 5 | 同一促销：type=discount 且在有效期内 |
| 6 | 品牌名以 Tech 开头，且有 rating 字段 |
| 7-1 | tags 含 **frontend** → 加分 |
| 7-2 | tags 含 **typescript** → 加分 |
| 7-3 | 标题含短语 **实战教程** → 加分 |
| 7-4 | **rating ≥ 4.5** → 加分 |
| 7-5 | **category** 为 book 或 course → 加分 |
| 8 | 7-1～7-5 **至少命中 1 个**（`minimum_should_match`） |
| — | 排除 tags=legacy；按相关度→评分→价格排序，取 10 条 |

#7 拆成 7-1～7-5，是为把 should 里**每一条**和需求对上；`frontend`、`typescript` 等具体 tag **只是演示取值**，业务里换成你们自己的标签名即可，不必照抄。

> `skus`、`promotions` 须 mapping 为 **nested**；`status`、`tags` 等为 **keyword**；`title`、`description` 为 **text**。

**DSL**

```json
GET /products/_search
{
  "query": {
    "bool": {
      "filter": [
        { "term": { "status": "published" } },           // #1
        { "term": { "draft": false } },                  // #1
        { "range": { "price": { "gte": 50, "lte": 150 } } },  // #3
        {
          "nested": {                                    // #4
            "path": "skus",
            "query": {
              "bool": {
                "filter": [
                  { "term": { "skus.color": "blue" } },
                  { "term": { "skus.size": "L" } },
                  { "range": { "skus.stock": { "gt": 0 } } }
                ]
              }
            }
          }
        },
        {
          "nested": {                                    // #5
            "path": "promotions",
            "query": {
              "bool": {
                "filter": [
                  { "term": { "promotions.type": "discount" } },
                  { "range": { "promotions.start": { "lte": "now/d" } } },
                  { "range": { "promotions.end": { "gte": "now/d" } } }
                ]
              }
            }
          }
        },
        { "prefix": { "brand.name": "Tech" } },          // #6
        { "exists": { "field": "rating" } }               // #6
      ],
      "must": [
        {
          "multi_match": {                               // #2
            "query": "vue nuxt",
            "fields": ["title^3", "description"],
            "type": "best_fields",
            "operator": "or"
          }
        }
      ],
      "should": [
        { "term": { "tags": "frontend" } },              // #7-1
        { "term": { "tags": "typescript" } },            // #7-2
        { "match_phrase": { "title": { "query": "实战教程", "boost": 2 } } },  // #7-3
        { "range": { "rating": { "gte": 4.5, "boost": 1.5 } } },               // #7-4
        { "terms": { "category": ["book", "course"], "boost": 1.2 } }          // #7-5
      ],
      "must_not": [
        { "term": { "tags": "legacy" } }                 // 排除
      ],
      "minimum_should_match": 1                          // #8
    }
  },
  "sort": [                                              // 排序
    { "_score": { "order": "desc" } },
    { "rating": { "order": "desc" } },
    { "price": { "order": "asc" } }
  ],
  "size": 10
}
```

不需要 #7、#8 时，删掉整个 `should` 和 `minimum_should_match` 即可（见 [FAQ Q4](#q4should-要不要写)）。生产里 #7 往往只保留 1～2 条 should，不必写满 5 条。

---

## 五、常见疑问 FAQ

### Q1：must 为什么不能写进 filter 里？

**语法上不行**——`filter` 的值是查询数组，不能直接嵌 `must` 关键字：

```json
// ❌
{ "bool": { "filter": { "must": [ ... ] } } }
```

**逻辑上可以嵌套 bool**，但语义变了：

```json
// ✅ 合法，但内部条件不参与算分
{
  "bool": {
    "filter": [
      {
        "bool": {
          "must": [
            { "term": { "status": "published" } },
            { "range": { "price": { "gte": 50 } } }
          ]
        }
      }
    ]
  }
}
```

|                | bool.must | 嵌在 filter 里的 bool |
| -------------- | --------- | --------------------- |
| 必须满足       | ✅        | ✅                    |
| 参与 `_score`  | ✅        | ❌                    |
| 走 filter 缓存 | ❌        | ✅                    |

简单记：**要影响排序 → must / should；只要过不过 → filter。**

---

### Q2：must 里可以写多条吗？

**可以。** must / filter / should / must_not 都是数组，多条 = 全部满足（AND）。

```json
"must": [
  { "match": { "title": "vue" } },
  { "match": { "description": "组件" } }
]
```

→ 标题含 vue **且** 描述含组件。

---

### Q3：为什么 must 里用 multi_match，不用两个 match？

两个 match 放 must = **标题 AND 描述都要匹配**，比「标题或描述有一个就行」更严。

需求是搜 title **或** description → 用 **multi_match 一次搜多字段**。

放 must 而非 filter：匹配程度影响分数，标题命中排更前。

---

### Q4：should 要不要写？

**不需要加分就不写。**

| 需求                     | 写法                     |
| ------------------------ | ------------------------ |
| 硬筛选 + 按价格/日期排序 | filter + sort，无 should |
| 搜索词 + 按相关性排序    | filter + must，无 should |
| 还要「更好的排前面」     | 加 should                |

---

### Q5：should 只影响分数，不影响搜索结果总数吗？

**不完全是——这是最容易误解的点。**

| 场景                                          | should 影响总数？        | should 影响分数？ |
| --------------------------------------------- | ------------------------ | ----------------- |
| 有 must/filter，**无** `minimum_should_match` | ❌ 不影响                | ✅ 影响           |
| 有 must/filter，且 `minimum_should_match: 1`  | ✅ **影响**              | ✅ 影响           |
| **只有** should，无 must/filter               | ✅ 影响（默认至少 1 条） | ✅ 影响           |

**默认情况**（有 must/filter、没设 minimum_should_match）：

```json
{
  "bool": {
    "filter": [{ "term": { "status": "published" } }],
    "must": [{ "match": { "title": "vue" } }],
    "should": [{ "term": { "tags": "frontend" } }]
  }
}
```

- should 命中 → 分数更高
- should 不命中 → **照样出现在结果里**，总数不变

**复杂示例的情况**（设了 `minimum_should_match: 1`）：

- should 一条都没中 → **不进结果**，总数会变少

```text
有 must/filter + 无 minimum_should_match  →  should 纯加分
有 minimum_should_match                   →  should 也当门槛
只有 should                               →  should 决定谁能出现
```

---

### Q6：term 写法一样，为什么 status 像 `=`、tags 像「有一个就行」？

**不是 term 规则不同，是你存的数据结构不同。**

| 字段   | 文档里           | 倒排索引里（每篇） | term 效果          |
| ------ | ---------------- | ------------------ | ------------------ |
| status | `"published"`    | 1 个词             | 像 `=`             |
| tags   | `["vue","nuxt"]` | 多个词             | 像「有没有这一项」 |

用法完全相同：`{ "term": { "字段": "值" } }`。

---

## 踩坑清单

1. **text 用 match，keyword 用 term** — 类型和查询要配对。
2. **对象数组多字段联合条件** — 必须 nested，见 [专题文](/blog/elasticsearch-nested-vs-term)。
3. **硬条件放 filter** — 不算分、通常更快。
4. **should 默认只加分** — 除非设了 `minimum_should_match`。
5. **wildcard 慎用** — 大数据量很慢。

---

## 一句话总结

```text
bool       → 逻辑组合（must / filter / should / must_not）
term/match → 查什么值（看字段类型 + 倒排索引）
nested     → 多字段是否同一嵌套对象
filter     → 过不过，不计分
must       → 必须满足，计分
should     → 默认只加分；设 minimum_should_match 时也筛数量
```

---

## 延伸阅读

- [为什么 nested 不能用 term 组合代替？](/blog/elasticsearch-nested-vs-term)
- [Elasticsearch bool query](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-bool-query.html)
- [Nested query](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-nested-query.html)
