---
title: "Vue 3 自定义 Hooks（Composables）用法入门"
description: "把组件里的逻辑拆成可复用的 useXxx 函数：从 useSum、useDog 两个例子理解 ref/reactive、异步请求与 onMounted，并知道在页面里怎么组合使用。"
date: 2026-05-23
tags:
  - Vue
draft: false
pinned: false
---

## 一分钟先看结论（新手速读）

- Vue 官方叫 **Composables**，社区也常叫 **自定义 Hooks**，本质一样：一个以 `use` 开头的函数，内部用 Composition API，最后 `return` 状态和方法。
- 抽出来的目的：**复用逻辑**、**让页面组件更薄**、**按业务拆分文件**。
- 典型结构：`const xxx = ref(...)` + 若干方法 + `return { xxx, method }`。
- 页面里：`const { sum, addOne } = useSum()`，像用普通函数一样解构即可。
- 每次调用 `useXxx()` 都会得到**独立的一份状态**（不同组件互不影响）。
- 需要副作用（如进页面就请求）时，在 composable 里写 `onMounted` 等生命周期即可。

## Demo 链接

> 在线 Demo（新窗口打开）：  
> <a href="/tech/009hooks" target="_blank" rel="noopener noreferrer">查看 Hooks 组合示例</a>

对应源码：`pages/tech/009hooks.vue`，以及 `pages/tech/hooks/useSum.ts`、`pages/tech/hooks/useDog.ts`。

## 1. 它到底是什么

在 `<script setup>` 里，我们本来会把 `ref`、`reactive`、`watch`、`onMounted` 等全写在同一个文件里。当逻辑变多，或两块毫无关系的逻辑挤在一起时，页面会很难读。

**自定义 Hook** 就是把其中一块逻辑挪到单独文件里，写成一个函数，例如 `useSum()`、`useDog()`：

```ts
// 伪代码结构
export default function useSomething() {
  // 1. 响应式状态
  // 2. 改状态的方法 / 请求 / 副作用
  // 3. 暴露给外部
  return { state, doSomething }
}
```

页面组件只负责「组装」和「展示」：

```vue
<script lang="ts" setup>
import useDog from './hooks/useDog'
import useSum from './hooks/useSum'

const { sum, addOne } = useSum()
const { dogList, getDog } = useDog()
</script>
```

这和 React 里 `useState` + 自定义 hook 的思路很像，但 Vue 没有「Hook 规则」里那些调用顺序限制，只要在 `setup`（或另一个 composable）里**同步调用**即可。

## 2. 示例一：useSum —— 最简计数逻辑

`useSum` 只关心一个数字和「加一」按钮，适合理解最小 composable：

```ts
import { ref } from 'vue'

export default function useSum() {
  const sum = ref(0)

  function addOne() {
    sum.value++
  }

  return {
    sum,
    addOne,
  }
}
```

要点：

- 用 `ref` 包基本类型，模板里会自动解包，写成 `{{ sum }}` 即可。
- 在函数里改值要写 `sum.value++`。
- `return` 的对象键名，就是页面里解构用的名字。

模板侧：

```vue
<template>
  {{ sum }}
  <button @click="addOne">点我加一</button>
</template>
```

## 3. 示例二：useDog —— 列表、异步与生命周期

`useDog` 稍复杂一点：维护一个图片 URL 列表、点击再拉一张、并在挂载时先拉一张：

```ts
import { reactive, onMounted } from 'vue'

export default function useDog() {
  const dogList = reactive<string[]>([])

  async function getDog() {
    const data = await $fetch<{ message: string }>(
      'https://dog.ceo/api/breeds/image/random',
    )
    dogList.push(data.message)
  }

  onMounted(() => {
    getDog()
  })

  return {
    dogList,
    getDog,
  }
}
```

要点：

- 数组、对象这类「改内部字段」的场景，用 `reactive` 很顺手，`dogList.push(...)` 即可触发更新。
- 异步请求可以放在 composable 里，对外只暴露 `getDog`，页面不用关心 URL 和解析。
- `onMounted` 写在 composable 内部时，**注册的是「调用它的那个组件」** 的挂载时机，行为和在组件里直接写 `onMounted` 一致。
- 本仓库是 Nuxt，`$fetch` 可直接使用；若在纯 Vue 项目里可换成 `fetch` 或 axios。

模板侧：

```vue
<template>
  <img
    v-for="(dog, index) in dogList"
    :key="index"
    :src="dog"
  >
  <button @click="getDog">来一只小狗</button>
</template>
```

## 4. 页面如何组合多个 Hook

`009hooks.vue` 把两块逻辑拆开，页面只做拼装：

```vue
<script lang="ts" setup>
import useDog from './hooks/useDog'
import useSum from './hooks/useSum'

const { sum, addOne } = useSum()
const { dogList, getDog } = useDog()
</script>
```

好处一目了然：

- 看页面文件：立刻知道「这个页用了计数 + 小狗图」两块能力。
- 看 `useSum` / `useDog`：各自只维护自己的状态，互不掺杂。
- 以后别的页面也要「随机小狗图」，复制 `import useDog` 即可，不必再抄一遍请求代码。

## 5. 命名与文件组织建议

| 约定 | 说明 |
|------|------|
| 函数名以 `use` 开头 | 如 `useSum`、`useDog`，一眼看出是 composable |
| 文件名与函数对应 | `useSum.ts` 导出 `useSum`，便于搜索 |
| 目录 | 可放在 `hooks/`、`composables/`（Nuxt 会自动导入 `composables/` 下的文件） |
| 返回值 | 优先 `return` 一个对象，方便按需解构、扩展字段 |

本 demo 放在 `pages/tech/hooks/`，与页面同级，方便学习时对照；业务项目里更常见的是根目录 `composables/useXxx.ts`。

## 6. 常见注意点

**每次调用都是新状态**

```ts
const a = useSum()
const b = useSum()
// a.sum 与 b.sum 互不影响
```

**在 `setup` 里调用**

不要在普通事件回调、异步回调里「第一次」调用 `useXxx()`，否则内部的 `onMounted` 等可能拿不到正确的组件实例。习惯在 `<script setup>` 顶层写：

```ts
const { sum, addOne } = useSum()
```

**解构会丢响应式吗**

从 `return` 解构出来的 `ref`，在模板里仍保持响应式；若要在 `<script>` 里持续用某个 ref 的 `.value`，解构后仍是 ref，用法不变。

**和 provide/inject 的分工**

- Composable：同一份逻辑在**多个组件各自持有一份状态**（或你显式共享）。
- provide/inject：在**一棵组件树里共享同一份状态**。

需要「全局一份」时，可以再结合 `provide` 或 Pinia；入门阶段先把「单组件逻辑外提」练熟即可。

## 7. 什么时候值得抽成 Hook

适合抽：

- 同一段逻辑会在 2 个以上页面出现
- 单个组件 `setup` 超过一两屏，且能按业务切成几块
- 一块逻辑包含多个 `ref` / 请求 / 生命周期，想单独测试或阅读

不必强行抽：

- 只用一次、且只有两三行的逻辑
- 抽完反而要多跳好几个文件才能看懂

## 8. 记忆口诀

> 逻辑封装 use 开头；状态方法一起 return；  
> 页面顶层来调用；ref 改值记得点 value；  
> 列表对象用 reactive；挂载请求写 onMounted。

