---
title: Cursor / VS Code 搜不到 .gitignore 里的目录？用工作区设置放开搜索
description: vendor 等目录被 gitignore 后，Ctrl+P 和全文搜索默认都找不到；不改 .gitignore，只在本地 .vscode/settings.json 关闭 ignore 过滤，并继续排除噪音目录。
date: 2026-08-12
tags: [VS Code, Cursor, Git]
---

## 现象

PHP / Composer 项目里常见：`vendor` 写在 `.gitignore` 里（依赖不应提交）。

Cursor / VS Code **默认遵守 ignore 文件**，于是：

- `Ctrl + P`（按文件名跳转）找不到 `vendor` 里的文件
- `Ctrl + Shift + F`（按内容搜索）也搜不到里面的代码

这不是索引坏了，而是编辑器主动把被 ignore 的路径从搜索结果里过滤掉了。

## 目标

- **不改** `.gitignore`（仓库规则保持干净）
- 只在**本机工作区**放开搜索，让 `vendor` 可搜
- 仍排除 `node_modules`、`var` 等噪音目录，避免搜到一堆无关文件

## 做法：本地 `.vscode/settings.json`

在项目根建（或改）工作区配置，例如：

`d:\www\你的项目\.vscode\settings.json`

核心思路：

1. 关掉「按 ignore 文件过滤搜索」
2. 用 `search.exclude` 自己列要排除的目录——**不要把 `vendor` 写进去**

```json
{
  "search.useIgnoreFiles": false,
  "search.useGlobalIgnoreFiles": false,
  "search.useParentIgnoreFiles": false,
  "search.exclude": {
    "**/node_modules": true,
    "**/var": true,
    "**/public/*/css": true,
    "**/public/*/js": true,
    "**/public.cdn": true,
    "**/.git": true,
    "**/.history": true
  }
}
```

三项 `use*IgnoreFiles` 设为 `false` 后，搜索不再跟着 `.gitignore` / 全局 ignore / 父目录 ignore 走；排除名单完全由 `search.exclude`（以及你在搜索面板里手填的排除）决定。

### 为什么通常不用担心会提交

很多仓库会把 `.vscode/` 写进 `.gitignore`，这类本地偏好本来就不会进版本库。即使没 ignore，也可以只改本机、不提交；别把「放开 vendor 搜索」当成团队默认，除非大家都需要。

## 改完之后

1. **Reload Window**（命令面板搜 `Reload Window`），让工作区设置生效。
2. 再试 `Ctrl + P` / `Ctrl + Shift + F`，应能进到 `vendor`。

### 全文搜索仍没有结果时

打开搜索面板，检查：

- **files to exclude** 里是否手动写了 `vendor`
- 是否勾着「使用排除设置和忽略文件」（Use Exclude Settings and Ignore Files）——临时关掉对比一下

有时工作区已经放开了，但面板上的排除或「使用忽略」仍会把结果滤掉。

## 小结

| 项目 | 说明 |
|------|------|
| 原因 | 编辑器默认按 gitignore 等忽略搜索 |
| 不要做 | 为了能搜而把 `vendor` 从 `.gitignore` 删掉 |
| 推荐 | 工作区关掉 `search.useIgnoreFiles` 等三项，用 `search.exclude` 自己控噪音 |
| 生效 | Reload Window；必要时检查搜索面板排除项 |

一句话：**ignore 管提交，工作区搜索设置管「我本机能不能搜到」。** 两者分开，最省事。
