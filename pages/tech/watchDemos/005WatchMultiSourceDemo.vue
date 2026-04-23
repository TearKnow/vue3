<template>
  <div class="demo-block">
    <h2>情况5: 监视上述的多个数据</h2>
    <div>
      sum: {{ sum }} <br>
      person: {{ person.name }} / {{ person.age }} <br>
      city: {{ address.city }}
    </div>
    <button @click="changeSum">
      sum +1
    </button>
    <button @click="changePerson">
      修改 person
    </button>
    <button @click="changeCity">
      修改 city
    </button>
    <div class="demo-tip">
      就是watch的时候放到一个数组里，监听多个数据
    </div>
  </div>
</template>

<script lang="ts" setup>
import { reactive, ref, watch } from 'vue'

const sum = ref(0)
const person = ref({
  name: 'Alice',
  age: 30,
})
const address = reactive({
  city: 'New York',
  zipcode: '10001',
})

function changeSum() {
  sum.value += 1
}

function changePerson() {
  person.value = {
    name: person.value.name === 'Alice' ? 'Bob' : 'Alice',
    age: person.value.age + 1,
  }
}

function changeCity() {
  address.city = address.city === 'New York' ? 'Los Angeles' : 'New York'
}

watch([sum, person, () => address.city], ([newSum, newPerson, newCity], [oldSum, oldPerson, oldCity]) => {
  console.log('多数据监听变化', {
    oldSum,
    newSum,
    oldPerson,
    newPerson,
    oldCity,
    newCity,
  })
})
</script>
