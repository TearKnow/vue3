---
title: "Vue provide/inject 与最近祖先取值"
description: 结合 createInjectionState demo，解释 provide、inject、key 和“最近祖先取值”规则。
date: 2026-04-16
tags:
  - Vue
  - 组合式API
  - 前端
draft: false
pinned: false
---

在 Vue 里，`provide` / `inject` 是一套“跨层级传值”机制，常用来避免 props 一层层透传。

本文结合一个 demo 来说明这几个核心问题：

- `provide` 和 `inject` 分别是什么意思
- “从最近的祖先取值”到底是什么意思
- `provide 了对应 key` 里的 key 是什么
- 为什么同一个公共组件不会在不同区域“串状态”

## Demo 链接

> 在线 Demo（新窗口打开）：  
> <a href="/tech/injectionScope" target="_blank" rel="noopener noreferrer">查看 provide/inject 作用域示例</a>

## 1. provide 和 inject 是什么

可以先把它们理解成一组“提供-领取”动作：

- `provide`：祖先组件把一份值放进上下文，供后代使用
- `inject`：后代组件按 key 去取这份值

它们的价值是：当组件层级比较深时，不需要把同一份数据通过 props 一层层往下传。

## 2. 什么叫“从最近的祖先取值”

后代组件执行 `inject` 时，Vue 会沿组件树向上查找：

1. 先看父组件有没有 `provide` 对应 key
2. 没有就继续看父的父
3. 一直往上，直到找到为止
4. 找到第一个就停止

这个“第一个找到的祖先”就是“最近的祖先”。

所以 `inject` 的本质是“就近匹配”，不是“全局唯一”。

## 3. demo 中的 key 是什么

在这个 demo 里，你没有手写字符串 key，而是用了 `@vueuse/core` 的 `createInjectionState`：

```ts
export const [provideScopedCounter, useScopedCounterStore] =
  createInjectionState(useScopedCounter)
```

这里的 key 由 `createInjectionState` 在内部生成并管理（通常是唯一的 `Symbol`）。

- `provideScopedCounter(...)` 用这个 key 执行 provide
- `useScopedCounterStore()` 用同一个 key 执行 inject

因为 key 是同一个，所以才能准确拿到对应的 store。

## 4. 为什么不会串

假设页面里有两个并列区域，每个区域外面各套了一个 `ScopeProvider`：

- 区域 A：`ScopeProvider(mode="product-detail")`
- 区域 B：`ScopeProvider(mode="quick-purchase")`

这时每个区域内的 `SharedPanel` 都会向上找到“各自最近”的 `ScopeProvider`，因此两边互不影响，不会串状态。

但要注意：

- 同一个 `ScopeProvider` 下的多个 `SharedPanel`，会共享同一份 store（会联动）
- 不同 `ScopeProvider` 之间，store 相互隔离（不联动）

## 5. 嵌套 Provider 的情况

如果出现嵌套结构：

```text
ScopeProvider(Outer)
├─ SharedPanel-A
└─ ScopeProvider(Inner)
   └─ SharedPanel-B
```

结果是：

- `SharedPanel-A` 读取 `Outer`
- `SharedPanel-B` 读取 `Inner`（因为 Inner 离它更近）

这就是“内层覆盖外层、就近生效”。

## 6. 在这个 demo 中，provide/inject 分别在哪执行

分开看会更清楚：

- 定义来源：`useScopedCounter.ts`
  - 由 `createInjectionState(useScopedCounter)` 生成并导出 `provideScopedCounter` 和 `useScopedCounterStore`
- provide 实际执行：`ScopeProvider.vue`
  - 在组件 setup 中调用 `provideScopedCounter(props.initial, props.mode)`
- inject 实际执行：`SharedPanel.vue`
  - 在组件 setup 中调用 `useScopedCounterStore()` 读取 store

所以可以记成一句话：**函数在 `useScopedCounter.ts` 中定义，provide 在 `ScopeProvider.vue` 执行，inject 在 `SharedPanel.vue` 执行。**

