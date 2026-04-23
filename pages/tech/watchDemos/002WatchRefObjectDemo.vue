<template>
  <div class="demo-block">
    <h2>用法2: watch 监视【ref】定义的【对象类型】数据</h2>
    <div>
      name:{{ person.name }} <br>
      age:{{ person.age }}
      <button @click="changeName">
        changeName
      </button>
      <button @click="changeAge">
        changeAge
      </button>
      <button @click="changePerson">
        changePerson
      </button>
      <br>
      <b>如果监听的是对象类型的数据，需要设置 deep: true。
        而且如果是对象的属性变化，oldValue和newValue都是一样的，因为它们引用的是同一个对象，对象里的属性变了，老的被覆盖了（点changeAge能看到明显效果）
        如果是person变化了，oldValue和newValue才不一样，因为它们引用的不是同一个对象了
      </b>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'

const person = ref({
  name: 'Alice',
  age: 30,
})

function changeName() {
  person.value.name = 'Bob'
}
function changeAge() {
  person.value.age += 1
}
function changePerson() {
  person.value = {
    name: 'Jack',
    age: 100,
  }
}

watch(
  person,
  (newValue, oldValue) => {
    console.log('person 变了', oldValue, 'to', newValue)
  },
  { deep: true, immediate: true },
)
</script>
