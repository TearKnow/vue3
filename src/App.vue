<template>
    <div>例子1: ref进行响应式更新（比如每隔几秒更新下）</div>
    <div>这是用正常思路做的，每隔几秒有新值，但是界面是不会变的：{{myRandomValue}}</div>
    <div>这是用了ref响应式的, <span class="important">要用const，然后修改value才行。这里npm i uuid安装了uuid模块</span>：{{ uuidRef }}</div>
</template>


<script setup>
  import { ref } from 'vue'
  import { v4 as uuid } from 'uuid'
  //例子1: 用如下代码，虽然random的会更新，但是页面是不会变的
  let myRandomValue = Math.random()
  setInterval(() => {
    myRandomValue = Math.random()
    console.log(myRandomValue)
  }, 10000)
  //例子1: 正确用法
  const uuidRef = ref(uuid())
  setInterval(() => uuidRef.value = uuid(), 1000)


   



</script>

<style>
  .important{
    color: red;
    font-weight: bold;
  }
</style>