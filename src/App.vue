<template>
      <div>

      </div><br><br>

    <div>例子1: ref进行响应式更新（比如每隔几秒更新下）</div>
    <div>这是用正常思路做的，每隔几秒有新值，但是界面是不会变的：{{myRandomValue}}</div>
    <div>这是用了ref响应式的, <span class="important">要用const，然后修改value才行。这里npm i uuid安装了uuid模块</span>：{{ uuidRef }}</div>
    <br><br>

    <div>
      例子2: reactive，相比ref修改时不需要用value修改。<span class="important">但是解构出来的不会动态改变，包括ref</span>
    </div>
    <div>
      {{user.name}} -- {{ user.age }}
    </div>
    <div>
      {{ name }} -- {{ age }} {{ user }}
    </div>
    <br><br>


    <div>
      例子3: toRef 的使用。同源更新，感觉没啥用。toRefs 略
    </div>
    <br><br>


    <div>
      例子4: computed的使用<span class="important">需要用.value, return a.value + b.value</span>
    </div>
    <div>10+20 = <span class="important">{{ c }}</span></div>
    <br><br>





</template>


<script setup>
  import { computed, ref } from 'vue'
  import { reactive } from 'vue'
  import { v4 as uuid } from 'uuid'
  import { toRef } from 'vue'

  //例子1: 用如下代码，虽然random的会更新，但是页面是不会变的
  let myRandomValue = Math.random()
  setInterval(() => {
    myRandomValue = Math.random()
    console.log(myRandomValue)
  }, 10000)
  //例子1: 正确用法
  const uuidRef = ref(uuid())
  setInterval(() => uuidRef.value = uuid(), 1000)


  //例子2: reactive
  const user = reactive({
    'name': 'jack',
    'age': 18
  })
  setInterval(() => {user.name = uuid()}, 2000)
  const {name, age} = user


  //例子4: computed
  const a = ref(10)
  const b = ref(20)
  const c = computed(() => {
    return a.value + b.value
  })


</script>

<style>
  .important{
    color: red;
    font-weight: bold;
  }
</style>