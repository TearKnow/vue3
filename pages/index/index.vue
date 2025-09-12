<template>
    <button @click="changeName">changename</button>
    name:{{ name }} <br>
    age:{{ age }}
</template>

<script lang="ts" setup>
    import {ref, reactive} from 'vue'
    let person = reactive({
        name: "zhangsan",
        age: 18
    })

    let {age, name} = toRefs(person)

    function changeName() {
        name.value += '!'
    }
    
</script>
