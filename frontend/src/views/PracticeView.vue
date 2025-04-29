<script lang="ts">
import { defineComponent } from 'vue'
import QuestionRender from '@/components/question/QuestionRender.vue'

export default defineComponent({
  name: 'PracticeView',
  components: {
    QuestionRender,
  },
})
</script>

<template>
  <div class="page-container-slide page-practice">
    <QuestionRender />
  </div>
</template>

<style lang="scss" scoped>
.page-practice {
  padding: 0 !important;
}
</style>
