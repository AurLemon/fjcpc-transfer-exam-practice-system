<script lang="ts">
import { defineComponent } from 'vue'
import QuestionView from '@/components/question/QuestionView.vue'

export default defineComponent({
  name: 'AllQuestionsView',
  components: {
    QuestionView,
  },
})
</script>

<template>
  <div class="page-container-slide page-view">
    <QuestionView />
  </div>
</template>

<style lang="scss" scoped>
.page-view {
  padding: 0 !important;
}
</style>
