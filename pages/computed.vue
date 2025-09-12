<template>
    <div>
        姓：<input type="text" v-model="firstName"><br>
        名：<input type="text" v-model="lastName"><br>
        全名：<span> {{ quanName }} </span>

        <button @click="changeFullName">修改全名为lisi</button>
    </div>

</template>

<script lang="ts" setup>
    import {ref, computed} from "vue"

    let firstName = ref('zhang')
    let lastName = ref('san')

    //这是只读的
    // let quanName = computed(() => {
    //     return firstName.value + ' ' + lastName.value
    // })

    //这是可修改的
    let quanName = computed({
        get() {
            return firstName.value+'-'+lastName.value
        },  
        set(val){
            let[f, l] = val.split('-')
            firstName.value=f
            lastName.value=l
        }
    })

    function changeFullName(){
        quanName.value = 'li-si'
    }

</script>

<style scoped>

</style>