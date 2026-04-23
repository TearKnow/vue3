<template>
  <div>
    sonInput:
    <input
      v-model="select1"
      type="text"
    >
  </div>
</template>

<script setup>
const select1 = defineModel('parentKey', {
  type: String,
  default: '',
})
</script>
