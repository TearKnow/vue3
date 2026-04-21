<template>
  <div>
    <div class="demo-block">
      <h2>用法1: watch 监视【ref】定义的【基本类型】数据</h2>
      {{ sum }}
      <button @click="changeSum">
        点我+1
      </button>
    </div>

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

    <div class="demo-block">
      <h2>用法3: watch 监视reactive定义的【对象类型】数据</h2>

      <div>
        address:{{ address.city }} <br>

        zipcode:{{ address.zipcode }} <br>
        <button @click="changeAddress">
          changeAddress
        </button>
        <button @click="changeZipcode">
          changeZipcode
        </button>
        <button @click="changeAll">
          changeAll
        </button>
        <div class="demo-tip">
          reactive的默认行为是深度监听
        </div>
      </div>
    </div>

    <div class="demo-block">
      <h2>用法4: 监视ref或者reactive 定义的【对象类型】数据中的某个属性</h2>

      <div>
        公司名字：{{ company.name }} <br>
        公司地址：{{ company.location }} <br>
        公司资产：{{ company.car.c1 }} 、{{ company.car.c2 }} <br>
      </div>

      <button @click="changeCompanyName">
        修改公司名字
      </button>
      <button @click="changeCompanyCar1">
        修改公司某个资产
      </button>
      <button @click="changeCompanyCar">
        修改公司所有资产
      </button>

      <div class="demo-tip">
        <div>若该属性不是【对象类型】，需要写成函数形式</div>
        <div>若该属性是【对象类型】，可以写，也可以写成函数形式，不过建议写成函数形式，记起来方便，最多价格deep</div>
      </div>
    </div>

    <div>
      <h2>情况5: 监视上述的多个数据</h2>
      <div class="demo-tip">
        就是watch的时候放到一个数组里，监听多个数据
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'

const sum = ref(0)
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
function changeSum() {
  sum.value += 1
}
const stopSwatch = watch(sum, (newValue, oldValue) => {
  console.log('sum 变了 ' + oldValue + ' to ' + newValue)
  if (newValue >= 10) {
    stopSwatch() // 这里可以解除watch
  }
})

// immediate: true 立即执行一次回调函数，监听的值会被当做 newValue 传入回调函数，oldValue 则是 undefined
watch(
  person,
  (newValue, oldValue) => {
    console.log('person 变了', oldValue, 'to', newValue)
  },
  { deep: true, immediate: true },
)

const address = reactive({
  city: 'New York',
  zipcode: '10001',
})
function changeAddress() {
  address.city = 'Los Angeles'
}
function changeZipcode() {
  address.zipcode = '90001'
}
function changeAll() {
  Object.assign(address, {
    city: 'Chicago',
    zipcode: '60601',
  })
}
watch(
  address,
  (newValue, oldValue) => {
    console.log('address 变了', oldValue, 'to', newValue)
  },
)

const company = reactive({
  name: 'Google',
  location: 'Mountain View',
  car: {
    c1: 'BMW',
    c2: 'Audi',
  },
})
function changeCompanyName() {
  company.name += '~'
}
function changeCompanyCar() {
  company.car.c1 = 'Mercedes'
  company.car.c2 = 'Lexus'
}
function changeCompanyCar1() {
  company.car.c1 = 'Toyota'
}
watch(
  () => company.name,
  (newValue, oldValue) => {
    console.log('company.name 变了', oldValue, 'to', newValue)
  },
)
watch(
  () => company.car,
  (newValue, oldValue) => {
    console.log('company.car 变了', oldValue, 'to', newValue)
  },
  { deep: true },
)
</script>
