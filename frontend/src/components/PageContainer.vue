<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { RouterLink, RouterView } from 'vue-router'

import { useCardStore } from '@/stores/card'
import ContainerPanel from '@/components/ContainerPanel.vue'
import PageViewContainer from '@/components/PageViewContainer.vue'

const cardStore = useCardStore()

const isShowFocusMode = ref(window.innerWidth < 1080)

const handleFocusModeResize = () => {
  isShowFocusMode.value = window.innerWidth < 1080
}

const showFocusMode = () => {
  if (isShowFocusMode.value) {
    cardStore.questionFocusMode = !cardStore.questionFocusMode
  }
}

const openDashboard = () => {
  cardStore.mobileShowPanel = !cardStore.mobileShowPanel
}

const viewportHeight = ref<number>(0)

const updateViewportHeight = () => {
  if (isShowFocusMode.value) {
    viewportHeight.value = window.innerHeight * 0.01
  }
}

onMounted(() => {
  window.addEventListener('resize', handleFocusModeResize)
  window.addEventListener('resize', updateViewportHeight)
  updateViewportHeight()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleFocusModeResize)
  window.removeEventListener('resize', updateViewportHeight)
})
</script>

<template>
  <main
    class="page-container"
    :class="{ 'focus-mode': cardStore.questionFocusMode }"
    :style="{ '--viewport-height': viewportHeight + 'px' }"
  >
    <ContainerPanel />
    <div class="page-container-main">
      <div class="page-container-main-tools">
        <router-link
          to="/"
          class="page-container-main-tools__button"
          :exact-active-class="'active'"
          >引导</router-link
        >
        <router-link
          to="/practice"
          class="page-container-main-tools__button"
          :exact-active-class="'active'"
          >刷题</router-link
        >
        <router-link
          to="/test"
          class="page-container-main-tools__button"
          :exact-active-class="'active'"
          >试卷</router-link
        >
        <router-link
          to="/view"
          class="page-container-main-tools__button"
          :exact-active-class="'active'"
          >看题</router-link
        >
        <router-link
          to="/star"
          class="page-container-main-tools__button"
          :exact-active-class="'active'"
          >收藏</router-link
        >
        <router-link
          to="/stat"
          class="page-container-main-tools__button"
          :exact-active-class="'active'"
          >统计</router-link
        >
        <router-link
          to="/export"
          class="page-container-main-tools__button"
          :exact-active-class="'active'"
          >导出</router-link
        >
        <router-link
          to="/advanced"
          class="page-container-main-tools__button"
          :exact-active-class="'active'"
          >设置</router-link
        >
        <router-link
          to="/about"
          class="page-container-main-tools__button"
          :exact-active-class="'active'"
          >关于</router-link
        >
        <router-link
          to="/debug"
          class="page-container-main-tools__button"
          :exact-active-class="'active'"
          >调试</router-link
        >
      </div>
      <div class="page-container-main-wrapper">
        <router-view v-slot="{ Component }">
          <transition name="route">
            <component :is="Component" />
          </transition>
        </router-view>
        <PageViewContainer />
      </div>
    </div>
    <div class="page-focus-mode-tools" v-if="isShowFocusMode">
      <div
        class="page-focus-mode-tool focus-mode"
        :class="{ active: cardStore.questionFocusMode }"
        @click="showFocusMode"
      >
        <span class="page-focus-mode-tool__button material-icons">
          {{ cardStore.questionFocusMode ? 'zoom_in_map' : 'zoom_out_map' }}
        </span>
      </div>
      <div
        class="page-focus-mode-tool dashboard"
        :class="{ active: cardStore.mobileShowPanel }"
        @click="openDashboard"
      >
        <span class="page-focus-mode-tool__button material-icons">
          dashboard
        </span>
      </div>
    </div>
    <div
      class="page-focus-mode-info"
      v-if="cardStore.questionFocusMode && isShowFocusMode"
    >
      当前处于专注模式，右下角菜单可控制退出
    </div>
  </main>
</template>

<style lang="scss" scoped>
.route-enter-active,
.route-leave-active {
  transition:
    opacity 200ms ease,
    transform 200ms ease;
}

.route-enter-from,
.route-leave-to {
  transform: translateX(-20px);
  opacity: 0;
}

