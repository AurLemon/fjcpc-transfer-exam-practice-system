<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'TestView',
})
</script>

<template>
  <div class="page-container-slide page-test">
    <div class="page-test-loading">
      <span class="material-icons">autorenew</span>
    </div>
    <iframe
      class="fjcpc-transfer-exam"
      src="https://appzb.fjcpc.edu.cn/kszx-test32-app/#/login"
      frameborder="0"
    ></iframe>
  </div>
</template>

<style lang="scss" scoped>
.page-test {
  padding: 0 !important;
  position: relative;

  @keyframes loading {
    from {
      transform: rotate(0deg);
    }

    to {
      transform: rotate(360deg);
    }
  }

  .page-test-loading {
    display: flex;
    justify-content: center;
    align-items: center;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1;
    user-select: none;

    .material-icons {
      color: var(--color-base--subtle);
      font-size: 48px;
      animation: loading 500ms ease-in-out infinite;
    }
  }

  iframe.fjcpc-transfer-exam {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2;
  }
}
</style>
