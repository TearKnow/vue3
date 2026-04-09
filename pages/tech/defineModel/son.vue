<template>
  <div>
    sonInput:
    <input type="text" v-model="select1">
  </div>
</template>

<script setup>
const select1 = defineModel('parentKey', { default: '' })
</script>