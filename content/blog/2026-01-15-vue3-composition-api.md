---
title: Vue 3 组合式 API 随手记
description: 记录 `ref`、`computed` 与可复用逻辑的几种写法。
date: 2026-01-15
tags:
  - Vue
  - 前端
---

组合式 API 适合把相关逻辑收拢到同一块作用域里，而不是按选项类型拆散。

```ts
const count = ref(0)
const doubled = computed(() => count.value * 2)
```

同一篇文章可以同时打多个标签，列表页会按 **标签** 与 **月份** 聚合。
