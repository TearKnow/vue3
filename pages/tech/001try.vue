<template>
  <div>
    use try catch
  </div>
</template>

<script setup lang="ts">
try {
  throw { error: 1, msg: 'something wrong' }
}
catch (error) {
  console.log(error)
}
</script>
