<template>
  <div>
    demo1 & demo2: check vue file<br>
    the alert is demo3

    <van-popup
      v-model:show="visible"
      position="center"
      :close-on-click-overlay="false"
    >
      <div class="confirm-dialog">
        <div class="content">
          {{ title }}
        </div>
        <div class="btns">
          <van-button
            type="default"
            @click="handleCancel"
          >
            取消
          </van-button>
          <van-button
            type="primary"
            @click="handleOk"
          >
            确认
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
// demo1
/*
const promise = new Promise((resolve, reject) => {
  // resolve('succ')
  reject('failed')
})

promise.then(
  value => console.log(value),
  reason => console.log(reason),
)
*/

// demo2 await可以等异步完成后再继续运行
/**
 * 这里await等待执行完，后面的才能执行
 */

/*
const waitFor = function () {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('I am waiting')
      resolve('I am from setTimeOut') // 需要调用 resolve
    }, 2000)
  })
}

const f1 = async () => {
  const a = await waitFor()
  console.log('f1 end')
  return a
}

f1().then(
  (value) => {
    console.log('now get ajax result ====> ' + value)
  },
)
*/

// demo3.基于 Promise 的自定义确认弹窗（等待用户点击 OK/Cancel 后返回结果）全程可直接运行

const visible = ref(false)

// 存储 Promise 回调
let resolveCallback: (result: boolean) => void = () => {}

const title = ref('')

// 打开弹窗（返回 Promise）
const openDialog = () => {
  visible.value = true
  return new Promise<boolean>((resolve) => {
    resolveCallback = resolve
  })
}

// 点击确认
const handleOk = () => {
  visible.value = false
  resolveCallback(true)
}

// 点击取消
const handleCancel = () => {
  visible.value = false
  resolveCallback(false)
}

// 页面加载自动弹出
onMounted(async () => {
  // 等待用户选择
  const result = await openDialog()

  // 输出结果
  if (result) {
    showToast('你选择了：OK 确认')
  }
  else {
    showToast('你选择了：Cancel 取消')
  }
})
</script>
