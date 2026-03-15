<template>
  <div>
    check console
  </div>
</template>

<script>
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
    console.log('now get ajax result ' + value)
  },
)
</script>
