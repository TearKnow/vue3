# 划词批注功能设计

**日期**: 2026-07-09 | **状态**: 已实现

## 概述

在 blog / wiki 阅读页支持划词批注：选中文字添加评论，正文高亮显示；PC 悬停查看，移动端点击弹框。数据存于 `data/annotations/annotations.json`，经 GitHub API 同步。

## 交互

- 选中正文 →「添加批注」→ 填写内容保存
- 高亮背景色：`--blog-annotation-bg`（`#EA9999`）
- PC：鼠标悬停高亮文字显示浮层
- 移动：点击高亮打开弹框
- 原文变更导致无法精确匹配时，该批注不显示
- 异步加载：正文进入视口后再请求批注数据

## 锚定规则

保存 `quote`（选中文字）+ `prefix` / `suffix`（前后各 32 字）。加载时用 `prefix + quote + suffix` 在正文纯文本中做唯一匹配；匹配不到或不唯一则隐藏。

## 数据模型

```json
{
  "annotations": [
    {
      "id": "ann_xxx",
      "pageKey": "wiki:algorithm/start",
      "quote": "动态规划",
      "prefix": "第三阶段：",
      "suffix": "图论（BFS",
      "comment": "还没学懂",
      "createdAt": "2026-07-09"
    }
  ]
}
```

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/annotations?pageKey=` | 获取某页批注列表 |
| POST | `/api/annotations/save` | 新增批注 |
| POST | `/api/annotations/delete` | 删除批注 |

读写均无需密码；换设备、他人可见（公开读取）。
