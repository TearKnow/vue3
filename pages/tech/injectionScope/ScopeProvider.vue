<template>
  <div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { provideScopedCounter } from './useScopedCounter'

const props = withDefaults(defineProps<{
  initial?: number
  mode: string
}>(), {
  initial: 0,
})

provideScopedCounter(props.initial, props.mode)
</script>
