<template>
  <div>
    <WatchBasicRefDemo />
    <WatchRefObjectDemo />
    <WatchReactiveObjectDemo />
    <WatchPropertyDemo />
    <WatchMultiSourceDemo />
  </div>
</template>

<script lang="ts" setup>
import WatchBasicRefDemo from './watchDemos/001WatchBasicRefDemo.vue'
import WatchRefObjectDemo from './watchDemos/002WatchRefObjectDemo.vue'
import WatchReactiveObjectDemo from './watchDemos/003WatchReactiveObjectDemo.vue'
import WatchPropertyDemo from './watchDemos/004WatchPropertyDemo.vue'
import WatchMultiSourceDemo from './watchDemos/005WatchMultiSourceDemo.vue'
</script>
