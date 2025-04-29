<script lang="ts" setup>
import {
  ref,
  computed,
  watch,
  nextTick,
  onMounted,
  onBeforeUnmount,
  onBeforeMount,
} from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import * as _ from 'lodash-es'

import { get, post } from '@/api/api'
import { debounce } from '@/utils/debounce'

import { useUserStore } from '@/stores/user'
import { useQuestionStore } from '@/stores/question'
import { useNotifyStore } from '@/stores/notify'
import { useCardStore } from '@/stores/card'

const route = useRoute()
const router = useRouter()

const isDirectQuestionMode = ref(false)
const directQuestion = ref<Question | null>(null)

const userStore = useUserStore()
const questionStore = useQuestionStore()
const notifyStore = useNotifyStore()

interface UserSetting {
  course: number
  subject: number
  type: number
  sort_column: string
  order: string
}

interface Option {
  id: number
  xx?: string
  txt: string
  tg?: string
  list?: SubOption[]
}

interface SubOption {
  id: number
  xx?: string
  txt: string
}

interface Question {
  index: number
  unique_code: string
  pid: string
  content: string
  type: number
  options: Option[]
  sub_options: Option[] | null
  answer: string[]
  subject: number
  course: number
  created_time: string
  updated_time: string
  crawl_time: string
  done_count: number
  incorrect_count: number
  status: boolean
  crawl_count: number
}

interface QuestionsResponse {
  questions: Question[]
  offset_pid: string
  stat: {
    course: number | null
    subject: number
    type: number
    order: string
    sort_column: string
    total_questions: number
  }
}

const userSetting = ref<UserSetting>({
  course: 1,
  subject: -1,
  type: -1,
  sort_column: 'pid',
  order: 'asc',
})

const wrongSubject = ref<number | null>(null)
const isLoadingWrongQuestions = ref<boolean>(false)
const wrongQuestionPids = ref<string[]>([])

const lastUserSetting = ref<UserSetting>({
  course: 1,
  subject: -1,
  type: -1,
  sort_column: 'pid',
  order: 'asc',
})

const isDone = ref<boolean>(false)
const doneStatus = ref<string[]>([])

const isMark = ref<boolean>(false)

const questions = ref<Question[]>([])
const questionsInfo = ref<QuestionsResponse['stat']>({
  course: 1,
  subject: -1,
  type: -1,
  order: 'asc',
  sort_column: 'pid',
  total_questions: 0,
})

const sequence = ref<string[]>([])
const nextPid = ref<string | null>(null)
const prevPid = ref<string | null>(null)

const currentId = ref<number>(1)
const isLoadQuestion = ref<boolean>(false)
const reloadCount = ref<number>(0)

const isSheetsActive = ref<boolean>(false)
const questionRefs = ref<(HTMLElement | null)[]>([])

const minIndex = ref<number>(1)
const maxIndex = ref<number>(1)

const userChoice = ref<string[] | string[][]>([])

const showAnswer = ref<boolean>(true)
const isAnswerCorrect = ref<boolean>(false)

const showQuestionDetail = ref<boolean>(false)

const isFirstLoad = ref<boolean>(true)

const renderMode = ref<string>('single')

const changeRenderMode = (mode: string) => {
  if (mode !== 'single' && mode !== 'list') {
    return
  }

  renderMode.value = mode
  saveRenderMode()
}

const saveUserSetting = (): void => {
  localStorage.setItem('view_user_setting', JSON.stringify(userSetting.value))
}

const readUserSetting = (): UserSetting | null => {
  const response: string | null = localStorage.getItem('view_user_setting')
  if (response === null) {
    return null
  }
  return JSON.parse(response)
}

const savedSetting = readUserSetting()

if (savedSetting !== null) {
  userSetting.value = savedSetting
}

const saveRenderMode = (): void => {
  localStorage.setItem('view_render_mode', JSON.stringify(renderMode.value))
}

const readRenderMode = (): string | null => {
  const response: string | null = localStorage.getItem('view_render_mode')
  if (response === null) {
    return null
  }
  return JSON.parse(response)
}

const savedRenderMode = readRenderMode()

if (
  savedRenderMode !== null &&
  (savedRenderMode == 'list' || savedRenderMode == 'single')
) {
  renderMode.value = savedRenderMode
} else {
  saveRenderMode()
}

const renderQuestionCourse = (course: number | null) => {
  if (!course) return
  const result = questionStore.renderQuestionCourse(course)
  return result
}

const renderQuestionSubject = (course: number, subject: number) => {
  const result = questionStore.renderQuestionSubject(course, subject)
  return result
}

const renderQuestionType = (type: number) => {
  const result = questionStore.renderQuestionType(type)
  return result
}

const addQuestion = (newQuestions: any[]) => {
  newQuestions.forEach((newQuestion) => {
    const exists = questions.value.some((q) => q.index === newQuestion.index)

    if (!exists) {
      questions.value.push(newQuestion)
    }
  })

  questions.value.sort((a, b) => a.index - b.index)
}

const loadWrongQuestionRange = async (startIndex: number, endIndex: number) => {
  if (userSetting.value.course !== 3 || !wrongQuestionPids.value.length) return

  const batchPids = wrongQuestionPids.value.slice(startIndex, endIndex)

  const newQuestions = await Promise.all(
    batchPids.map(async (pid, index) => {
      try {
        const response: any = await get(`/question/${pid}`)
        if (response.data.code === 200) {
          return {
            ...response.data.data,
            index: startIndex + index + 1,
          }
        }
        return null
      } catch (error) {
        console.error(`Failed to fetch question ${pid}:`, error)
        return null
      }
    }),
  )

  const validQuestions = newQuestions.filter((q) => q !== null)

  validQuestions.forEach((newQuestion) => {
    const existingIndex = questions.value.findIndex(
      (q) => q.pid === newQuestion.pid,
    )
    if (existingIndex !== -1) {
      questions.value[existingIndex] = newQuestion
    } else {
      questions.value.push(newQuestion)
    }
  })

  questions.value.sort((a, b) => a.index - b.index)
}