.route-enter-to,
.route-leave-from {
  transform: translateX(0);
  opacity: 1;
}
</style>

<style lang="scss" scoped>
@use '@/assets/styles/focus_mode.scss' as focus;

.page-focus-mode-info {
  position: absolute;
  top: calc(100% + 2px);
  left: 50%;
  transform: translateX(-50%);
  color: var(--color-surface-4);
  font-size: 12px;
  white-space: nowrap;
  padding: 2px 10px;
  transition: focus.$focus-mode-transition-duration;
}

.page-focus-mode-tools {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  gap: 0.5rem;
  position: fixed;
  right: 0.75rem;
  bottom: 2rem;
  z-index: 99999;
  padding: 8px 2px;
  border: 1px solid var(--border-color-base--darker);
  border-radius: 32px;
  background: var(--color-surface-0);
  box-shadow: 0 2px 48px var(--border-color-base--darker);
  user-select: none;

  .page-focus-mode-tool {
    display: flex;
    align-items: center;
    gap: 2px;
    color: var(--color-base--subtle);
    font-size: 12px;
    padding: 6px;
    border-radius: 50%;
    transition: focus.$focus-mode-transition-duration;
    cursor: pointer;

    &:hover {
      background: var(--border-color-base);
    }

    .material-icons {
      font-size: 20px;
      transition: focus.$focus-mode-transition-duration;

      &:active {
        transform: scale(0.9);
        transition-duration: 80ms;
      }
    }

    &.focus-mode,
    &.dashboard {
      color: var(--color-base--subtle);
      transition-duration: 150ms;

      &.active {
        color: var(--color-primary);
      }
    }
  }
}
</style>

<style lang="scss" scoped>
@use '@/assets/styles/media_screen.scss' as screen;
@use '@/assets/styles/focus_mode.scss' as focus;

.page-container {
  --container-height: 78vh;
  --panel-width: 300px;
  display: flex;
  justify-content: center;
  gap: calc(var(--gap-value) * 2);
  min-height: 400px;
  height: var(--container-height);
  margin: auto 8rem;
  position: relative;
  transition: focus.$focus-mode-transition-duration;

  @include screen.media-screen(mobile) {
    &.focus-mode {
      --container-height: calc(90 * var(--viewport-height));
      margin: 0;
      margin-top: 2.75rem;
      margin-bottom: auto;
    }
  }

  @include screen.media-screen(phone) {
    --container-height: 78vh;
  }

  .page-container-main {
    display: flex;
    flex: 1;
    width: 60vw;
    max-width: 900px;
    border: 1px solid var(--border-color-base);
    border-radius: 10px;
    background: var(--color-surface-0);
    box-shadow: var(--box-shadow-diverge);
    transition: box-shadow 200ms ease;
    position: relative;

    &:hover {
      box-shadow: var(--box-shadow-diverge--hover);
    }

    .page-container-main-tools {
      display: flex;
      align-items: center;
      gap: calc(var(--gap-value) * 0.5);
      position: absolute;
      left: 0;
      bottom: calc(100% + 2px);

      .page-container-main-tools__button {
        color: var(--color-base--subtle);
        font-size: 12px;
        padding: 2px 4px;
        border-radius: 12px;
        text-decoration: none;
        white-space: nowrap;
        transition: var(--transition-hover);
        user-select: none;

        &:hover {
          color: var(--color-surface-0);
          padding: 2px 8px;
          background: var(--color-primary);
        }

        &:active {
          transform: scale(0.9);
        }

        &.active {
          color: var(--color-base--emphasized);
          font-size: 13px;
          font-weight: bold;

          &:hover {
            color: var(--color-surface-0);
          }
        }
      }
    }

    .page-container-main-wrapper {
      width: 100%;
      height: 100%;
      border-radius: 10px;
      position: relative;
      overflow: hidden;
    }

    .page-container-slide {
      height: 100%;
      padding: 1.5rem;
    }
  }
}

@include screen.media-screen(mobile) {
  .page-container {
    width: 100%;
    padding: 0 1.25rem;
    margin: 3rem 0;

    .page-container-main {
      width: 100%;

      .page-container-main-tools {
        width: 100%;
        bottom: calc(100% + 4px);
        padding-bottom: 5px;
        overflow-x: auto;
      }
    }
  }
}
</style>
