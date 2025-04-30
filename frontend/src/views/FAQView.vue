<script lang="ts" setup>
import FAQView from '@/content/FAQView.md'
import 'github-markdown-css/github-markdown-light.css'
import 'prismjs/themes/prism-tomorrow.css'
</script>

<template>
  <div class="page-container-slide page-faq">
    <div class="page-container-title">答疑</div>
    <FAQView />
  </div>
</template>

<style lang="scss">
.markdown-body {
  background-color: transparent;

  ul, ol {
    list-style: disc;
  }
}

.faq-container {
  display: flex;
  flex-direction: column;
  margin-bottom: 1em;

  .faq-question {
    color: var(--color-base--subtle);
    margin: 0;
    padding: 0 1em;
    padding-left: 0.5em;
    font-size: 0.875em;
    border-left: 0.25em solid #d1d9e0;
  }

  .faq-answer {
    margin-top: 0.25em;
  }
}
</style>

<style lang="scss" scoped>
.page-faq {
  overflow-y: auto;

  .page-container-title {
    text-align: center;
  }
}
</style>
