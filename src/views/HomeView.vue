<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
const route = useRoute()

onMounted(() => {
  if (route.params.barcode) {
    alert(route.params.barcode)
  }
})
</script>

<template>
  <main>这是主页</main>
</template>
