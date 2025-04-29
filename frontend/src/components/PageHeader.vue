<script lang="ts">
import { defineComponent } from 'vue'
import { useQuestionStore } from '@/stores/question'
import { useCardStore } from '@/stores/card'

export default defineComponent({
  name: 'PageHeader',
  methods: {
    showMobilePanel() {
      this.cardStore.mobileShowPanel = !this.cardStore.mobileShowPanel
    },
  },
  setup() {
    const questionStore = useQuestionStore()
    const cardStore = useCardStore()
    return {
      questionStore,
      cardStore,
    }
  },
})
</script>

<template>
  <header
    class="page-menu"
    :class="{ 'focus-mode': cardStore.questionFocusMode }"
  >
    <div class="page-menu-wrapper">
      <div class="page-menu-title" @click="showMobilePanel">
        计大船政转轨考の刷题系统3.0
      </div>
      <div class="page-menu-list">
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
            />
          </a>
        </div>
        <div
          class="page-menu-commit"
          v-if="questionStore.questionInfo.git_info.local_commit !== ''"
          v-tippy="{
            content:
              questionStore.questionInfo.git_info.recent_commit === 'both'
                ? '当前项目的本地仓库的进度与远程仓库一致'
                : '当前项目已滞后，需要部署项目的人员更新项目',
          }"
        >
          {{ questionStore.questionInfo.git_info.local_commit.slice(0, 8) }}
          <div
            class="page-menu-commit__status"
            :class="{
              inc:
                questionStore.questionInfo.git_info.recent_commit === 'repo' ||
                questionStore.questionInfo.git_info.recent_commit === 'local',
            }"
          ></div>
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

    .page-menu-commit {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      color: var(--color-base--subtle);
      font-size: 12px;
      padding: 2px 6px;
      border: 1px solid var(--border-color-base--darker);
      border-radius: 4px;

      .page-menu-commit__status {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--success-color);
        box-shadow: 0 0 32px 1px var(--success-color);

        &.inc {
          background: var(--failed-color);
          box-shadow: 0 0 32px 1px var(--failed-color);
        }
      }
    }

    .page-menu-link {
      border-radius: 50%;
      box-shadow: 1px 1px 4px rgba(0, 0, 0, 0.2);
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
