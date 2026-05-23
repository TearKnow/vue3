export default function () {
  const sum = ref(0)

  function addOne() {
    sum.value++
  }

  return {
    sum,
    addOne,
  }
}
