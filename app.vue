<template>
  <NuxtPage />
  <!-- <br><br><br></br>

  <van-button type="primary">主要按钮</van-button>
  <van-button type="success">成功按钮</van-button>
  <van-button type="default">默认按钮</van-button>
  <van-button type="danger">危险按钮</van-button>
  <van-button type="warning">警告按钮</van-button> -->
</template>

<script setup lang="ts">
import { useBlogNavigationLoading } from '~/composables/useBlogNavigationLoading'

useSeoMeta({
  title: 'vue3',
  description: 'vue3，你的选择',
})

useBlogNavigationLoading()

// showSuccessToast('成功文案');

// const {data} = await useFetch('/api/channel')
// console.log(data.value)
</script>

<style>
@keyframes blog-page-loading-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
