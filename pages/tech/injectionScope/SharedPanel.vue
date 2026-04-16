<template>
  <div class="panel">
    <div class="title">{{ title }}</div>
    <div class="line">mode: {{ store.mode }}</div>
    <div class="line">count: {{ store.count }}</div>
    <div class="line">label: {{ store.label }}</div>
    <button class="btn" @click="store.inc">
      +1
    </button>
  </div>
</template>

<script setup lang="ts">
import { useScopedCounterStore } from './useScopedCounter'

defineProps<{
  title: string
}>()

const store = useScopedCounterStore()

if (!store) {
  throw new Error('SharedPanel 必须在 ScopeProvider 内使用')
}
</script>

<style scoped>
.panel {
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  padding: 12px;
  margin-top: 8px;
  background: #fff;
}

.title {
  font-weight: 700;
  margin-bottom: 8px;
}

.line {
  font-size: 14px;
  margin: 4px 0;
}

.btn {
  margin-top: 8px;
  cursor: pointer;
}
</style>
