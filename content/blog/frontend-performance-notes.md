---
title: 前端性能优化笔记（Nuxt 场景）
description: 记录静态博客中最容易落地的性能优化动作。
date: 2026-03-03
tags:
  - 前端
  - 性能
  - Nuxt
---

对于内容站，性能优化优先级一般是：

1. 图片体积
2. 首屏脚本体积
3. 第三方脚本数量

```ts
// 示例：将非关键脚本延后加载
if (process.client) {
  requestIdleCallback(() => {
    console.log('load non-critical scripts')
  })
}
```

我会优先减少图片和字体体积，这两点通常最见效。
