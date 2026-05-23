<template>
  <div class="demo-block">
    {{ sum }}
    <button @click="addOne">
      点我加一
    </button>
    <br><br>

    <img
      v-for="(dog, index) in dogList"
      :key="index"
      :src="dog"
      class="dogs"
    >

    <br>
    <button @click="getDog">
      来一只小狗
    </button>
  </div>
</template>

<script lang="ts" setup>
import useDog from './hooks/useDog'
import useSum from './hooks/useSum'

const { sum, addOne } = useSum()
const { dogList, getDog } = useDog()
</script>

<style>
.dogs{
  height: 150px;
  margin-right:10px;
}
</style>