const loadMoreWrongQuestions = async (startIndex: number) => {
  if (userSetting.value.course !== 3 || !wrongQuestionPids.value.length) return

  isLoadingWrongQuestions.value = true

  const batchSize = 10
  const endIndex = Math.min(
    startIndex + batchSize,
    wrongQuestionPids.value.length,
  )
  const batchPids = wrongQuestionPids.value.slice(startIndex, endIndex)

  const newQuestions = await Promise.all(
    batchPids.map(async (pid, index) => {
      try {
        const response: any = await get(`/question/${pid}`)
        if (response.data.code === 200) {
          return {
            ...response.data.data,
            index: startIndex + index + 1,
          }
        }
        return null
      } catch (error) {
        console.error(`Failed to fetch question ${pid}:`, error)
        return null
      }
    }),
  )

  const validQuestions = newQuestions.filter((q) => q !== null)

  addQuestion(validQuestions)

  nextPid.value =
    endIndex < wrongQuestionPids.value.length
      ? wrongQuestionPids.value[endIndex]
      : null
  prevPid.value =
    startIndex > 0 ? wrongQuestionPids.value[startIndex - 1] : null

  isLoadingWrongQuestions.value = false
}

const getQuestions = async (params?: any, callback?: any) => {
  isLoadQuestion.value = true

  if (userSetting.value.course === 3) {
    try {
      isLoadingWrongQuestions.value = true

      const wrongItems = await userStore.getFolderContent('wrong')

      let filteredItems = wrongItems
      if (wrongSubject.value !== -1) {
        filteredItems = wrongItems.filter(
          (item) => item.course === wrongSubject.value,
        )
      }

      if (userSetting.value.subject !== -1) {
        filteredItems = filteredItems.filter(
          (item) => item.subject === userSetting.value.subject,
        )
      }

      if (userSetting.value.type !== -1) {
        filteredItems = filteredItems.filter(
          (item) => item.type === userSetting.value.type,
        )
      }

      if (filteredItems.length === 0) {
        notifyStore.addMessage('failed', '没有找到符合条件的错题记录')
        questions.value = []
        sequence.value = []
        questionsInfo.value.total_questions = 0
        isLoadQuestion.value = false
        isLoadingWrongQuestions.value = false
        return
      }

      if (userSetting.value.sort_column === 'wrong_time') {
        filteredItems.sort((a, b) => {
          const timeA = dayjs(a.time || 0)
          const timeB = dayjs(b.time || 0)
          return userSetting.value.order === 'asc'
            ? timeA.diff(timeB)
            : timeB.diff(timeA)
        })
      } else if (userSetting.value.sort_column === 'pid') {
        filteredItems.sort((a, b) => {
          const pidA = parseInt(a.pid, 10) || 0
          const pidB = parseInt(b.pid, 10) || 0
          return userSetting.value.order === 'asc' ? pidA - pidB : pidB - pidA
        })
      }

      wrongQuestionPids.value = filteredItems.map((item) => item.pid)
      sequence.value = wrongQuestionPids.value
      questionsInfo.value = {
        course: wrongSubject.value,
        subject: userSetting.value.subject,
        type: userSetting.value.type,
        order: userSetting.value.order,
        sort_column: userSetting.value.sort_column,
        total_questions: wrongQuestionPids.value.length,
      }

      if (params?.index !== undefined) {
        const requestedIndex = params.index

        if (
          requestedIndex <= 0 ||
          requestedIndex > wrongQuestionPids.value.length
        ) {
          notifyStore.addMessage(
            'failed',
            `索引超出范围：${requestedIndex}，最大索引：${wrongQuestionPids.value.length}`,
          )
          isLoadQuestion.value = false
          isLoadingWrongQuestions.value = false
          return
        }

        const requestedPid = wrongQuestionPids.value[requestedIndex - 1]

        try {
          const response: any = await get(`/question/${requestedPid}`)
          if (response.data.code === 200) {
            const question = {
              ...response.data.data,
              index: requestedIndex,
            }

            const existingQuestionIndex = questions.value.findIndex(
              (q) => q.pid === requestedPid,
            )
            if (existingQuestionIndex !== -1) {
              questions.value[existingQuestionIndex] = question
            } else {
              questions.value.push(question)
            }

            nextPid.value =
              requestedIndex < wrongQuestionPids.value.length
                ? wrongQuestionPids.value[requestedIndex]
                : null
            prevPid.value =
              requestedIndex > 1
                ? wrongQuestionPids.value[requestedIndex - 2]
                : null

            const preloadCount = 2
            const startIdx = Math.max(0, requestedIndex - preloadCount - 1)
            const endIdx = Math.min(
              wrongQuestionPids.value.length,
              requestedIndex + preloadCount,
            )

            await loadWrongQuestionRange(startIdx, endIdx)
          }
        } catch (error) {
          console.error(`Failed to fetch question ${requestedPid}:`, error)
          notifyStore.addMessage('failed', `加载题目失败：${error}`)
        }

        isLoadQuestion.value = false
        isLoadingWrongQuestions.value = false

        if (callback) {
          callback()
        }

        return
      } else if (!questions.value.length) {
        const firstBatchPids = wrongQuestionPids.value.slice(0, 10)
        const wrongQuestions = await Promise.all(
          firstBatchPids.map(async (pid, index) => {
            try {
              const response: any = await get(`/question/${pid}`)
              if (response.data.code === 200) {
                return {
                  ...response.data.data,
                  index: index + 1,
                }
              }
              return null
            } catch (error) {
              console.error(`Failed to fetch question ${pid}:`, error)
              return null
            }
          }),
        )

        const validQuestions = wrongQuestions.filter((q) => q !== null)
        questions.value = validQuestions

        nextPid.value =
          wrongQuestionPids.value.length > 10
            ? wrongQuestionPids.value[10]
            : null
        prevPid.value = null
      }

      isLoadQuestion.value = false
      isLoadingWrongQuestions.value = false

      if (callback) {
        callback()
      }

      return
    } catch (error) {
      console.error('Error loading wrong questions:', error)
      notifyStore.addMessage('failed', `加载错题异常：${error}`)
      isLoadQuestion.value = false
      isLoadingWrongQuestions.value = false
      return
    }
  }

  const sendParams = {
    course: userSetting.value.course,
    subject: userSetting.value.subject,
    type: userSetting.value.type,
    sort_column: userSetting.value.sort_column,
    order: userSetting.value.order,
    ...params,
  }

  try {
    const response: any = await get('/question/practice', sendParams)

    if (response.data.data.questions.length === 0) {
      notifyStore.addMessage(
        'failed',
        `有没有可能，${renderQuestionSubject(userSetting.value.course, questionsInfo.value.subject) ?? '它'}根本就没有${renderQuestionType(userSetting.value.type) ?? '这个'}`,
      )
      userSetting.value = lastUserSetting.value
      setTimeout(() => {
        getQuestions()
      }, 3000)
    } else {
      saveUserSetting()
      addQuestion(response.data.data.questions)
    }

    sequence.value = response.data.data.sequence
    questionsInfo.value = response.data.data.stat
    nextPid.value = response.data.data.next_pid
    prevPid.value = response.data.data.prev_pid

    if (callback) {
      callback()
    }
  } catch (error) {
    if (reloadCount.value <= 5) {
      reloadCount.value++
      setTimeout(() => {
        getQuestions
      }, 500)
    } else {
      reloadCount.value = 0
      notifyStore.addMessage('success', '无法请求题库信息，请检查网络连接。')
    }
  } finally {
    isLoadQuestion.value = false
  }
}

