export default function () {
  const dogList = reactive<string[]>([])

  async function getDog() {
    const data = await $fetch<{ message: string }>('https://dog.ceo/api/breeds/image/random')
    dogList.push(data.message)
  }
  onMounted(() => {
    getDog()
  })
  // 往外部提供东西
  return {
    dogList,
    getDog,
  }
}
