<template>
    <h2>情况一. watch 监视【ref】定义的【基本类型】数据</h2>
    {{ sum }}
    <button @click="changeSum">点我+1  </button><br>


    <h2>情况二. watch 监视【ref】定义的【对象类型】数据</h2>
    <div>
        name:{{ person.name }} <br>
        age:{{ person.age }}
        <button @click="changeName">changeName</button>
        <button @click="changeAge">changeAge</button>
        <button @click="changePerson">changePerson</button>
    </div>


    <h2></h2>



    <h2></h2>


</template>

<script lang="ts" setup>
    import {ref, watch} from 'vue'
    let sum = ref(0)
    function changeSum(){
        sum.value += 1
    }
    const stopSwatch = watch(sum, (newValue, oldValue) => {
        console.log('sum 变了 ' + oldValue + ' to ' + newValue)
        if(newValue >= 10){
            stopSwatch() // 这里可以解除watch
        }
    }) 





    let person = ref({
        name: "zhangsan",
        age: 18
    })
    function changeName(){
        person.value.name += '~'
    }
    function changeAge(){
        person.value.age += 1
    }
    function changePerson() {
        person.value = {name:'lisi', age:90}
    }
    //情况1: 监视对象的地址值。若想监视内部属性变化，需要开启深度监视 deep. 
    // 如果改的属性，oldValue和newValue 是一样的。因为新老值都在person这个对象里。。。。如果直接改person，新老对象是都在的
    // 问题不大，大部分时间不看旧的值。
    watch(person, (newValue, oldValue) => {
        console.log('person changed', newValue, oldValue)
    }, {
        deep: true
    })




    //情况3. reactive的对象

    //情况4. 监视响应式对象中的某个属性，而且该属性是基本类型的，要写出函数式
    let abc = reactive({
        name: 'zhangsan',
        car: {
            c1: 'benz',
            c2: 'bmw'
        }
    })
    watch(() => abc.name, (newValue, oldValue) => {

    })

    //情况4. 或者监视响应式对象中的某个属性，该属性是对象类型，可以直接写，也可以函数，推荐函数
    watch(() => abc.car, (newValue, oldValue) => {

    })


    //情况5. 数组监视 
    watch([() => abc.name, () => abc.car], (newValue, oldValue) => {

    })


</script>

<style scoped>

</style>