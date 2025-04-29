<script lang="ts">
import { defineComponent } from 'vue'
import { useUserStore } from '@/stores/user'
import { useQuestionStore } from '@/stores/question'
import { useRouter } from 'vue-router'

interface StarQuestion {
  pid: string
  course: number
  subject: number
  type: number
  time: string
}

export default defineComponent({
  name: 'StarView',
  data() {
    return {
      router: null as any,
      showFolderItem: false,
      folder: [
        {
          name: 'wrong',
          label: '错题集',
        },
      ], // 目前只有错题。虽然设计上预留了别的文件夹
      folderContent: [] as StarQuestion[],
      currentFolder: 'wrong',
    }
  },
  created() {
    this.router = useRouter()
  },
  methods: {
    openFolder(folderName: string): void {
      setTimeout(async () => {
        this.showFolderItem = true
        this.currentFolder = folderName
        this.folderContent = await this.getFolderContent(folderName)
      }, 50)
    },
    exitFolder(): void {
      setTimeout(() => {
        this.showFolderItem = false
        this.currentFolder = ''
      }, 50)
    },
    getCurrentFolderLabel(folderName: string): string {
      const folderItem = this.folder.find((item) => {
        if (item.name === folderName) return item
      })

      if (!folderItem) {
        return 'wrong'
      }

      return folderItem?.label
    },
    async getFolderContent(foldeName: string = 'wrong'): Promise<any> {
      const userStore = useUserStore()
      const result = await userStore.getFolderContent(foldeName)
      return result
    },
    renderQuestionCourse(course: number) {
      const questionStore = useQuestionStore()
      const result = questionStore.renderQuestionCourse(course)
      return result
    },
    renderQuestionSubject(course: number, subject: number) {
      const questionStore = useQuestionStore()
      const result = questionStore.renderQuestionSubject(course, subject)
      return result
    },
    renderQuestionType(type: number) {
      const questionStore = useQuestionStore()
      const result = questionStore.renderQuestionType(type)
      return result
    },
    async deleteStar(pid: string, folderName: string = 'wrong'): Promise<void> {
      const userStore = useUserStore()
      await userStore.deleteStar(pid)
      this.folderContent = await this.getFolderContent(folderName)
    },
    viewQuestion(pid: string) {
      this.router.push(`/view/${pid}`)
    }
  },
})
</script>

<template>
  <div class="page-container-slide page-star">
    <div class="page-container-title">收藏</div>
    <div class="page-star-folder-list" v-if="!showFolderItem">
      <div
        class="page-star-folder"
        v-for="(item, index) in folder"
        :key="index"
        @click="openFolder(item.name)"
      >
        <div class="page-star-folder__icon">
          <span class="material-icons">folder_open</span>
        </div>
        <div class="page-star-folder__name">{{ item.label }}</div>
      </div>
    </div>
    <div class="page-star-folder-item" v-else>
      <div class="page-star-folder-item__title">
        <div class="back material-icons" @click="exitFolder">arrow_back</div>
        <div class="label">
          {{ getCurrentFolderLabel(currentFolder) }}（{{
            folderContent.length
          }}）
        </div>
      </div>
      <div class="page-star-folder-item__container">
        <div
          class="page-star-item"
          v-for="(item, index) in folderContent"
          :key="index"
        >
          <div class="page-star-item__title">{{ item.pid }}</div>
          <div class="page-star-item__content">
            <div class="page-star-item__tag">
              {{ renderQuestionCourse(item.course) }}
            </div>
            <div class="page-star-item__tag">
              {{ renderQuestionSubject(item.course, item.subject) }}
            </div>
            <div class="page-star-item__tag">
              {{ renderQuestionType(item.type) }}
            </div>
          </div>
          <div class="page-star-item__tools">
            <div class="page-star-item__tool" @click="viewQuestion(item.pid)">
              <div class="material-icons">search</div>
              <div class="text">查看</div>
            </div>
            <div class="page-star-item__tool" @click="deleteStar(item.pid)">
              <div class="material-icons">delete</div>
              <div class="text">删除</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/media_screen.scss' as screen;

.page-star {
  overflow-y: auto;

  .page-star-folder-list {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-gap: 1rem;

    @include screen.media-screen(pad) {
      grid-template-columns: repeat(2, 1fr);
    }

    @include screen.media-screen(phone) {
      grid-template-columns: repeat(1, 1fr);
    }

    .page-star-folder {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1rem;
      flex-direction: column;
      width: 100%;
      height: 160px;
      padding: 10px;
      border: 1px solid var(--border-color-base);
      border-radius: 16px;
      transition: 150ms ease;
      user-select: none;
      cursor: pointer;

      .page-star-folder__icon .material-icons {
        color: var(--color-base--subtle);
        font-size: 48px;
      }

      .page-star-folder__name {
        font-size: 16px;
        color: var(--color-base);
      }

      &:hover {
        background: var(--border-color-base);
      }

      &:active {
        transform: scale(0.98);
        transition-duration: 80ms;
      }
    }
  }

  .page-star-folder-item {
    display: flex;
    flex-direction: column;
    gap: 1rem;

    .page-star-folder-item__title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 14px;
      padding: 0.25rem 1rem;
      border-radius: 16px;
      background: var(--color-surface-2);

      .back {
        font-size: 18px;
        padding: 4px;
        border-radius: 50%;
        user-select: none;
        cursor: pointer;
        transition: 150ms ease;

        &:hover {
          background: var(--border-color-base--darker);
        }

        &:active {
          transform: scale(0.9);
          transition-duration: 80ms;
        }
      }
    }

    .page-star-folder-item__container {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-gap: 1rem;
      margin: 0 1rem;

      @include screen.media-screen(pad) {
        grid-template-columns: repeat(2, 1fr);
      }

      @include screen.media-screen(phone) {
        grid-template-columns: repeat(1, 1fr);
      }

      .page-star-item {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 15px;
        border: 1px solid var(--border-color-base--darker);
        border-radius: 12px;

        .page-star-item__title {
          font-size: 24px;
          font-weight: 600;
        }

        .page-star-item__content {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
          color: var(--color-base--subtle);
          margin-bottom: 0.5rem;

          .page-star-item__tag {
            color: var(--color-surface-0);
            font-size: 10px;
            padding: 3px 6px;
            border-radius: 12px;
            background: var(--color-primary);
          }
        }

        .page-star-item__tools {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: auto;

          .page-star-item__tool {
            display: flex;
            align-items: center;
            color: var(--color-base--subtle);
            font-size: 13px;
            padding: 3px 6px;
            border-radius: 8px;
            transition: 250ms ease;
            user-select: none;
            cursor: pointer;

            .material-icons {
              color: var(--color-base--subtle);
              font-size: 20px;
              transition: 250ms ease;
            }

            .text {
              display: flex;
              align-items: center;
              transition: 250ms ease;
              width: 0px;
              height: 20px;
              overflow: hidden;
              white-space: nowrap;
            }

            &:hover {
              color: var(--color-base);
              background: var(--border-color-base);

              .material-icons {
                color: var(--color-base);
              }

              .text {
                width: 30px;
              }
            }

            &:active {
              transform: scale(0.95);
              transition-duration: 80ms;
            }
          }
        }
      }
    }
  }
}
</style>
