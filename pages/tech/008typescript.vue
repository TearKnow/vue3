<template>
  <div class="demo-block">
    Hello, TypeScript!

    <div class="demo-tip">
      看源码，定义数组的两种方式
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Person, Employee } from '@/interface/person'

const person: Person = {
  id: 1,
  name: 'John Doe',
  age: 30,
}
console.log(person)

const employees: Employee = [
  {
    id: 1,
    name: 'Alice',
    age: 28,
  },
  {
    id: 2,
    name: 'Bob',
    age: 35,
  },
]
console.log(employees)
</script>
