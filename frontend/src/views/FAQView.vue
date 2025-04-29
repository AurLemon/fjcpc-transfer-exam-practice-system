<script lang="ts" setup>
import FAQView from '@/content/FAQView.md'
import 'github-markdown-css/github-markdown-light.css'
import 'prismjs/themes/prism-tomorrow.css'
</script>

<template>
  <div class="page-container-slide page-faq">
    <FAQView />
  </div>
</template>

<style lang="scss">
.markdown-body {
  background-color: transparent;
}
</style>

<style lang="scss" scoped>
.page-faq {
  overflow-y: auto;
}
</style>
