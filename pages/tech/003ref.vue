<template>
  <div class="container">
    <div ref="demo1">
      demo 1
    </div>

    <hr>
    <div>下面:ref 里其实当作函数使用</div>
    <div
      v-for="(num, index) in 10"
      :key="num"
      :ref="(el) => setBtnRef(el, index)"
      class="row"
      @click="handleClick(index)"
    >
      {{ num }}
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'

const demo1 = ref(null)

const btnRefs = ref([])

const setBtnRef = (el, index) => {
  if (el) btnRefs.value[index] = el
}

// 点击第 n 个按钮，让它变色
const handleClick = (index) => {
  const el = btnRefs.value?.[index]
  if (el) el.style.background = 'red'
}

onMounted(() => {
  if (demo1.value) demo1.value.style.color = 'red'
})
</script>

<style scoped>
.container {
  padding: 20px;
}
.row{
  cursor: pointer;
}
</style>
