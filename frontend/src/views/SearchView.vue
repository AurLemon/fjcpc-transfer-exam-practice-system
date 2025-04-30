<script setup lang="ts">
import QuestionSearch from '@/components/question/QuestionSearch.vue'

defineOptions({
  name: 'SearchView'
})
</script>

<template>
  <div class="page-container-slide page-search">
    <div class="page-container-title">搜题</div>
    <QuestionSearch />
  </div>
</template>

<style lang="scss" scoped>
.page-search {
  overflow-y: auto;
}
</style>
