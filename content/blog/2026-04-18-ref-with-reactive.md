---
title: "vue 3 中 ref 与 reactive 的使用与对比"
description: 详细介绍 Vue 3 中 ref 与 reactive 的使用方法、区别以及最佳实践，包括响应式数据的创建、访问和管理。
date: 2026-04-18
tags:
  - Vue
draft: false
pinned: false
---
## 1. ref 的基本类型使用

ref 是 Vue 3 中用于创建响应式数据的 API，它可以用于基本类型数据。

### 示例代码
```vue
<template>
  <div>
    <p>count: {{ count }}</p>
    <button @click="count++">count++</button>
  </div>
  <div>
    <p>message: {{ message }}</p>
    <button @click="message += '!'">追加 !</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// ref 的基本类型使用
const count = ref(0)
const message = ref('hello')
</script>
```

## 2. reactive 的对象类型使用

reactive 用于创建对象类型的响应式数据，不能用于基本类型（如 number、string、boolean 等）。

### 示例代码
```vue
<template>
  <div>
    <p>name: {{ state.name }}</p>
    <p>age: {{ state.age }}</p>
    <button @click="changeAge">age++</button>
    <button @click="changeName">修改 name</button>
  </div>
</template>

<script setup>
import { reactive } from 'vue'

// reactive 的对象类型使用
const state = reactive({
  name: 'Vue 3',
  age: 18,
})
const changeAge = () => {
  state.age++
}
const changeName = () => {
  state.name += ' Reactive'
}
</script>
```

## 3. ref 的对象类型使用

ref 也可以用于对象类型，但在 JavaScript 中使用时需要加上 `.value` 来访问对象的属性。实际上，`.value` 内部仍然是 reactive。

### 示例代码
```vue
<template>
  <div>
    <p>name: {{ state2.name2 }}</p>
    <p>age: {{ state2.age2 }}</p>
    <button @click="changeAge2">age++</button>
    <button @click="changeName2">修改 name</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// ref 的对象类型使用
const state2 = ref({
  name2: 'Vue 3',
  age2: 18,
})

const changeAge2 = () => {
  state2.value.age2++
}
const changeName2 = () => {
  state2.value.name2 += ' Ref2'
}
</script>
```

## 4. ref 与 reactive 的对比

### 定义用途
- **ref** 用来定义：基本类型数据、对象类型数据
- **reactive** 用来定义：对象类型数据

### 区别
- **ref** 创建的变量必须使用 `.value`（可以使用 volar 插件自动添加 `.value`）
- **reactive** 重新分配一个新对象，会失去响应式（可以使用 Object.assign 去整体替换）

### 使用原则
- 若需要一个基本类型的响应式数据，必须使用 ref
- 若需要一个响应式对象，层级不深，ref、reactive 都可以
- 若需要一个响应式对象，且层级较深，推荐使用 reactive

## 5. reactive 重新分配对象的问题与解决方案

### 问题
当直接重新分配 reactive 对象时，会失去响应式特性。

### 解决方案
使用 `Object.assign` 来整体替换对象，保持响应式。

### 示例代码
```vue
<template>
  <div>
    <p>原始对象：name: {{ reactiveObj.name }}, age: {{ reactiveObj.age }}</p>
    <button @click="reassignDirectly">直接重新分配对象（会失去响应式）</button>
    <button @click="reassignWithObjectAssign">使用 Object.assign 重新分配（保持响应式）</button>
    <p v-if="showWarning" style="color: red; margin-top: 10px;">
      警告：直接重新分配对象后，reactive 失去了响应式！
    </p>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'

// reactive 重新分配对象的问题与解决方案
let reactiveObj = reactive({
  name: 'Initial',
  age: 20,
})
const showWarning = ref(false)

// 直接重新分配对象（会失去响应式）
const reassignDirectly = () => {
  reactiveObj = reactive({
    name: 'Wrong Object',
    age: 322,
  })
  console.log('failed')
}

// 使用 Object.assign 重新分配（保持响应式）
const reassignWithObjectAssign = () => {
  // 使用 Object.assign 保持响应式
  Object.assign(reactiveObj, {
    name: 'Updated Object',
    age: 300000,
  })
  console.log('success')
}
</script>
```

## 6. 总结

1. **ref** 是一个通用的响应式 API，适用于任何类型的数据，包括基本类型和对象类型。
2. **reactive** 专门用于对象类型的响应式数据，提供了更简洁的语法（不需要 `.value`）。
3. 当需要重新分配整个对象时，使用 `Object.assign` 来保持 reactive 对象的响应式特性。
4. 选择使用 ref 还是 reactive，取决于具体的使用场景和个人偏好：
   - 基本类型数据：只能使用 ref
   - 简单对象：ref 和 reactive 都可以
   - 复杂嵌套对象：推荐使用 reactive

通过合理使用 ref 和 reactive，可以更有效地管理 Vue 3 应用中的状态，提高代码的可维护性和可读性。