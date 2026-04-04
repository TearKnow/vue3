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

// demo4: 利用 Promise 防止回调地狱的例子
/**
 * 模拟多个异步操作，展示如何使用 Promise 链式调用和 async/await 避免回调地狱
 */

interface UserInfo {
  userId: number
  name: string
}

interface OrderSummary {
  orderId: number
  amount: number
}

interface OrderDetail {
  orderId: number
  amount: number
  status: string
}

// 模拟异步操作 1: 获取用户信息
const getUserInfo = () => {
  return new Promise<UserInfo>((resolve) => {
    setTimeout(() => {
      console.log('获取用户信息完成')
      resolve({ userId: 1, name: '张三' })
    }, 1000)
  })
}

// 模拟异步操作 2: 根据用户ID获取订单列表
const getOrders = (userId: number) => {
  return new Promise<OrderSummary[]>((resolve) => {
    setTimeout(() => {
      console.log(`获取用户 ${userId} 的订单完成`)
      resolve([{ orderId: 1, amount: 100 }, { orderId: 2, amount: 200 }])
    }, 1000)
  })
}

// 模拟异步操作 3: 根据订单ID获取订单详情
const getOrderDetail = (orderId: number) => {
  return new Promise<OrderDetail>((resolve) => {
    setTimeout(() => {
      console.log(`获取订单 ${orderId} 的详情完成`)
      resolve({ orderId, amount: 100, status: '已完成' })
    }, 1000)
  })
}

// 回调地狱版本（不推荐）
// const callbackHellVersion = () => {
//   console.log('=== 回调地狱版本 ===');
//   getUserInfo((userInfo) => {
//     getOrders(userInfo.userId, (orders) => {
//       getOrderDetail(orders[0].orderId, (orderDetail) => {
//         console.log('最终结果:', orderDetail);
//       });
//     });
//   });
// };

// Promise 链式调用版本（推荐）
const promiseChainVersion = () => {
  console.log('=== Promise 链式调用版本 ===')
  getUserInfo()
    .then(userInfo => getOrders(userInfo.userId))
    .then(orders => getOrderDetail(orders[0].orderId))
    .then(orderDetail => console.log('最终结果:', orderDetail))
    .catch(error => console.error('出错了:', error))
}

// async/await 版本（更推荐）
const asyncAwaitVersion = async () => {
  console.log('=== async/await 版本 ===')
  try {
    const userInfo = await getUserInfo()
    const orders = await getOrders(userInfo.userId)
    const orderDetail = await getOrderDetail(orders[0].orderId)
    console.log('最终结果:', orderDetail)
  }
  catch (error) {
    console.error('出错了:', error)
  }
}

// 页面加载时执行示例
onMounted(() => {
  // 执行 Promise 链式调用示例
  promiseChainVersion()

  // 执行 async/await 示例（延迟执行，避免输出混乱）
  setTimeout(() => {
    asyncAwaitVersion()
  }, 3500)
})
</script>
