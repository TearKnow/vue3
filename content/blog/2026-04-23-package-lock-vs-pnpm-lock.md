---
title: "npm 项目与 pnpm 项目该保留哪个锁文件？"
description: "记录一次依赖管理小坑：为什么项目能跑但编辑器飘红，以及最后怎么把包管理方式收敛到 pnpm。"
date: 2026-04-23
tags:
  - 工程化
  - npm
  - pnpm
draft: false
pinned: false
---

先把这次的结论写前面，免得绕：

- 用 npm，就保留 `package-lock.json`
- 用 pnpm，就保留 `pnpm-lock.yaml`
- 不要混着来

这不是说 `package-lock.json` 不好。  
它在 npm 项目里本来就是对的。  
同理，`pnpm-lock.yaml` 在 pnpm 项目里也是对的。

问题出在“同一个项目混两套习惯”。

## 现象

- `import { createInjectionState } from '@vueuse/core'` 在编辑器里飘红
- 但项目 dev / build 都能过

一开始挺迷惑：都能跑，为什么还红？

后来确认是这个情况：

- `@vueuse/core` 当时是间接依赖（被别的包带进来）
- 运行时能解析到，所以能跑
- 但 TS/IDE 更偏向你“是否显式声明”这个依赖，所以给红线提示

说白了就是：  
**运行时能找到，不代表编辑器就认你这写法“规范”。**

## 处理方式

主要做了这几件事：

1. 明确这个项目只用 pnpm
2. 显式安装 `@vueuse/core`
3. 把 `vue` / `vue-router` 从 `latest` 改成固定版本
4. 只保留 `pnpm-lock.yaml`

做完之后，编辑器红线和实际运行结果就一致了，后面也更稳。
