<template>
  <div>
    <div class="demo-block">
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
    </div>

    <div class="demo-block">
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
    </div>

    <div class="demo-block">
      <h2>ref 的对象类型使用（相比reactive, ref在js里使用对象时候，需要加上.value 来访问对象的属性。.value里其实还是reactive）</h2>
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

    <div class="demo-block">
      <h2>ref对比reactive</h2>
      <div class="comparison">
        <h3>定义用途：</h3>
        <ul>
          <li>ref 用来定义：基本类型数据、对象类型数据</li>
          <li>reactive 用来定义：对象类型数据</li>
        </ul>

        <h3>区别：</h3>
        <ul>
          <li>ref 创建的变量必须使用 .value（可以使用 volar 插件自动添加 .value）</li>
          <li>reactive 重新分配一个新对象，会失去响应式（可以使用 Object.assign 去整体替换）</li>
        </ul>

        <h3>使用原则：</h3>
        <ul>
          <li>若需要一个基本类型的响应式数据，必须使用 ref</li>
          <li>若需要一个响应式对象，层级不深，ref、reactive 都可以</li>
          <li>若需要一个响应式对象，且层级较深，推荐使用 reactive</li>
        </ul>
      </div>
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