const debouncedGetQuestions = debounce((params?: any, callback?: any) => {
  getQuestions(params, callback)
}, 500)

const checkRouteParams = async () => {
  const pid = route.params.pid
  if (pid && typeof pid === 'string') {
    try {
      isDirectQuestionMode.value = true
      isLoadQuestion.value = true
      
      const response: any = await get(`/question/${pid}`)

      if (response.data.code === 200 && response.data.data) {
        directQuestion.value = {
          ...response.data.data,
          index: 1,
        }
        
        resetQuestionComplete()
      } else {
        notifyStore.addMessage('failed', `未找到题目: ${pid}`)
        exitDirectMode()
      }
    } catch (error) {
      console.error('Error loading question by PID:', error)
      notifyStore.addMessage('failed', `加载题目失败: ${error}`)
      exitDirectMode()
    } finally {
      isLoadQuestion.value = false
    }
  } else {
    isDirectQuestionMode.value = false
    directQuestion.value = null
  }
}

const exitDirectMode = () => {
  isDirectQuestionMode.value = false
  directQuestion.value = null
  router.push('/view')

  if (questions.value.length === 0) {
    getQuestions()
  }
}

const currentQuestion = computed(() => {
  if (isDirectQuestionMode.value && directQuestion.value) {
    return directQuestion.value
  }
  return (
    questions.value.find((question) => question.index === currentId.value) ||
    null
  )
})

const resetQuestionComplete = () => {
  showAnswer.value = true
  userChoice.value = []
}

const prevQuestion = () => {
  resetQuestionComplete()

  const previousQuestion = questions.value
    .filter((q) => q.index < currentId.value)
    .sort((a, b) => b.index - a.index)[0]

  if (previousQuestion) {
    currentId.value = previousQuestion.index
  } else if (currentId.value > 1) {
    debouncedGetQuestions({ index: currentId.value - 1 }, () => {
      const newPreviousQuestion = questions.value
        .filter((q) => q.index < currentId.value)
        .sort((a, b) => b.index - a.index)[0]
      if (newPreviousQuestion) {
        currentId.value = newPreviousQuestion.index
      }
    })
  }
}

const nextQuestion = () => {
  resetQuestionComplete()

  if (userSetting.value.course === 3) {
    const nextQuestion = questions.value
      .filter((q) => q.index > currentId.value)
      .sort((a, b) => a.index - b.index)[0]

    if (nextQuestion) {
      currentId.value = nextQuestion.index
    } else if (currentId.value < wrongQuestionPids.value.length) {
      loadMoreWrongQuestions(questions.value.length).then(() => {
        const newNextQuestion = questions.value
          .filter((q) => q.index > currentId.value)
          .sort((a, b) => a.index - b.index)[0]
        if (newNextQuestion) {
          currentId.value = newNextQuestion.index
        }
      })
    }
    return
  }

  const nextQuestion = questions.value
    .filter((q) => q.index > currentId.value)
    .sort((a, b) => a.index - b.index)[0]

  if (nextQuestion) {
    currentId.value = nextQuestion.index
  } else if (currentId.value < questions.value.length) {
    debouncedGetQuestions({ index: currentId.value + 1 }, () => {
      const newNextQuestion = questions.value
        .filter((q) => q.index > currentId.value)
        .sort((a, b) => a.index - b.index)[0]
      if (newNextQuestion) {
        currentId.value = newNextQuestion.index
      }
    })
  }
}

const activeSheets = () => {
  isSheetsActive.value = !isSheetsActive.value
}

watch(isSheetsActive, (newVal) => {
  if (newVal) {
    nextTick(() => {
      const currentElement = questionRefs.value[currentId.value - 1]
      if (currentElement) {
        currentElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'start',
        })
      }
    })
  }
})

const toQuestionByIndex = (indexNumber: number) => {
  if (questions.value.some((q) => q.index === indexNumber)) {
    currentId.value = indexNumber
    isSheetsActive.value = false
  } else {
    isLoadQuestion.value = true

    if (userSetting.value.course === 3) {
      getQuestions({
        index: indexNumber,
      })
        .then(() => {
          currentId.value = indexNumber
          isSheetsActive.value = false
        })
        .finally(() => {
          isLoadQuestion.value = false
        })
    } else {
      debouncedGetQuestions(
        {
          index: indexNumber,
        },
        () => {
          currentId.value = indexNumber
          debouncedGetQuestions(
            {
              next_pid: nextPid.value,
            },
            () => {
              currentId.value = indexNumber
            },
          )
        },
      )
    }
  }
}

watch(wrongSubject, () => {
  if (userSetting.value.course === 3) {
    questions.value = []
    currentId.value = 1
    debouncedGetQuestions()
  }
})

watch(
  () => userSetting.value.course,
  (newVal, oldVal) => {
    if (oldVal === 3 && newVal !== 3) {
      wrongSubject.value = null
    } else if (newVal === 3 && !wrongSubject.value) {
      wrongSubject.value = -1
    }
  },
)

const debouncedWatchHandler = debounce((newVal, oldVal) => {
  const indices = questions.value.map((q) => q.index)
  minIndex.value = Math.min(...indices)
  maxIndex.value = Math.max(...indices)

  if (maxIndex.value - newVal <= 5 && nextPid.value) {
    if (maxIndex.value < questionsInfo.value.total_questions) {
      debouncedGetQuestions({ next_pid: nextPid.value })
    }
  }

  if (newVal - minIndex.value > 20) {
    questions.value = questions.value.filter((q) => q.index >= newVal - 20)
  }

  if (newVal - minIndex.value < 5 && prevPid.value) {
    if (minIndex.value > 1) {
      debouncedGetQuestions({ prev_pid: prevPid.value })
    }
  }
}, 750)

watch(currentId, async (newVal, oldVal) => {
  if (!sequence.value || !sequence.value[newVal - 1]) {
    return
  }

  const currentPid = sequence.value[newVal - 1]
  const progressData = (await userStore.getAllProgress()) || []

  doneStatus.value =
    progressData.length > 0 ? progressData.map((progress) => progress.pid) : []

  if (!doneStatus.value.includes(currentPid)) {
    doneStatus.value.push(currentPid)
  }

  debouncedWatchHandler(newVal, oldVal)
})

