<script lang="ts" setup>
import { ref } from 'vue'
import { useCardStore } from '@/stores/card'

const cardStore = useCardStore()
const isDarkMode = ref(localStorage.getItem('theme') === 'dark')

const applyTheme = (dark: boolean) => {
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  document.documentElement.classList.toggle('dark', dark)
}

const showMobilePanel = () => {
  cardStore.mobileShowPanel = !cardStore.mobileShowPanel
}

const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value
  applyTheme(isDarkMode.value)
  localStorage.setItem('theme', isDarkMode.value ? 'dark' : 'light')
}

applyTheme(isDarkMode.value)
</script>

<template>
  <header
    class="page-menu"
    :class="{ 'focus-mode': cardStore.questionFocusMode }"
  >
    <div class="page-menu-wrapper">
      <div class="page-menu-title" @click="showMobilePanel">
        计大船政转轨考の刷题系统3.1
      </div>
      <div class="page-menu-list">
        <UButton
          class="page-menu-theme-toggle -mr-1"
          :icon="isDarkMode ? 'i-lucide-sun' : 'i-lucide-moon'"
          color="neutral"
          variant="ghost"
          :aria-label="isDarkMode ? '切换浅色模式' : '切换深色模式'"
          v-tippy="{ content: isDarkMode ? '浅色模式' : '深色模式' }"
          @click="toggleDarkMode"
        />
        <div class="page-menu-link">
          <a
            href="https://www.fjcpc.edu.cn/"
            target="_blank"
            v-tippy="{ content: '船政官网' }"
          >
            <img
              src="../assets/images/logo/fjcpc_logo.png"
              alt="福建船政交通职业学院"
            />
          </a>
        </div>
        <div class="page-menu-link">
          <a
            href="https://github.com/AurLemon/fjcpc-transfer-exam-practice-system"
            target="_blank"
            v-tippy="{ content: '项目 GitHub 仓库' }"
          >
            <img
              src="../assets/images/logo/GitHub_logo.svg"
              alt="Gitee 项目地址"
              class="dark:filter-[invert(1)]"
            />
          </a>
        </div>
      </div>
    </div>
  </header>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/media_screen.scss' as screen;
@use '@/assets/styles/focus_mode.scss' as focus;

.page-menu {
  width: 100%;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--border-color-base);

  @include screen.media-screen(mobile) {
    max-height: 120px;
    overflow: hidden;
    transition: focus.$focus-mode-transition-duration;

    &.focus-mode {
      max-height: 0px;
      padding: 0;
    }
  }

  @include screen.media-screen(phone) {
    margin-bottom: 0;
  }
}

.page-menu-wrapper {
  display: flex;
  justify-content: space-between;
  width: 100%;
  align-items: center;
  width: var(--page-common-width);
  margin: 0 auto;
  padding: 10px;

  @include screen.media-screen(pad) {
    justify-content: center;
    flex-wrap: wrap;
    gap: 2rem;
  }

  @include screen.media-screen(phone) {
    width: unset;
    align-items: flex-start;
    flex-direction: column-reverse;
    flex-wrap: wrap;
    gap: calc(var(--gap-value) / 2);
  }

  .page-menu-title {
    font-size: 20px;
    font-weight: bold;
    padding: 2px 8px;
    border-radius: 8px;
    transition: var(--transition-hover);
    user-select: none;

    &:active {
      transform: scale(0.98);
      background: var(--border-color-base);
      transition-duration: 80ms;
    }

    @include screen.media-screen(phone) {
      font-size: 22px;
    }
  }

  .page-menu-list {
    display: flex;
    align-items: center;
    gap: var(--gap-value);

    .page-menu-link {
      border-radius: 50%;
      overflow: hidden;
      transition: var(--transition-hover);

      img {
        display: block;
        width: 24px;
        height: 24px;
      }

      &:hover {
        filter: brightness(1.1);
        transform: scale(1.05);
      }
    }

    .page-menu-theme-toggle {
      display: block;
      width: 32px;
      height: 32px;
      padding: 0 !important;
      border: 0;
      border-radius: 50%;
      color: var(--color-base--subtle);
      background: transparent;
      cursor: pointer;

      &:hover {
        background: var(--border-color-base);
      }
    }
  }
}

@include screen.media-screen(mobile) {
  .page-menu-wrapper {
    width: unset;
    padding: 1rem 1.5rem;

    .page-menu-list {
      margin: 0 8px;
    }
  }
}
</style>
