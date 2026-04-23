<template>
  <div>
    姓：<input
      v-model="firstName"
      type="text"
    ><br>
    名：<input
      v-model="lastName"
      type="text"
    ><br>
    全名：<span> {{ quanName }} </span>

    <button @click="changeFullName">
      修改全名为lisi
    </button>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'

const firstName = ref('zhang')
const lastName = ref('san')

const quanName = computed({
  get() {
    return firstName.value + '-' + lastName.value
  },
  set(val) {
    const [f, l] = val.split('-')
    firstName.value = f
    lastName.value = l
  },
})

function changeFullName() {
  quanName.value = 'li-si'
}
</script>