const addChoice = (id: number, type?: string, subOptionId?: number) => {
  const stringId = id.toString()

  if (type === 'sub_options' && subOptionId !== undefined) {
    if (!Array.isArray(userChoice.value[subOptionId - 1])) {
      ;(userChoice.value as string[][])[subOptionId - 1] = []
    }

    const subChoiceArray = (userChoice.value as string[][])[subOptionId - 1]

    const indexInSub = subChoiceArray.indexOf(stringId)

    if (indexInSub === -1) {
      subChoiceArray.push(stringId)
    } else {
      subChoiceArray.splice(indexInSub, 1)
    }
  } else {
    const index = (userChoice.value as string[]).indexOf(stringId)

    if (index === -1) {
      ;(userChoice.value as string[]).push(stringId)
    } else {
      ;(userChoice.value as string[]).splice(index, 1)
    }
  }
}

const checkAnswerCorrect = () => {
  return _.isEqual(
    _.sortBy(userChoice.value),
    _.sortBy(currentQuestion.value?.answer || []),
  )
}

const isArrayEmpty = (arr: string[] | string[][]): Boolean => {
  return (
    _.isEmpty(arr) ||
    arr.every((item) => Array.isArray(item) && isArrayEmpty(item))
  )
}

const renderAnswerNumber = (
  type: number,
  answer: string[] | string[][],
  options: { id: number; xx?: string; txt: string }[],
  subOptions?: Option[] | null,
) => {
  if (type === 2) {
    return (answer as string[])
      .map((a) => {
        const option = options.find((opt) => opt.id.toString() === a)
        if (option) {
          return option.txt === '对' ? 'T' : 'F'
        }
        return ''
      })
      .join('')
  }

  if (Array.isArray(answer[0])) {
    return (answer as string[][])
      .map((subAnswer, index) => {
        const currentSubOptions =
          subOptions && subOptions[index] ? subOptions[index].list || [] : []
        return subAnswer
          .map((a) => {
            const option = currentSubOptions.find(
              (opt) => opt.id.toString() === a,
            )
            return option?.xx || ''
          })
          .join('')
      })
      .join('-')
  } else {
    return (answer as string[])
      .map((a) => options.find((opt) => opt.id.toString() === a)?.xx || '')
      .sort()
      .join('')
  }
}

const checkAnswer = () => {
  showAnswer.value = true
  isAnswerCorrect.value = checkAnswerCorrect() ? true : false
}

const showQuestionAnswer = () => {
  showAnswer.value = !showAnswer.value
}

watch(
  () => JSON.parse(JSON.stringify(userSetting.value)),
  (newVal, oldVal) => {
    if (newVal.course !== oldVal.course) {
      userSetting.value.subject = -1
      userSetting.value.type = -1
    }

    debouncedGetQuestions()
    lastUserSetting.value = oldVal
    questions.value = []
    currentId.value = 1
  },
  {
    deep: true,
  },
)

const handleKeydown = (event: KeyboardEvent) => {
  if (renderMode.value === 'single') {
    const cardStore = useCardStore()
    if (!cardStore.isViewContainerOn()) {
      switch (event.key) {
        case 'ArrowLeft':
          prevQuestion()
          break
        case 'ArrowRight':
          nextQuestion()
          break
        default:
          break
      }
    }
  }
}

const updateQuestionDetail = () => {
  showQuestionDetail.value = !showQuestionDetail.value
}

watch(
  currentQuestion,
  async (newQuestion) => {
    if (newQuestion && newQuestion.pid) {
      isDone.value = await userStore.isProgress(newQuestion.pid)
      isMark.value = await userStore.isStar(newQuestion.pid)
    } else {
      isDone.value = false
      isMark.value = false
    }
  },
  { immediate: true },
)

const formatMileTimestamp = (timestamp: string | number): string => {
  return dayjs(Number(timestamp)).format('YYYY-MM-DD HH:mm:ss')
}

const questionAccuracy = (done: number, incorrect: number): number => {
  if (done === 0) {
    return 0
  }

  return Number(((done - incorrect) / done).toFixed(2)) * 100
}

const modeLoadDoneStatus = async (newVal: string = renderMode.value) => {
  const progressData = await userStore.getAllProgress()
  doneStatus.value = progressData.map((progress) => progress.pid)
}

watch(renderMode, (newVal) => {
  modeLoadDoneStatus(newVal)
})

const handleListScroll = (event: any) => {
  const container = event.target as HTMLElement
  const scrollTop = container.scrollTop
  const containerHeight = container.clientHeight
  const contentHeight = container.scrollHeight

  if (scrollTop + containerHeight >= contentHeight - 10) {
    loadMoreQuestions()
  }

  if (scrollTop <= 10 && prevPid.value) {
    loadPreviousQuestions()
  }
}

const loadMoreQuestions = (): void => {
  if (nextPid.value) {
    debouncedGetQuestions({ next_pid: nextPid.value }, () => {
      if (questions.value.length > 50) {
        questions.value.splice(0, questions.value.length - 50)
      }
    })
  }
}

const loadPreviousQuestions = (): void => {
  if (prevPid.value) {
    debouncedGetQuestions({ prev_pid: prevPid.value })
  }
}

const isQuestionDoneProgress = (pid: string): Boolean => {
  return doneStatus.value.includes(pid)
}

