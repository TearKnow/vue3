<template>
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
</template>

<script lang="ts" setup>
import { reactive, watch } from 'vue'

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
