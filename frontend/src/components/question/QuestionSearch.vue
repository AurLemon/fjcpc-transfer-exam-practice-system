<script lang="ts" setup>
import { ref, reactive, watch, onMounted, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { debounce } from 'lodash'
import { useNotifyStore } from '@/stores/notify'

const router = useRouter()
const notifyStore = useNotifyStore()

const keyword = ref('')
const isLoading = ref(false)

const searchResults = ref<any[]>([])
const total = ref(0)

const searchParams = reactive({
  course: -1,
  subject: -1,
  type: -1,
  page: 1,
  page_size: 10,
})

const totalPages = computed(() =>
  Math.ceil(total.value / searchParams.page_size),
)
const hasResults = computed(() => searchResults.value.length > 0)

const searchQuestions = async () => {
  if (!keyword.value || keyword.value.trim() === '') {
    searchResults.value = []
    return
  }

  isLoading.value = true

  try {
    const params = new URLSearchParams({
      keyword: keyword.value,
      course: searchParams.course.toString(),
      subject: searchParams.subject.toString(),
      type: searchParams.type.toString(),
      page: searchParams.page.toString(),
      page_size: searchParams.page_size.toString(),
    })

    const response = await fetch(`/api/question/search?${params.toString()}`)
    const data = await response.json()

    if (data.code === 200 && data.data) {
      searchResults.value = data.data.questions || []
      total.value = data.data.total || 0
    } else {
      searchResults.value = []
      total.value = 0
      notifyStore.addMessage('info', 'No results found')
    }
  } catch (error) {
    console.error('Search error:', error)
    notifyStore.addMessage('failed', `Search failed: ${error}`)
    searchResults.value = []
    total.value = 0
  } finally {
    isLoading.value = false
  }
}

const debouncedSearch = debounce(searchQuestions, 300)

const goToQuestion = (pid: string) => {
  router.push(`/view/${pid}`)
}

const nextPage = () => {
  if (searchParams.page < totalPages.value) {
    searchParams.page++
    searchQuestions()
  }
}

const prevPage = () => {
  if (searchParams.page > 1) {
    searchParams.page--
    searchQuestions()
  }
}

const getCourseLabel = (courseId: number) => {
  switch (courseId) {
    case 1:
      return '文化基础'
    case 2:
      return '专业基础'
    default:
      return '未知'
  }
}

const getTypeLabel = (typeId: number) => {
  switch (typeId) {
    case 0:
      return '单选题'
    case 1:
      return '多选题'
    case 2:
      return '判断题'
    case 8:
      return '阅读题'
    default:
      return `题型${typeId}`
  }
}

watch(keyword, (newVal) => {
  if (newVal.trim() !== '') {
    searchParams.page = 1
    debouncedSearch()
  } else {
    searchResults.value = []
  }
})

onMounted(() => {
  if (keyword.value.trim() !== '') {
    searchQuestions()
  }
})
</script>

<template>
  <div class="question-search-page">
    <div class="search-container">
      <div class="search-input-container">
        <UInput
          v-model="keyword"
          variant="none"
          class="search-field"
          placeholder="搜索题目内容..."
          @keyup.enter="searchQuestions"
        />
        <UButton
          icon="i-lucide-search"
          class="search-button"
          aria-label="搜索"
          @click="searchQuestions"
        >
          搜索
        </UButton>
      </div>

      <div class="search-filters" aria-label="搜索筛选条件">
        <USelect
          v-model="searchParams.course"
          :items="[
            { label: '所有课程', value: -1 },
            { label: '文化基础', value: 1 },
            { label: '专业基础', value: 2 },
          ]"
          @update:model-value="searchQuestions"
        />
        <USelect
          v-model="searchParams.type"
          :items="[
            { label: '所有题型', value: -1 },
            { label: '单选题', value: 0 },
            { label: '多选题', value: 1 },
            { label: '判断题', value: 2 },
            { label: '阅读题', value: 8 },
          ]"
          @update:model-value="searchQuestions"
        />
      </div>
    </div>

    <div class="search-results-container">
      <div class="search-loading" v-if="isLoading">
        <span>搜索中...</span>
      </div>

      <div class="no-results" v-else-if="!hasResults">
        <span>{{ keyword.trim() ? '没有找到相关题目' : '请输入关键词…' }}</span>
      </div>

      <template v-else>
        <div class="results-info">
          <span>共找到 {{ total }} 条结果</span>
        </div>

        <div class="results-list">
          <div
            v-for="result in searchResults"
            :key="result.pid"
            class="result-item"
            @click="goToQuestion(result.pid)"
          >
            <div class="result-metadata">
              <span class="result-pid">{{ result.pid }}</span>
              <span class="result-course">{{
                getCourseLabel(result.course)
              }}</span>
              <span class="result-type">{{ getTypeLabel(result.type) }}</span>
            </div>
            <div
              class="result-content"
              v-if="result.content_summary !== ''"
              v-html="result.content_summary"
            ></div>
            <div class="result-content" v-else>暂无内容</div>
          </div>
        </div>

        <div class="pagination" v-if="totalPages > 1">
          <UButton
            color="neutral"
            variant="outline"
            :disabled="searchParams.page <= 1"
            @click="prevPage"
            class="pagination-btn"
          >
            上一页
          </UButton>
          <span class="page-info"
            >{{ searchParams.page }} / {{ totalPages }}</span
          >
          <UButton
            color="neutral"
            variant="outline"
            :disabled="searchParams.page >= totalPages"
            @click="nextPage"
            class="pagination-btn"
          >
            下一页
          </UButton>
        </div>
      </template>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.question-search-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  padding: 0.5rem 1.25rem 2rem;

  .search-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 0 1rem;
    margin-bottom: 1rem;

    .search-input-container {
      width: 100%;
      max-width: 860px;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem;
      border: 1px solid var(--border-color-base--darker);
      border-radius: 9999px;
      background: var(--color-surface-0);
      box-shadow: 0 4px 18px hsla(var(--color-primary__h), 30%, 20%, 0.08);
      transition:
        border-color 180ms ease,
        box-shadow 180ms ease;

      &:focus-within {
        border-color: var(--color-primary);
        box-shadow:
          0 0 0 3px hsla(var(--color-primary__h), 55%, 48%, 0.14),
          0 6px 22px hsla(var(--color-primary__h), 30%, 20%, 0.1);
      }

      :deep(.search-field) {
        flex: 1;
        min-width: 0;
      }

      :deep(input) {
        width: 100%;
        min-height: 2.8rem;
        padding-inline: 1rem;
        font-size: 1.05rem;
      }

      .search-button {
        flex: 0 0 auto;
        min-height: 2.8rem;
        padding-inline: 1.25rem;
        border-radius: 9999px;
      }
    }

    .search-filters {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.75rem;

      :deep(button) {
        min-width: 9.5rem;
        justify-content: space-between;
      }
    }
  }

  .search-results-container {
    overflow: hidden;
    min-height: 200px;

    .search-loading,
    .no-results {
      padding: 4rem 1rem;
      text-align: center;
      color: var(--color-base--subtle);
      font-size: 16px;
    }

    .results-info {
      padding: 0.75rem 0.25rem;
      font-size: 14px;
      color: var(--color-base);
      border-bottom: 1px solid var(--border-color-base--darker);
    }

    .result-item {
      padding: 1rem 0.25rem;
      border-bottom: 1px solid var(--border-color-base--darker);
      cursor: pointer;
      transition: background-color 0.2s;

      &:hover {
        background-color: var(--border-color-base);
      }

      &:last-child {
        border-bottom: none;
      }

      .result-metadata {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        margin-bottom: 10px;
        font-size: 0.8125rem;

        .result-pid {
          color: var(--color-primary);
          font-weight: 600;
        }

        .result-course,
        .result-type {
          color: var(--color-base--subtle);
          font-size: 12px;
          border: 1px solid var(--border-color-base--darker);
          border-radius: 12px;
          padding: 2px 6px;
          margin-bottom: 0;
          background: transparent;
        }
      }

      .result-content {
        font-size: 15px;
        line-height: 1.6;

        :deep(mark) {
          background-color: #fffec1;
          border-radius: 2px;
          padding: 0 2px;
          font-weight: 500;
        }
      }
    }

    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
      gap: 15px;
      border-top: 1px solid var(--border-color-base--darker);

      .page-info {
        font-size: 14px;
        color: var(--color-base);
      }
    }
  }
}

@media screen and (max-width: 600px) {
  .question-search-page {
    padding-inline: 0.75rem;

    .search-container {
      padding: 0.75rem 0.25rem;

      .search-filters {
        :deep(button) {
          min-width: 8rem;
        }
      }
    }
  }
}
</style>
