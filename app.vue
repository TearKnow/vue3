<template>
  <NuxtPage />


  <van-button type="primary">主要按钮</van-button>
  <van-button type="success">成功按钮</van-button>
  <van-button type="default">默认按钮</van-button>
  <van-button type="danger">危险按钮</van-button>
  <van-button type="warning">警告按钮</van-button>


</template>


<script setup lang="ts">
useSeoMeta({
  title: "bilibili",
  description: "b站，你的选择",
})


showSuccessToast('成功文案');

const {data} = await useFetch('/api/channel')
console.log(data.value)
</script>