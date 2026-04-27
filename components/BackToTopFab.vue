<template>
  <Transition name="fade-up">
    <button
      v-if="show"
      type="button"
      class="back-to-top-btn"
      title="回到顶部"
      :style="{ bottom }"
      @click="$emit('click')"
    >
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  </Transition>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  show: boolean
  bottom?: string
}>(), {
  bottom: 'calc(80px + env(safe-area-inset-bottom))',
})

defineEmits<{
  (e: 'click'): void
}>()
</script>

<style scoped>
.back-to-top-btn {
  position: fixed;
  right: 24px;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--blog-slate-200);
  border-radius: 50%;
  background: var(--blog-white);
  color: var(--blog-slate-600);
  box-shadow: 0 4px 14px var(--blog-shadow-sm);
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, box-shadow 0.2s, transform 0.15s;
}

.back-to-top-btn:hover {
  color: #334155;
  border-color: #cbd5e1;
  box-shadow: 0 6px 18px rgb(15 23 42 / 16%);
}

.back-to-top-btn:active {
  transform: scale(0.96);
}

.back-to-top-btn svg {
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
  display: block;
}

.fade-up-enter-active,
.fade-up-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.fade-up-enter-from,
.fade-up-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
