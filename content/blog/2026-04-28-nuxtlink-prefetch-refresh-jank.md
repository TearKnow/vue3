---
title: "Nuxt 博客首页刷新为什么会抖一下？"
description: "记录一次 Vercel 线上刷新抖动排查：从 NuxtLink 预取一路查到详情页 showToast 引入 Vant 全局 reset。"
date: 2026-04-28
tags:
  - Nuxt
  - Vue
  - Vercel
draft: false
pinned: false
---

先说结论：这次不是一个问题，而是两个问题叠在一起。

第一个问题：博客首页首屏有很多 `NuxtLink`，默认预取会提前拉一批页面资源，线上刷新时更容易看到短暂抖动。这个用 `no-prefetch` 可以处理。

```vue
<NuxtLink
  :to="post.urlPath || '#'"
  no-prefetch
>
  {{ post.title }}
</NuxtLink>
```

第二个问题：详情页用了 Vant 的 `showToast`。进入详情页后，Vant 的全局 reset CSS 会被加载进来；回到首页时这份 CSS 不会卸载，所以首页样式和“直接刷新进入首页”时不一样。这个临时处理是先注释掉详情页复制成功/失败时的 `showToast`。

## 现象

本地 `pnpm dev` 看起来没问题。  
但部署到 Vercel 后，直接刷新博客首页，会看到页面布局短暂跳动一下。

一开始看到的现象有两类：

**现象 1：刷新首页会抖一下**

- 本地不明显
- Vercel 上刷新 `/blog` 更容易看到
- 关掉文章列表后就不抖

**现象 2：详情页返回首页后，首页样式和刷新进入时不一样**

- 从 `/blog` 点进详情页
- 在详情页点“全部文章”返回
- 左侧标签栏的 `li` 高度从大约 34px 变成 30px

一开始很容易怀疑是 SSR 和客户端水合不一致。

## 问题一：NuxtLink 预取影响首页刷新

先从最容易造成水合差异的地方排：

1. 关掉日签，因为它依赖日期。
2. 关掉日历，因为它也依赖当前日期。
3. 关掉左侧标签和归档侧栏。
4. 关掉文章列表。

结果发现：  
**文章列表一关，刷新就不抖了。**

于是继续缩小范围：

- 换成纯文本标题列表：不抖
- 换回卡片组件：会抖
- 不用组件，直接在页面里写同样的卡片 DOM：还会抖
- 去掉卡片外框、阴影、padding：还是会抖
- 把标题里的 `NuxtLink` 换成普通 `span`：不抖
- 把 `span` 换成普通 `<a>`：不抖
- 换回 `NuxtLink`，但加 `no-prefetch`：不抖

这说明第一类抖动和 `NuxtLink` 有关系。

`NuxtLink` 默认会为页面跳转做优化。  
当链接进入视口附近时，Nuxt 可能提前预取目标页面需要的资源，这样用户点击时会更快。

这本来是好事。

但博客首页有一个特点：首屏一下子出现很多文章链接、标签链接、归档链接。  
页面刚刷新时，这些链接同时进入视口，预取逻辑也会跟着启动。

在本地开发环境里，资源都在本机，加载很快，不一定看得出来。  
到了 Vercel 线上，网络、缓存、资源 chunk 加载顺序都更真实，页面首屏渲染后又触发一批预取请求，就可能造成短暂的布局变化或视觉抖动。

所以这个问题不是“NuxtLink 不能用”，而是：

**首屏批量链接不一定都适合默认预取。**

所以第一步处理是：给博客列表页这种首屏批量出现的链接加 `no-prefetch`。

## 问题二：Vant reset 让返回后的首页变样

`no-prefetch` 处理完后，又发现第二类问题还在：  
刷新进入首页和“详情页返回首页”不是同一个样式状态。

固定复现路径是：

1. 刷新进入 `/blog`
2. 点击一篇文章进入详情页
3. 在详情页点击“全部文章”返回
4. 首页左侧标签栏高度和刚刷新进入时不一样

继续查资源差异，发现详情页里复制代码按钮用了 Vant 的 `showToast`：

```ts
await navigator.clipboard.writeText(codeEl.textContent ?? '')
showToast('已复制')
```

项目里配置了 `@vant/nuxt`：

```ts
modules: ['@vant/nuxt', '@nuxt/content']
```

所以 `showToast` 会被自动导入。详情页用到它以后，构建出来的详情页资源里就会包含 Vant Toast 相关 CSS。

Vant 的样式里有一些全局 reset，大概像这样：

```css
body {
  font-family: var(--van-base-font);
  margin: 0;
}

a {
  text-decoration: none;
}

ol,
ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
```

这些 CSS 一旦在 SPA 会话里加载进来，返回首页时不会自动卸载。  
于是就出现了两个状态：

- 直接刷新进入首页：还没加载 Vant reset
- 从详情页返回首页：已经加载过 Vant reset

左侧标签链接本身没有写死 `line-height`，所以当 `body` 字体从浏览器默认字体变成 Vant 的 `--van-base-font` 后，行盒高度跟着变了。  
这就是为什么同一个标签，刷新时看着是 34px，返回后变成 30px。

## 最后怎么改

对应两个问题，处理方式也分两步。

第一步，先避免首屏批量链接预取，把列表页、标签、归档、分页这些链接加上 `no-prefetch`：

对博客首页这种列表页，我只给首屏批量出现的链接关掉预取：

- 文章标题链接
- 文章标签链接
- 侧栏标签链接
- 侧栏归档链接
- 分页链接

也就是加上 `no-prefetch`：

```vue
<NuxtLink
  :to="post.urlPath || '#'"
  no-prefetch
  class="blog-post-list-card__title"
>
  {{ post.title || '未命名' }}
</NuxtLink>
```

这样做之后，链接还是 `NuxtLink`，点击跳转也还是客户端路由跳转，只是不在刷新首屏时提前拉一堆目标页面资源。

第二步，先注释掉详情页复制代码里的 Vant Toast：

```ts
await navigator.clipboard.writeText(codeEl.textContent ?? '')
// showToast('已复制')
```

这样详情页就不会因为复制提示把 Vant 全局 reset 带进来，返回首页时左侧标签栏高度也不会再变。

后面如果还想保留“复制成功”提示，更适合自己写一个很轻的本地 toast，样式放在详情页自己的 scoped style 里，不再引入 Vant。

## 什么时候适合 no-prefetch

我现在的理解是：

- 链接少、点击概率高：可以保留默认预取。
- 链接多、首屏密集出现：可以考虑 `no-prefetch`。
- 列表页、标签云、归档页：尤其要留意。

性能优化不是越多越好。  
有时候“提前加载”确实能让点击更快，但如果它影响首屏稳定性，就要按页面场景取舍。

这次博客首页刷新抖动也提醒我：  
看到页面变化时，不要只盯着当前页面的代码，也要看“从别的页面跳回来时，前一个页面加载过什么全局资源”。
