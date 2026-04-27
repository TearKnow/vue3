---
title: "TypeScript 中 interface 的使用"
description: "用通俗的方式讲清楚 interface 和 type "
date: 2026-04-27
tags:
  - TypeScript
draft: false
pinned: false
---

## 它们都是"贴标签"

你可以把 TypeScript 的类型理解为给数据**贴标签**。一张纸上写了"姓名、年龄、电话"，贴个标签叫「个人信息」——以后看到这个标签，就知道里面该有什么内容。

贴标签有两种方法：`interface` 和 `type`。大部分时候它们能互换，但各有一些对方做不到的事。

## interface：专门用于定义对象的形状

```ts
interface Person {
  id: number
  name: string
  age: number
}

const person: Person = {
  id: 1,
  name: 'John Doe',
  age: 30,
}
```

这就是告诉 TypeScript：凡是标记为 `Person` 的变量，必须有 `id`、`name`、`age` 这三个字段，类型还得对上。

**interface 有两个独家本领：**

1. **继承**：可以用 `extends` 在一个模板的基础上加字段，就像"学生"基于"人"再加上"学号"。
2. **同名自动合并**：如果你在两个地方写了同名 interface，TypeScript 会把它们合在一起。这个特性在给第三方库打补丁时特别好用。

## type：可以为任何类型创建别名，包括基本类型、联合类型、元组等

```ts
type User = {
  id: number
  name: string
}

type UserList = User[]  // 用户列表

// Type 可以定义任何类型
type ID = string | number; // 联合类型
type Point = [number, number]; // 元组
```

type 不光能描述对象，还能描述"要么是数字要么是字符串"这种组合、固定长度的元组等。interface 做不到这些。

**但 type 不能自动合并**，写两个同名的 type 会直接报错。

## 一张表看完区别

| | interface | type |
|---|---|---|
| 描述对象结构 | ✅ | ✅ |
| 同名自动合并 | ✅ | ❌ |
| 继承/扩展 | `extends` | `&` 符号 |
| 联合类型（是A或是B） | ❌ | ✅ |
| 元组（固定长度的数组） | ❌ | ✅ |

## 实际项目怎么写？

**简单记一句话：默认用 interface，遇到它做不了的事再换 type。**

```ts
// 描述一个对象 → 用 interface
export interface Product {
  id: number
  name: string
  price: number
}

// 描述一组对象 → 用 type 更简洁
export type ProductList = Product[]
```

## 记住两件事

- TypeScript 的类型只在**写代码时**帮你检查错误，代码跑起来之后类型就消失了。所以你不能在运行时用 `typeof` 来判断一个 interface 或 type。
- 不确定用哪个的时候，先写 interface。哪天发现 interface 不够灵活了，再改成 type。
