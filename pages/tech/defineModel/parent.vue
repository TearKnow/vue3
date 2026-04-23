<template>
  <div>
    案例：学习defineModel的使用，在父组件中改了，子组件会变。子组件中改了，父组件会变。
    <hr>
    parentInput:
    <input
      v-model="selectTopicParentKey"
      type="text"
    >

    <Son v-model:parent-key="selectTopicParentKey" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Son from './son.vue'

const selectTopicParentKey = ref('')
</script>
