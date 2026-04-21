---
title: "CSS 的 box-sizing: border-box 是什么"
description: 解释 border-box 的作用，并通过对比示例说明不加时会出现的宽度计算问题。
date: 2026-04-12
tags:
  - CSS
draft: false
pinned: false
---

页面布局中，`box-sizing` 是一个非常重要的 CSS 属性。它决定了元素的 `width` 和 `height` 究竟包含哪些部分。

## 1. 默认行为：content-box

默认情况下，浏览器使用 `box-sizing: content-box`。

这时，元素的 `width` 和 `height` 只表示内容区的大小，不包括 `padding` 和 `border`。例如：

```css
.box {
  width: 200px;
  padding: 10px;
  border: 2px solid #333;
}
```

直观上你会认为这个盒子是 `200px` 宽，但实际占用空间是：

- 内容区：200px
- 左右 padding：10px + 10px
- 左右 border：2px + 2px

总宽度 = `200 + 10 + 10 + 2 + 2 = 224px`

如果父容器宽度也是 `200px`，这个盒子就会超出并换行，导致布局错位。

## 2. 使用 border-box

`box-sizing: border-box` 可以把 `padding` 和 `border` 都算入元素的总宽度。

```css
.box {
  box-sizing: border-box;
  width: 200px;
  padding: 10px;
  border: 2px solid #333;
}
```

这时，元素的总宽度仍然是 `200px`。

内部内容区宽度会自动调整为：

- 内容区：`200 - 10 - 10 - 2 - 2 = 176px`

因此，`border-box` 更适合用在布局卡片、按钮、响应式列等场景。

## 3. 举例说明

假设我们要实现一个移动端两列布局，每个卡片宽度希望占屏幕一半。

### 不加 `border-box`

```css
.card {
  width: calc(50% - 10px);
  padding: 12px;
  border: 1px solid #ccc;
}
```

由于 `padding` 和 `border` 会额外增加元素宽度，实际占用会超过 `50% - 10px`，导致两列可能无法并排显示，出现换行或横向滚动。

### 加上 `border-box`

```css
.card {
  box-sizing: border-box;
  width: calc(50% - 10px);
  padding: 12px;
  border: 1px solid #ccc;
}
```

这时每个卡片实际总宽度就是 `calc(50% - 10px)`，布局更可靠，也更容易控制。

## 4. 什么时候一定要加？

建议在全局样式中启用：

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}
```

这样大多数元素的尺寸计算都会更直观。常见的好处：

- 子元素宽度不会因为 `padding` 或 `border` 变大
- 网格、卡片、按钮等组件布局更稳定
- 响应式布局时更容易控制元素总宽度

## 5. 不加时最常见的问题

- 两列布局不能对齐
- 元素宽度实际比预期大
- 横向滚动条意外出现
- `width` 已经是总宽度，但 `padding` 继续叠加

## 6. 结论

`box-sizing: border-box` 让 `width` / `height` 的计算更友好，包含了内容、内边距和边框。

如果你希望 CSS 布局更稳定、样式更容易控制，建议在全局样式中统一使用它。
