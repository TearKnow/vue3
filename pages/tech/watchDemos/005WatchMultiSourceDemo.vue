<template>
  <div>
    <h2>情况5: 监视上述的多个数据</h2>
    <div class="demo-tip">
      就是watch的时候放到一个数组里，监听多个数据
    </div>
  </div>
</template>

<script lang="ts" setup>
import { reactive, ref, watch } from 'vue'

const sum = ref(0)
const person = ref({
  name: 'Alice',
  age: 30,
})
const address = reactive({
  city: 'New York',
  zipcode: '10001',
})

watch([sum, person, () => address.city], ([newSum, newPerson, newCity], [oldSum, oldPerson, oldCity]) => {
  console.log('多数据监听变化', {
    oldSum,
    newSum,
    oldPerson,
    newPerson,
    oldCity,
    newCity,
  })
})
</script>
