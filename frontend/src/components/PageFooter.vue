<script lang="ts" setup>
import dayjs from 'dayjs'
import { useCardStore } from '@/stores/card'

const cardStore = useCardStore()
</script>

<template>
  <footer
    class="page-footer"
    :class="{ 'focus-mode': cardStore.questionFocusMode }"
  >
    <div class="page-footer-project">
      <div class="page-footer-project__link">
        <a href="https://beian.miit.gov.cn/" target="_blank">
          <img src="../assets/images/beian_miit.png" width="16" height="16" />
          闽ICP备2023007345号-3
        </a>
        <a
          href="https://appzb.fjcpc.edu.cn/kszx-test32/#/login"
          target="_blank"
        >
          <img
            src="../assets/images/logo/fjcpc_logo.png"
            width="16"
            height="16"
          />
          船政转轨考练习中心
        </a>
        <a
          href="https://appzb.fjcpc.edu.cn/kszx-test32-app/#/login"
          target="_blank"
        >
          <img
            src="../assets/images/logo/fjcpc_logo.png"
            width="16"
            height="16"
          />
          船政转轨考练习中心（移动端）
        </a>
      </div>
    </div>
    <div class="page-footer-copyright">
      This project based on Vue.js + Nest.js under License MIT, coding and
      design by AurLemon. ©
      {{ dayjs().year() > 2024 ? `2024 - ${dayjs().year()}` : 2024 }} AurLemon
      All rights reserved.
    </div>
  </footer>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/media_screen.scss' as screen;
@use '@/assets/styles/focus_mode.scss' as focus;

.page-footer {
  color: var(--color-surface-4);
  font-size: 12px;
  max-width: var(--page-common-width);
  margin: 0 auto;
  margin-bottom: 0.5rem;

  @include screen.media-screen(mobile) {
    max-height: 100px;
    overflow: hidden;
    transition: focus.$focus-mode-transition-duration;

    &.focus-mode {
      max-height: 0;
      margin: 0;
    }
  }

  .page-footer-copyright {
    text-align: center;
  }

  .page-footer-project {
    display: flex;
    justify-content: center;
    width: 950px;
    padding-bottom: 0.25rem;
    margin-bottom: 0.25rem;
    border-bottom: 1px solid var(--border-color-base);
  }

  .page-footer-project__link {
    display: flex;
    gap: calc(var(--gap-value) / 6);

    a {
      display: flex;
      align-items: center;
      gap: 3px;
      color: var(--color-base--subtle);
      text-decoration: none;
      padding: 2px 6px;
      border-radius: 8px;
      transition: var(--transition-hover);

      &:hover {
        background: var(--border-color-base);
      }

      &:active {
        transform: scale(0.98);
      }
    }

    img {
      width: 16px;
      height: 16px;
      border-radius: 50%;
    }
  }
}

@include screen.media-screen(mobile) {
  .page-footer {
    margin: 0 1rem 1rem 1rem;

    .page-footer-project {
      width: 100%;
      padding-bottom: 0.5rem;
    }

    .page-footer-project__name {
      margin: 10px;
    }

    .page-footer-project__link {
      justify-content: center;
      flex-wrap: wrap;
      gap: 0.75px;
    }
  }
}
</style>
