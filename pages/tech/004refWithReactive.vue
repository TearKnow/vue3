<template>
  <div>
    <h2>ref 的基本类型使用</h2>
    <div>
      <p>count: {{ count }}</p>
      <button @click="count++">
        count++
      </button>
    </div>
    <div>
      <p>message: {{ message }}</p>
      <button @click="message += '!'">
        追加 !
      </button>
    </div>

    <h2>reactive 的对象类型使用(只能用于对象类型，不能用于基本类型，如 number、string、boolean 等)</h2>
    <div>
      <p>name: {{ state.name }}</p>
      <p>age: {{ state.age }}</p>
      <button @click="changeAge">
        age++
      </button>
      <button @click="changeName">
        修改 name
      </button>
    </div>

    <h2>ref 的对象类型使用（相比reactive, ref在js里使用对象时候，需要加上.value 来访问对象的属性）</h2>
    <div>
      <p>name: {{ state2.name2 }}</p>
      <p>age: {{ state2.age2 }}</p>
      <button @click="changeAge2">
        age++
      </button>
      <button @click="changeName2">
        修改 name
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'

// ref 的基本类型使用
const count = ref(0)
const message = ref('hello')

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
