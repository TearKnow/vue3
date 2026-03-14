<template>
  <div>
    <button @click="changeName">
      changename
    </button><br>
    name:{{ name }} <br>
    age:{{ age }}
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive } from 'vue'

let person = reactive({
  name: 'zhangsan',
  age: 18,
})

let { age, name } = toRefs(person)

function changeName() {
  name.value += '~'
}
</script>
