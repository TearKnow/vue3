<template>
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
</template>

<script lang="ts" setup>
import { reactive, watch } from 'vue'

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
</script>
