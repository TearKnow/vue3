<template>
  <div class="demo-block">
    <h2>用法1: watch 监视【ref】定义的【基本类型】数据</h2>
    {{ sum }}
    <button @click="changeSum">
      点我+1
    </button>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'

const sum = ref(0)

function changeSum() {
  sum.value += 1
}

const stopSwatch = watch(sum, (newValue, oldValue) => {
  console.log('sum 变了 ' + oldValue + ' to ' + newValue)
  if (newValue >= 10) {
    stopSwatch()
  }
})
</script>