watch(
  () => route.path,
  async () => {
    await checkRouteParams()
  },
  { immediate: true },
)

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  await checkRouteParams()

  if (!isDirectQuestionMode.value) {
    getQuestions()
  }

  modeLoadDoneStatus()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div
    class="question-render-wrapper"
    :class="{ loading: isLoadQuestion && questions.length <= 0 }"
  >
    <div
      class="question-single-mode question-mode"
      v-if="renderMode === 'single' || isDirectQuestionMode"
    >
      <div
        class="question-render-info"
        v-if="(!isLoadQuestion || questions.length > 0) && currentQuestion"
      >
        <div class="question-render-info__subject">
          {{ renderQuestionCourse(currentQuestion?.course) }}
        </div>
        <div class="question-render-info__status" v-if="!isDirectQuestionMode">
          <div
            class="question-render-info__direction question-render-info__previous"
            @click="prevQuestion"
          >
            <span class="material-icons">keyboard_arrow_left</span>
          </div>
          <div class="question-render-info__current">
            <span class="now">{{ currentQuestion?.index }}</span
            >/<span class="max">{{ questionsInfo?.total_questions }}</span>
          </div>
          <div
            class="question-render-info__direction question-render-info__next"
            @click="nextQuestion"
          >
            <span class="material-icons">keyboard_arrow_right</span>
          </div>
        </div>
        <div class="direct-mode-bar" v-else>
          <div class="direct-mode-info">
            <span class="material-icons">info</span>
            <span>当前正在查看单题模式</span>
          </div>
        </div>
        <div
          class="question-render-info__id"
          @click="activeSheets"
          v-tippy="{ appendTo: 'parent', content: '题目在船政系统里面的编号' }"
        >
          {{ currentQuestion?.pid }}
        </div>
        <div
          class="question-render-info__sheets"
          :class="{ active: isSheetsActive }"
           v-if="!isDirectQuestionMode"
        >
          <div class="question-render-info__title">答题卡</div>
          <div class="question-render-info__wrapper">
            <div
              class="question-render-info__sheet"
              v-for="n in questionsInfo?.total_questions"
              :key="n"
              :ref="(el) => (questionRefs[n - 1] = el as HTMLElement)"
              :class="{
                current: currentId === n,
                done: doneStatus.includes(sequence[n - 1]),
              }"
              @click="toQuestionByIndex(n)"
              :pid="sequence[n - 1]"
            >
              {{ n }}
            </div>
          </div>
        </div>
      </div>
      <div class="question-render-questions">
        <div
          class="question-render-question"
          v-if="(!isLoadQuestion || questions.length > 0) && currentQuestion"
        >
          <div
            class="question-loading-near"
            v-if="isLoadQuestion && questions.length > 0"
          >
            {{ minIndex }} ~ {{ maxIndex
            }}<span class="material-icons">autorenew</span>
          </div>
          <div class="question-type">
            {{ renderQuestionType(currentQuestion?.type ?? 0) }}
          </div>
          <div class="question-content" v-html="currentQuestion?.content"></div>
          <div
            class="question-options"
            v-if="currentQuestion && currentQuestion.options"
          >
            <div
              class="question-option"
              v-for="option in currentQuestion?.options"
              :key="option.id"
              :class="{
                selected:
                  Array.isArray(userChoice) &&
                  userChoice.flat().includes(option.id.toString()),
                answer:
                  showAnswer &&
                  currentQuestion.answer.includes(option.id.toString()),
                error:
                  showAnswer &&
                  !currentQuestion.answer.includes(option.id.toString()) &&
                  Array.isArray(userChoice) &&
                  userChoice.flat().includes(option.id.toString()),
              }"
            >
              <div class="question-option-number">
                {{
                  currentQuestion?.type !== 2
                    ? option.xx
                    : option.txt === '对'
                      ? 'T'
                      : 'F'
                }}
              </div>
              <div class="question-option-content" v-html="option.txt"></div>
            </div>
          </div>
          <div class="question-sub-options" v-else>
            <div
              class="question-sub-option"
              v-for="(sub_option, index) in currentQuestion?.sub_options"
              :key="index"
            >
              <div
                class="question-sub-option__content"
                v-html="sub_option.tg"
              ></div>
              <div
                class="question-option"
                v-for="option in sub_option.list"
                :key="option.id"
                :class="{
                  selected:
                    Array.isArray(userChoice[index]) &&
                    userChoice[index].includes(option.id.toString()),
                  answer:
                    showAnswer &&
                    currentQuestion.answer[index].includes(
                      option.id.toString(),
                    ),
                  error:
                    !currentQuestion.answer[index].includes(
                      option.id.toString(),
                    ) &&
                    userChoice[index] &&
                    userChoice[index].includes(option.id.toString()),
                }"
              >
                <div class="question-option-number">
                  {{
                    currentQuestion?.type !== 2
                      ? option.xx
                      : option.txt === '对'
                        ? 'T'
                        : 'F'
                  }}
                </div>
                <div class="question-option-content" v-html="option.txt"></div>
              </div>
            </div>
          </div>
        </div>
        <div class="question-render-loading" v-else>
          <span class="material-icons">autorenew</span>
        </div>
      </div>
    </div>
    <div class="question-list-mode question-mode" v-else>
      <div
        class="question-render-questions"
        v-if="!isLoadQuestion || questions.length > 0"
        @scroll="handleListScroll"
      >
        <div
          class="question-render-question"
          v-for="question in questions"
          :key="question.index"
        >
          <div class="question-info">
            <div class="question-progress material-icons">
              {{
                isQuestionDoneProgress(question.pid)
                  ? 'check_circle'
                  : 'check_circle_outline'
              }}
            </div>
            <div class="question-index">{{ question.index }}</div>
            <div class="question-pid">{{ question.pid }}</div>
            <div class="question-type">
              {{ renderQuestionType(question.type) }}
            </div>
          </div>
          <div class="question-content" v-html="question.content"></div>
          <div class="question-options" v-if="question.options">
            <div
              class="question-option"
              v-for="option in question.options"
              :key="option.id"
              :class="{
                selected:
                  Array.isArray(userChoice) &&
                  userChoice.flat().includes(option.id.toString()),
                answer:
                  showAnswer && question.answer.includes(option.id.toString()),
                error:
                  showAnswer &&
                  !question.answer.includes(option.id.toString()) &&
                  Array.isArray(userChoice) &&
                  userChoice.flat().includes(option.id.toString()),
              }"
            >
              <div class="question-option-number">
                {{
                  question.type !== 2
                    ? option.xx
                    : option.txt === '对'
                      ? 'T'
                      : 'F'
                }}
              </div>
              <div class="question-option-content" v-html="option.txt"></div>
            </div>
          </div>

          <div class="question-sub-options" v-else>
            <div
              class="question-sub-option"
              v-for="(sub_option, index) in question.sub_options"
              :key="index"
            >
              <div
                class="question-sub-option__content"
                v-html="sub_option.tg"
              ></div>
              <div
                class="question-option"
                v-for="option in sub_option.list"
                :key="option.id"
                :class="{
                  selected:
                    Array.isArray(userChoice[index]) &&
                    userChoice[index].includes(option.id.toString()),
                  answer:
                    showAnswer &&
                    question.answer[index].includes(option.id.toString()),
                  error:
                    !question.answer[index].includes(option.id.toString()) &&
                    userChoice[index] &&
                    userChoice[index].includes(option.id.toString()),
                }"
              >
                <div class="question-option-number">
                  {{
                    question.type !== 2
                      ? option.xx
                      : option.txt === '对'
                        ? 'T'
                        : 'F'
                  }}
                </div>
                <div class="question-option-content" v-html="option.txt"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="question-render-loading" v-else>
        <span class="material-icons">autorenew</span>
      </div>
    </div>
    <div class="question-render-tools">
      <div
        class="question-answer"
        v-if="!isArrayEmpty(userChoice) && currentQuestion"
      >
        <div class="question-answer-infos">
          <div
            class="question-answer-user question-answer-info"
            v-if="showAnswer"
          >
            <div
              class="question-answer-user__label question-answer-info__label"
            >
              你的答案
            </div>
            <div
              class="question-answer-user__answer question-answer-info__answer"
              :class="{ error: !isAnswerCorrect }"
              v-if="currentQuestion && currentQuestion.options"
            >
              {{
                renderAnswerNumber(
                  currentQuestion?.type,
                  userChoice,
                  currentQuestion?.options || [],
                )
              }}
            </div>
            <div
              class="question-answer-user__answer question-answer-info__answer"
              :class="{ error: !isAnswerCorrect }"
              v-else
            >
              {{
                renderAnswerNumber(
                  currentQuestion?.type,
                  userChoice,
                  [],
                  currentQuestion?.sub_options || [],
                )
              }}
            </div>
          </div>
          <div
            class="question-answer-system question-answer-info"
            v-if="showAnswer"
          >
            <div
              class="question-answer-system__label question-answer-info__label"
            >
              正确答案
            </div>
            <div
              class="question-answer-system__answer question-answer-info__answer"
              v-if="currentQuestion && currentQuestion.options"
            >
              {{
                renderAnswerNumber(
                  currentQuestion?.type,
                  currentQuestion?.answer || [],
                  currentQuestion?.options || [],
                )
              }}
            </div>
            <div
              class="question-answer-system__answer question-answer-info__answer"
              v-else
            >
              {{
                renderAnswerNumber(
                  currentQuestion?.type,
                  currentQuestion?.answer || [],
                  [],
                  currentQuestion?.sub_options || [],
                )
              }}
            </div>
          </div>
        </div>
      </div>
      <div class="question-render-tools__options">
        <button
          v-if="isDirectQuestionMode"
          @click="exitDirectMode"
          class="exit-direct-mode-btn"
        >
          退出单题模式
        </button>
        <select
          class="question-render-tools__option"
          v-model="userSetting.course"
          content="课程类型"
          v-tippy="{ appendTo: 'parent' }"
          :disabled="isDirectQuestionMode"
        >
          <option :value="1">文化课</option>
          <option :value="2">专业课</option>
          <option :value="3">错题</option>
        </select>
        <select
          v-if="userSetting.course === 3"
          v-model="wrongSubject"
          :disabled="isDirectQuestionMode"
        >
          <option :value="-1">所有课程</option>
          <option :value="1">文化课</option>
          <option :value="2">专业课</option>
        </select>
        <select
          class="question-render-tools__option"
          v-model="userSetting.subject"
          v-if="
            (userSetting.course !== 3 && !questionStore.isGetQuestionInfo) ||
            (userSetting.course === 3 && wrongSubject !== -1)
          "
          content="科目"
          v-tippy="{ appendTo: 'parent' }"
          :disabled="isDirectQuestionMode"
        >
          <option value="-1">所有科目</option>
          <option
            v-for="subject in questionStore.questionInfo[
              userSetting.course === 1 || wrongSubject === 1
                ? 'cultural_lesson'
                : 'profession_lesson'
            ]"
            :value="subject.subject"
            :key="subject.subject"
          >
            {{ subject.name }}
          </option>
        </select>
        <select
          class="question-render-tools__option"
          v-model="userSetting.type"
          content="题型"
          v-tippy="{ appendTo: 'parent' }"
          :disabled="isDirectQuestionMode"
        >
          <option :value="-1">所有题型</option>
          <option :value="0">单选题</option>
          <option :value="1">多选题</option>
          <option :value="2">判断题</option>
          <option :value="8">阅读题</option>
        </select>
        <select
          class="question-render-tools__option"
          v-model="userSetting.sort_column"
          content="排序列"
          v-tippy="{ appendTo: 'parent' }"
          :disabled="isDirectQuestionMode"
        >
          <option value="pid">题目编号</option>
          <option value="crawl_count" v-if="userSetting.course !== 3">
            出现概率
          </option>
          <option value="wrong_time" v-if="userSetting.course === 3">
            做错时间
          </option>
        </select>
        <select
          class="question-render-tools__option"
          v-model="userSetting.order"
          content="排序方式"
          v-tippy="{ appendTo: 'parent' }"
          :disabled="isDirectQuestionMode"
        >
          <option value="asc">升序</option>
          <option value="desc">降序</option>
        </select>
      </div>
      <div class="question-render-tools__buttons">
        <div
          class="question-render-tools__button non-clickable material-icons"
          v-if="renderMode === 'single'"
          content="做没做过这题"
          v-tippy="{ appendTo: 'parent' }"
        >
          {{ isDone ? 'check_circle' : 'check_circle_outline' }}
        </div>
        <div
          class="question-render-tools__button non-clickable material-icons"
          v-if="renderMode === 'single'"
          content="收藏"
          v-tippy="{ appendTo: 'parent' }"
        >
          {{ isMark ? 'bookmark' : 'bookmark_border' }}
        </div>
        <div
          class="question-render-tools__button material-icons"
          @click="showQuestionAnswer"
          content="显示答案"
          v-tippy="{ appendTo: 'parent' }"
        >
          {{ showAnswer ? 'circle' : 'block' }}
        </div>
        <div
          class="question-render-tools__button material-icons"
          v-if="renderMode === 'single'"
          @click="updateQuestionDetail"
          content="题目信息"
          v-tippy="{ appendTo: 'parent' }"
        >
          more_vert
        </div>
        <div class="question-render-tools__switch" v-if="!isDirectQuestionMode">
          <div
            class="material-icons-round single-mode"
            :class="{ 'current-mode': renderMode === 'single' }"
            @click="changeRenderMode('single')"
          >
            space_dashboard
          </div>
          <div
            class="material-icons-round list-mode"
            :class="{ 'current-mode': renderMode === 'list' }"
            @click="changeRenderMode('list')"
          >
            line_style
          </div>
        </div>
        <div
          class="question-tools-info"
          :class="{ active: showQuestionDetail }"
        >
          <div class="question-tools-info__pid">
            <div class="question-tools-info__value">
              {{ currentQuestion?.pid }}
            </div>
            <div class="question-tools-info__label">题目编号</div>
            <div class="question-tools-info__tags">
              <div class="question-tools-info__tag">
                {{ renderQuestionCourse(currentQuestion?.course ?? 1) }}
              </div>
              <div class="question-tools-info__tag">
                {{
                  renderQuestionSubject(
                    currentQuestion?.course ?? 1,
                    currentQuestion?.subject ?? 1,
                  )
                }}
              </div>
            </div>
            <div class="question-tools-info__status">
              <div class="active" v-if="currentQuestion?.updated_time ?? false">
                <span class="material-icons">done</span> 已启用
              </div>
              <div class="inactive" v-else>
                <span class="material-icons">close</span> 未启用
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/media_screen.scss' as screen;
@use '@/assets/styles/reset_question.scss' as reset;

