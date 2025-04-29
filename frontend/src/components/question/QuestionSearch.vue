<script lang="ts" setup>
import { ref, reactive, watch, onMounted, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { debounce } from 'lodash'
import { useNotifyStore } from '@/stores/notify'

const router = useRouter()
const notifyStore = useNotifyStore()

const keyword = ref('')
const isLoading = ref(false)
// 移除 showResults - 我们总是显示结果区域
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

// Get course and subject names
const getCourseLabel = (courseId: number) => {
  switch (courseId) {
    case 1:
      return '文化课'
    case 2:
      return '专业课'
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

// Watchers
watch(keyword, (newVal) => {
  if (newVal.trim() !== '') {
    searchParams.page = 1 // Reset to first page on new search
    debouncedSearch()
  } else {
    searchResults.value = []
  }
})

// 移除不再需要的事件监听器
onMounted(() => {
  // 页面加载时立即执行一次搜索，如果有关键词的话
  if (keyword.value.trim() !== '') {
    searchQuestions()
  }
})
</script>

<template>
  <div class="question-search-page">
    <div class="search-container">
      <div class="search-input-container">
        <input type="text" v-model="keyword" placeholder="搜索题目内容..." />
        <div class="search-icon" @click="searchQuestions">
          <i class="fa fa-search"></i>
        </div>
      </div>

      <div class="search-filters">
        <select v-model="searchParams.course" @change="searchQuestions">
          <option value="-1">所有课程</option>
          <option value="1">文化课</option>
          <option value="2">专业课</option>
        </select>

        <select v-model="searchParams.type" @change="searchQuestions">
          <option value="-1">所有题型</option>
          <option value="1">单选题</option>
          <option value="2">多选题</option>
          <option value="3">判断题</option>
          <option value="8">组合题</option>
        </select>
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
          <button
            :disabled="searchParams.page <= 1"
            @click="prevPage"
            class="pagination-btn"
          >
            上一页
          </button>
          <span class="page-info"
            >{{ searchParams.page }} / {{ totalPages }}</span
          >
          <button
            :disabled="searchParams.page >= totalPages"
            @click="nextPage"
            class="pagination-btn"
          >
            下一页
          </button>
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
  margin: 0 auto;
  padding: 20px;

  .search-container {
    display: flex;
    flex-direction: column;
    gap: 15px;
    margin-bottom: 25px;

    .search-input-container {
      position: relative;
      width: 100%;

      input {
        width: 100%;
        padding: 12px 45px 12px 20px;
        border: 1px solid var(--border-color-base--darker);
        border-radius: 25px;
        font-size: 16px;
        outline: none;
        transition:
          border-color 0.2s,
          box-shadow 0.2s;

        &:focus {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px var(--background-color-primary--active);
        }
      }

      .search-icon {
        position: absolute;
        right: 18px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--color-base);
        cursor: pointer;

        &:hover {
          color: var(--color-primary);
        }
      }
    }

    .search-filters {
      display: flex;
      justify-content: center;
      gap: 15px;

      select {
        padding: 8px 15px;
        border: 1px solid #ddd;
        border-radius: 8px;
        outline: none;
        cursor: pointer;

        &:focus {
          border-color: var(--color-primary);
        }
      }
    }
  }

  .search-results-container {
    overflow: hidden;
    min-height: 200px;

    .search-loading,
    .no-results {
      padding: 30px;
      text-align: center;
      color: var(--color-base);
      font-size: 16px;
    }

    .results-info {
      padding: 15px 20px;
      font-size: 14px;
      color: var(--color-base);
      border-bottom: 1px solid var(--border-color-base--darker);
    }

    .result-item {
      padding: 20px;
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

      .pagination-btn {
        padding: 8px 16px;
        background: white;
        border: 1px solid var(--border-color-base--darker);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;

        &:hover:not(:disabled) {
          background: var(--border-color-base--darker);
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }

      .page-info {
        font-size: 14px;
        color: var(--color-base);
      }
    }
  }
}
</style>