.question-render-wrapper {
  --page-container-practice-margin-vertical: 30px;
  --page-container-practice-margin-horizon: 50px;
  --page-container-practice-answer-height: 100px;
  display: flex;
  flex-direction: column;
  padding: 0;
  height: 100%;

  @keyframes loading {
    from {
      transform: rotate(0deg);
    }

    to {
      transform: rotate(360deg);
    }
  }

  .question-render-info {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    padding: 5px 15px;
    margin: 0 20px;
    border-bottom: 1px solid var(--border-color-base);
    position: relative;
    transition: 250ms ease;

    @include screen.media-screen(phone) {
      flex-wrap: wrap;
      row-gap: 6px;
    }

    .question-render-info__subject,
    .question-render-info__id {
      display: flex;
      align-items: center;
      color: var(--color-surface-4);
      flex-basis: 25%;

      @include screen.media-screen(phone) {
        justify-content: center !important;
        flex: 0 0 50%;
      }
    }

    .question-render-info__status {
      display: flex;
      justify-content: center;
      align-items: center;
      color: var(--color-base--emphasized);
      font-size: 16px;

      @include screen.media-screen(phone) {
        font-size: 18px;
        flex: 1 0 100%;
        order: -1;
      }

      .question-render-info__current {
        width: 5.5rem;
        text-align: center;
        margin: 0 2rem;
      }

      .question-render-info__direction {
        border-radius: 50%;
        user-select: none;
        transition: 200ms ease;

        .material-icons {
          display: block;
        }

        &:hover {
          background: var(--border-color-base);
        }

        &:active {
          transform: scale(0.9);
          transition-duration: 80ms;
        }
      }
    }

    .question-render-info__id {
      justify-content: flex-end;
      user-select: none;
      cursor: pointer;
    }

    .question-render-info__sheets {
      --page-practice-sheet-height: 250px;
      --page-practice-sheet-title-height: 20px;
      height: 0;
      padding: 0;
      opacity: 0;
      pointer-events: none;
      user-select: none;
      border: 1px solid var(--border-color-base);
      border-radius: 12px;
      background: var(--background-color-overlay--lighter);
      backdrop-filter: blur(16px);
      box-shadow: 0 1px 4px var(--border-color-base);
      position: absolute;
      top: 100%;
      right: 0;
      z-index: 101;
      overflow: hidden;
      transition: var(--transition-hover);

      &.active {
        height: var(--page-practice-sheet-height);
        padding: 6px;
        opacity: 1;
        pointer-events: all;
        user-select: auto;
        overflow-y: auto;
      }

      .question-render-info__title {
        color: var(--color-surface-4);
        font-size: 12px;
        padding: 0.25rem;
        padding-bottom: 0.5rem;
      }

      .question-render-info__wrapper {
        display: grid;
        grid-gap: 0.25rem;
        grid-template-columns: repeat(5, 1fr);

        .question-render-info__sheet {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 6px;
          background: var(--background-color-primary--active);
          border-radius: 8px;
          cursor: pointer;
          transition: 150ms ease;

          &:hover {
            color: var(--color-surface-0);
            background: var(--color-primary);
          }

          &.done {
            color: var(--color-surface-0);
            font-weight: 600;
            background: var(--success-color);

            &:hover {
              background: var(--color-base--subtle);
            }
          }

          &.current {
            color: var(--color-surface-0);
            font-weight: 600;
            background: var(--color-primary);

            &:hover {
              background: var(--color-base--subtle);
            }
          }

          &:active {
            transform: scale(0.99);
          }
        }
      }
    }

    .direct-mode-bar {
      display: flex;
      justify-content: center;
      width: 100%;
      color: var(--color-base--subtle);

      .direct-mode-info {
        display: flex;
        gap: 4px;
        align-items: center;
        font-weight: 500;
      }

      .material-icons {
        color: var(--color-base--subtle);
        font-size: 1.0625rem;
      }
    }
  }

  .question-render-questions {
    height: 100%;
    position: relative;
    overflow-y: auto;

    .question-loading-near {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 14px;
      position: absolute;
      top: 6px;
      right: 20px;
      user-select: none;

      .material-icons {
        font-size: 20px;
        animation: loading 500ms ease-in-out infinite;
      }
    }

    @include reset.reset-styles;

    .question-render-question {
      height: 100%;
      padding: var(--page-container-practice-margin-vertical)
        var(--page-container-practice-margin-horizon);
      padding-bottom: calc(var(--page-container-practice-answer-height) + 10px);
      overflow-y: auto;

      .question-type {
        color: var(--color-surface-0);
        font-size: 12px;
        width: fit-content;
        margin-bottom: 0.75rem;
        padding: 3px 9px;
        border-radius: 12px;
        background: var(--color-primary);
      }

      .question-content {
        margin-bottom: 1rem;
      }

      .question-options,
      .question-sub-options {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;

        &.question-sub-options {
          gap: 0.75rem;

          .question-sub-option {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            padding-top: 0.75rem;
            border-top: 1px solid var(--border-color-base);
          }
        }

        .question-option {
          display: flex;
          align-items: baseline;
          padding: 6px 8px;
          background: var(--color-surface-2);
          border-radius: 8px;
          transition: 150ms ease;
          transition-duration: 0ms;
          cursor: pointer;
          user-select: none;

          .question-option-number {
            font-weight: 600;
            padding: 0 6px;
            margin-right: 6px;
          }

          .question-option-content {
            display: flex;
            flex-wrap: wrap;
          }

          @media screen and (hover: hover) {
            &:hover {
              background: var(--color-surface-3);
              transition-duration: 150ms;
            }
          }

          &:active {
            transform: scale(0.99);
            transition-duration: 80ms;
          }

          &.selected {
            background: var(--background-color-primary--active);
            transition-duration: 150ms;
          }

          &.error {
            color: var(--color-surface-0);
            background: var(--failed-color);
            transition-duration: 150ms;
          }

          &.answer {
            color: var(--color-surface-0);
            background: var(--success-color);
            transition-duration: 150ms;
          }
        }
      }
    }
  }

  .question-render-loading {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;

    .material-icons {
      font-size: 48px;
      animation: loading 500ms ease-in-out infinite;
      user-select: none;
    }
  }

  .question-mode {
    height: 100%;
    overflow-y: hidden;

    &.question-list-mode {
      .question-render-questions .question-render-question {
        height: auto;
        padding-bottom: 3rem;
        overflow-y: unset;

        .question-info {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 0.5rem;

          .question-progress {
            color: var(--color-primary);
            font-size: 20px;
            margin-right: 0.5rem;
          }

          .question-index {
            font-size: 14px;
            font-weight: 600;
          }

          .question-pid,
          .question-type {
            color: var(--color-base--subtle);
            font-size: 12px;
            border: 1px solid var(--border-color-base--darker);
            border-radius: 12px;
            padding: 2px 6px;
            margin-bottom: 0;
            background: transparent;
          }
        }
      }
    }
  }

  .question-render-tools {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 15px;
    background: var(--border-color-base--lighter);
    position: relative;
    transition: 250ms ease;

    @include screen.media-screen(phone) {
      flex-direction: column;
      gap: 0.75rem;
    }

    .question-answer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: var(--page-container-practice-answer-height);
      padding: 0.5rem var(--page-container-practice-margin-horizon);
      background: linear-gradient(
        180deg,
        transparent -15%,
        var(--color-surface-0) 75%
      );
      backdrop-filter: blur(8px);
      position: absolute;
      bottom: 100%;
      left: 0;
      right: 0;

      @include screen.media-screen(phone) {
        flex-wrap: wrap;
        padding: 0.25rem 1rem;
      }

      .question-answer-infos {
        display: flex;
        gap: 0.5rem;

        .question-answer-info {
          display: flex;
          flex-direction: column;

          .question-answer-info__label {
            color: var(--color-base--subtle);
            font-size: 14px;
            line-height: 1;
          }

          .question-answer-info__answer {
            font-size: 36px;
            font-weight: 600;

            &.question-answer-system__answer {
              color: var(--success-color);
            }

            &.question-answer-user__answer {
              color: var(--success-color);

              &.error {
                color: var(--failed-color);
              }
            }
          }
        }
      }

      button {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        color: var(--color-surface-0);
        font-size: 14px;
        background: var(--color-primary);
        box-shadow: 0 2px 8px var(--border-color-base);
        margin: 0 2rem;
        margin-bottom: auto;
        padding: 6px 16px;
        cursor: pointer;

        @include screen.media-screen(phone) {
          margin: 0;
        }

        .material-icons {
          color: var(--color-surface-0);
          font-size: 18px;
        }

        &:hover {
          background: var(--color-base--subtle);
        }
      }
    }

    .question-render-tools__options {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.25rem;

      .exit-direct-mode-btn {
        color: var(--color-surface-0);
        background: var(--color-primary);
        transition: 250ms;
        
        &:hover {
          cursor: pointer;
          background: var(--color-base--subtle);
        }
      }

      .question-render-tools__option {
        &:hover {
          background: var(--border-color-base);
        }
      }
    }

    .question-render-tools__buttons {
      display: flex;
      align-items: center;

      .question-render-tools__switch {
        display: flex;
        align-items: center;
        padding: 4px 8px;
        margin-left: 0.5rem;
        border: 1px solid var(--border-color-base--darker);
        border-radius: 16px;

        .material-icons-round {
          color: var(--color-surface-4);
          border-radius: 50%;
          transition: 300ms ease;
          transform: scale(0.8);
          user-select: none;
          cursor: pointer;

          &:hover {
            color: var(--color-base--subtle);
          }

          &.current-mode {
            color: var(--color-base--subtle);
            transform: scale(1);

            &:hover {
              color: var(--color-base--emphasized);
            }
          }
        }
      }

      .question-render-tools__button {
        color: var(--color-base--subtle);
        padding: 4px;
        border-radius: 50%;
        transition: 150ms ease;
        user-select: none;

        &:hover {
          background: var(--border-color-base);
        }

        &:active {
          transform: scale(0.8);
          transition-duration: 80ms;
        }

        &.non-clickable {
          color: var(--color-surface-4);
        }
      }

      .question-render-tools__value {
        color: var(--color-surface-4);
        font-size: 14px;
        font-weight: 500;
        margin-right: 1rem;
      }
    }

    .question-tools-info {
      opacity: 0;
      pointer-events: none;
      user-select: none;
      display: flex;
      gap: 1.75rem;
      align-items: center;
      padding: 15px;
      border: 1px solid var(--border-color-base);
      border-radius: 12px;
      background: var(--background-color-overlay--lighter);
      backdrop-filter: blur(16px);
      box-shadow: 0 -1px 4px var(--border-color-base);
      position: absolute;
      bottom: 100%;
      right: 15px;
      z-index: 101;
      overflow: hidden;
      transition: var(--transition-hover);

      @include screen.media-screen(phone) {
        flex-direction: column;
        align-items: flex-start;
      }

      &.active {
        opacity: 1;
        pointer-events: all;
        user-select: auto;
      }

      .question-tools-info__pid {
        .question-tools-info__value {
          color: var(--color-base);
          font-size: 24px;
          margin-bottom: 0;
        }

        .question-tools-info__label {
          font-size: 12px;
        }

        .question-tools-info__tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
          margin: 8px 0;

          .question-tools-info__tag {
            color: var(--color-surface-0);
            font-size: 10px;
            padding: 2px 4px;
            background: var(--color-primary);
            border-radius: 8px;
          }
        }

        .question-tools-info__status {
          .active,
          .inactive {
            display: flex;
            align-items: center;
            gap: 0.25rem;
            color: var(--color-base--emphasized);
            font-size: 12px;
            font-weight: 600;
          }

          .material-icons {
            font-size: 16px;
            font-weight: 600;
          }

          .active .material-icons {
            color: var(--success-color);
          }

          .inactive .material-icons {
            color: var(--failed-color);
          }
        }
      }

      .question-tools-info__value {
        color: var(--color-base--subtle);
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 2px;
      }

      .question-tools-info__label {
        color: var(--color-surface-4);
        font-size: 10px;
      }

      .question-tools-info__list {
        display: grid;
        grid-auto-flow: column;
        grid-template-rows: repeat(3, 1fr);
        grid-gap: 0.5rem;
      }
    }
  }

  &.loading {
    .question-render-info,
    .question-render-tools {
      opacity: 0.5;
      filter: grayscale(1);
      pointer-events: none;
    }
  }
}
</style>
