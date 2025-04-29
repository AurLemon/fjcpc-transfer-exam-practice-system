<script lang="ts" setup>
import { ref, watchEffect, computed, onMounted, onBeforeUnmount } from 'vue'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

import { get, post } from '@/api/api'
import { useUserStore } from '@/stores/user'
import { useQuestionStore } from '@/stores/question'
import { useNotifyStore } from '@/stores/notify'

import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

export interface ProgressData {
  pid: string
  course: number
  subject: number
  time: string
}

const userStore = useUserStore()
const questionStore = useQuestionStore()
const notifyStore = useNotifyStore()

echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  TitleComponent,
  CanvasRenderer,
])

const dayProgressList = ref<ProgressData[]>([])
const isChartRender = ref<boolean>(true)
const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null

const renderCharts = () => {
  if (chartRef.value) {
    chartInstance = echarts.init(chartRef.value)

    if (
      !dayProgressList.value ||
      !dayProgressList.value.length ||
      dayProgressList.value.every(
        (item) => item.course === 0 && item.subject === 0,
      )
    ) {
      isChartRender.value = false
      return
    } else {
      isChartRender.value = true
    }

    const dataByDate: Record<string, number> = {}

    dayProgressList.value.forEach((progress) => {
      const date = new Date(Number(progress.time)).toISOString().split('T')[0]
      if (!dataByDate[date]) {
        dataByDate[date] = 0
      }
      dataByDate[date] += 1
    })

    const dates = Object.keys(dataByDate).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    )
    const counts = dates.map((date) => dataByDate[date])

    const fontFamilyBase =
      '"Inter", "MiSans Latin", "Helvetica Neue", "Helvetica", "Roboto", "BlinkMacSystemFont", "MiSans", "HarmonyOS Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif'

    const option = {
      grid: {
        top: 20,
        bottom: 10,
        left: 20,
        right: 20,
        containLabel: true,
      },
      tooltip: {
        trigger: 'axis',
        textStyle: {
          fontFamily: fontFamilyBase,
          fontSize: 14,
          color: '#3e6274',
        },
        appendToBody: true,
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#3e6274',
          fontFamily: fontFamilyBase,
        },
      },
      yAxis: {
        type: 'value',
        splitNumber: 2,
        axisLine: { show: false },
        splitLine: { show: false },
        axisLabel: {
          fontFamily: fontFamilyBase,
        },
      },
      series: [
        {
          name: '题量',
          type: 'line',
          data: counts,
          lineStyle: { color: '#3791be' },
        },
      ],
    }
    chartInstance.setOption(option)
  }
}

const reloadCharts = async () => {
  isChartRender.value = true

  const res = await userStore.getAllProgress()
  dayProgressList.value = res
  renderCharts()
}

const calculateUserProgress = computed(() => {
  const userProgress = userStore.profile.user_progress
  return Number(((userProgress.current / userProgress.total) * 100).toFixed(2))
})

const getUserWrongCount = async () => {
  const folder = await userStore.getFolderContent('wrong')
  return folder.length
}

const userWrongCount = ref<number>(0)

interface LessonType {
  subject: number
  id: string
  name: string
  count: number
  user_type_stat?: { type: number; count: number }[]
  star_type_stat?: { type: number; count: number }[]
}

interface QuestionInfoType {
  cultural_lesson: LessonType[]
  profession_lesson: LessonType[]
}

const userStatCount = ref<QuestionInfoType>({
  cultural_lesson: [],
  profession_lesson: [],
})

const getUserProgressStatCount = async (
  course: number,
  subject: number,
  type: number,
) => {
  const res = await userStore.getProgressSubject(course, subject, type)
  return res.length
}

const getUserStarStatCount = async (
  course: number,
  subject: number,
  type: number,
  folderName = 'wrong',
) => {
  const res = await userStore.getStarSubject(course, subject, type, folderName)
  return res.length
}

const getProgressTypeCount = async (course: number, subject: number) => {
  try {
    const res = await userStore.getProgressSubject(course, subject, -1)
    const typeCount: Record<number, number> = {}

    res.forEach((item) => {
      if (typeCount[item.type]) {
        typeCount[item.type]++
      } else {
        typeCount[item.type] = 1
      }
    })

    const result = Object.keys(typeCount).map((key) => ({
      type: parseInt(key),
      count: typeCount[parseInt(key)],
    }))

    return result
  } catch (err) {
    console.error(
      'Catch error in StatView - getProgressTypeCount(). Detials: ',
      err,
    )
    return []
  }
}

const getStarTypeCount = async (
  course: number,
  subject: number,
  folderName: string = 'wrong',
) => {
  try {
    const res = await userStore.getStarSubject(course, subject, -1, folderName)
    const typeCount: Record<number, number> = {}

    res.forEach((item) => {
      if (typeCount[item.type]) {
        typeCount[item.type]++
      } else {
        typeCount[item.type] = 1
      }
    })

    const result = Object.keys(typeCount).map((key) => ({
      type: parseInt(key),
      count: typeCount[parseInt(key)],
    }))

    return result
  } catch (err) {
    console.error(
      'Catch error in StatView - getStarTypeCount(). Detials: ',
      err,
    )
    return []
  }
}

const loadUserStatInfo = async () => {
  await getUserProgressStatCount
}

const updateUserStats = async () => {
  const questionInfo: QuestionInfoType = questionStore.questionInfo
  const updatedInfo: QuestionInfoType = {
    cultural_lesson: [],
    profession_lesson: [],
  }

  for (const lesson of questionInfo.cultural_lesson) {
    const userTypeStat = await getProgressTypeCount(1, lesson.subject)
    const starTypeStat = await getStarTypeCount(1, lesson.subject)

    updatedInfo.cultural_lesson.push({
      ...lesson,
      user_type_stat: userTypeStat,
      star_type_stat: starTypeStat,
    })
  }

  for (const lesson of questionInfo.profession_lesson) {
    const userTypeStat = await getProgressTypeCount(2, lesson.subject)
    const starTypeStat = await getStarTypeCount(2, lesson.subject)

    updatedInfo.profession_lesson.push({
      ...lesson,
      user_type_stat: userTypeStat,
      star_type_stat: starTypeStat,
    })
  }

  userStatCount.value = updatedInfo
}

watchEffect(() => {
  updateUserStats()
})

const getUserProgressCount = (
  course: number,
  subject: number = -1,
  type: number = -1,
) => {
  let totalCount = 0

  const lessons =
    course === 1
      ? userStatCount.value.cultural_lesson
      : userStatCount.value.profession_lesson

  lessons.forEach((lesson) => {
    if (subject !== -1 && lesson.subject !== subject) return

    lesson.user_type_stat?.forEach((stat) => {
      if (type === -1 || stat.type === type) {
        totalCount += stat.count
      }
    })
  })

  return totalCount
}

const getUserStarCount = (
  course: number,
  subject: number = -1,
  type: number = -1,
) => {
  let totalCount = 0

  const lessons =
    course === 1
      ? userStatCount.value.cultural_lesson
      : userStatCount.value.profession_lesson

  lessons.forEach((lesson) => {
    if (subject !== -1 && lesson.subject !== subject) return

    lesson.star_type_stat?.forEach((stat) => {
      if (type === -1 || stat.type === type) {
        totalCount += stat.count
      }
    })
  })

  return totalCount
}

const returnSubjectFromQuestionInfo = (course: number, subject: number) => {
  const lessons =
    course === 1
      ? questionStore.questionInfo.cultural_lesson
      : questionStore.questionInfo.profession_lesson
  return (
    lessons.find((lesson) => lesson.subject === subject) || {
      question_types: [{ type: 0, count: 0 }],
    }
  )
}

const showWrongCount = ref<{
  cultural_lesson: boolean
  profession_lesson: boolean
}>({
  cultural_lesson: true,
  profession_lesson: true,
})

const showSubType = ref<{
  cultural_lesson: boolean
  profession_lesson: boolean
}>({
  cultural_lesson: true,
  profession_lesson: true,
})

const handleShowWrongCount = (course: number) => {
  course === 1
    ? (showWrongCount.value.cultural_lesson =
        !showWrongCount.value.cultural_lesson)
    : (showWrongCount.value.profession_lesson =
        !showWrongCount.value.profession_lesson)
}

const handleShowSubType = (course: number) => {
  course === 1
    ? (showSubType.value.cultural_lesson = !showSubType.value.cultural_lesson)
    : (showSubType.value.profession_lesson =
        !showSubType.value.profession_lesson)
}

interface UserStatGroup {
  uuid: string
  nick: string | null
  name: string | null
  profession: string | null
  school: string | null
  last_login: number
  reg_date: number
  main_profession_subject: number
  user_progress: {
    current: number
    total: number
  }
  wrong_count: number
}

const userStatGroup = ref<UserStatGroup[]>([])

const totalStatInfo = ref<{ user_count: number; profession_count: number }>({
  user_count: 0,
  profession_count: 0,
})

const requestStatInfo = async () => {
  try {
    const response: any = await get('/user/stat')

    if (response.data.code === 200) {
      const data = response.data.data
      userStatGroup.value = data.user_stat
      totalStatInfo.value = data.overview
    } else {
      notifyStore.addMessage('failed', '获取数据库统计信息出现异常')
    }
  } catch (err) {
    notifyStore.addMessage('failed', '无法获取数据库统计信息')
    console.log('Catch error in StatView - requestStatInfo(). Details: ' + err)
  }
}

const formatTimestamp = (timestamp: number): string => {
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss')
}

const formatTimeAgo = (timestamp: number): string => {
  const now = dayjs()
  const time = dayjs(timestamp)
  const daysDiff = now.diff(time, 'day')

  if (daysDiff > 30) {
    const months = Math.floor(daysDiff / 30)
    const days = daysDiff % 30
    return `${months}月${days}天前`
  } else {
    return time.fromNow()
  }
}

onMounted(() => {
  const init = (async () => {
    const res = await userStore.getAllProgress()
    dayProgressList.value = res
    renderCharts()
    updateUserStats()
    await requestStatInfo()

    userWrongCount.value = await getUserWrongCount()
  })()

  const handleResize = () => {
    if (chartInstance) {
      chartInstance.resize()
    }
  }

  window.addEventListener('resize', handleResize)

  onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize)
  })
})
</script>

<template>
  <div class="page-container-slide page-stat">
    <div class="page-container-title">统计</div>
    <div class="page-stat-info">
      <div class="page-stat-charts">
        <div class="page-stat-charts__title" v-if="isChartRender">
          每日完成题量
        </div>
        <div
          ref="chartRef"
          class="page-stat-charts__draw"
          v-if="isChartRender"
        ></div>
        <div class="page-stat-charts__draw none" v-else>
          <div class="icon">
            <span class="material-icons">close</span>
          </div>
          <div class="text">
            暂无数据
            <span
              class="material-icons"
              @click="reloadCharts"
              v-tippy="{ content: '刷新' }"
              >refresh</span
            >
          </div>
        </div>
      </div>
      <div class="page-stat-grid">
        <div class="page-stat-data">
          <div class="page-stat-data__item">
            <div class="page-stat-data__label">进度</div>
            <div class="page-stat-data__value">
              {{ calculateUserProgress }}%
            </div>
          </div>
          <div class="page-stat-data__item">
            <div class="page-stat-data__label">题目数量</div>
            <div class="page-stat-data__value">
              {{ userStore.profile.user_progress.current }} /
              {{ userStore.profile.user_progress.total }}
            </div>
          </div>
          <div class="page-stat-data__item">
            <div class="page-stat-data__label">收藏数量</div>
            <div class="page-stat-data__value">{{ userWrongCount }}</div>
          </div>
          <div class="page-stat-data__item">
            <div class="page-stat-data__label">错误率</div>
            <div class="page-stat-data__value">
              {{
                userStore.profile.user_progress.current &&
                Number.isFinite(userWrongCount)
                  ? (
                      (userWrongCount /
                        userStore.profile.user_progress.current) *
                        100 || 0
                    ).toFixed(2)
                  : 0
              }}%
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="page-stat-list">
      <div class="page-stat-course cultural">
        <div class="page-stat-course__title">文化基础数据统计</div>
        <div class="page-stat-table__filterlist">
          <div
            class="page-stat-table__filter"
            :class="{ active: !showWrongCount.cultural_lesson }"
            @click="handleShowWrongCount(1)"
          >
            显示错题数据
          </div>
          <div
            class="page-stat-table__filter"
            :class="{ active: !showSubType.cultural_lesson }"
            @click="handleShowSubType(1)"
          >
            隐藏子题目
          </div>
        </div>
        <div class="page-stat-table">
          <div
            class="page-stat-table__course"
            v-for="subject in questionStore.questionInfo['cultural_lesson']"
            :key="subject.subject"
          >
            <div class="page-stat-table__name">
              <div class="page-stat-table__id">{{ subject.subject }}</div>
              {{ subject.name }}
            </div>
            <div class="page-stat-table__infos">
              <div class="page-stat-table__total page-stat-table__info">
                <div class="page-stat-table__scroll">
                  <div
                    class="page-stat-table__progress"
                    :class="{ deemphasized: !showWrongCount.cultural_lesson }"
                    :style="{
                      width:
                        (
                          (getUserProgressCount(1, subject.subject) /
                            subject.count) *
                          100
                        ).toFixed(2) + '%',
                    }"
                  >
                    <div
                      class="page-stat-table__wrong"
                      :style="{
                        width:
                          (
                            (getUserStarCount(1, subject.subject) /
                              subject.count) *
                            100
                          ).toFixed(2) + '%',
                      }"
                    ></div>
                  </div>
                </div>
                <div class="page-stat-table__value">
                  <span v-if="showWrongCount.cultural_lesson">{{
                    getUserProgressCount(1, subject.subject)
                  }}</span
                  ><span v-else class="page-stat-table__wrongcount">{{
                    getUserStarCount(1, subject.subject)
                  }}</span
                  >/{{ subject.count }}
                </div>
              </div>
              <div
                class="page-stat-table__type page-stat-table__info"
                v-show="showSubType.cultural_lesson"
                v-for="(item, index) in returnSubjectFromQuestionInfo(
                  1,
                  subject.subject,
                ).question_types"
                :key="index"
              >
                <div class="page-stat-table__question">
                  {{ questionStore.renderQuestionType(item.type) }}
                </div>
                <div class="page-stat-table__scroll">
                  <div
                    class="page-stat-table__progress"
                    :class="{ deemphasized: !showWrongCount.cultural_lesson }"
                    :style="{
                      width:
                        (
                          (getUserProgressCount(1, subject.subject, item.type) /
                            item.count) *
                          100
                        ).toFixed(2) + '%',
                    }"
                  >
                    <div
                      class="page-stat-table__wrong"
                      :style="{
                        width:
                          (
                            (getUserStarCount(1, subject.subject, item.type) /
                              item.count) *
                            100
                          ).toFixed(2) + '%',
                      }"
                    ></div>
                  </div>
                </div>
                <div class="page-stat-table__value">
                  <span v-if="showWrongCount.cultural_lesson">{{
                    getUserProgressCount(1, subject.subject, item.type)
                  }}</span
                  ><span v-else class="page-stat-table__wrongcount">{{
                    getUserStarCount(1, subject.subject, item.type)
                  }}</span
                  >/{{ item.count }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="page-stat-course professional">
        <div class="page-stat-course__title">专业基础数据统计</div>
        <div class="page-stat-table__filterlist">
          <div
            class="page-stat-table__filter"
            :class="{ active: !showWrongCount.profession_lesson }"
            @click="handleShowWrongCount(2)"
          >
            显示错题数据
          </div>
          <div
            class="page-stat-table__filter"
            :class="{ active: !showSubType.profession_lesson }"
            @click="handleShowSubType(2)"
          >
            隐藏子题目
          </div>
        </div>
        <div class="page-stat-table">
          <div
            class="page-stat-table__course"
            v-for="subject in questionStore.questionInfo['profession_lesson']"
            :key="subject.subject"
          >
            <div class="page-stat-table__name">
              <div class="page-stat-table__id">{{ subject.subject }}</div>
              {{ subject.name }}
            </div>
            <div class="page-stat-table__infos">
              <div class="page-stat-table__total page-stat-table__info">
                <div class="page-stat-table__scroll">
                  <div
                    class="page-stat-table__progress"
                    :class="{ deemphasized: !showWrongCount.profession_lesson }"
                    :style="{
                      width:
                        (
                          (getUserProgressCount(2, subject.subject) /
                            subject.count) *
                          100
                        ).toFixed(2) + '%',
                    }"
                  >
                    <div
                      class="page-stat-table__wrong"
                      :style="{
                        width:
                          (
                            (getUserStarCount(2, subject.subject) /
                              subject.count) *
                            100
                          ).toFixed(2) + '%',
                      }"
                    ></div>
                  </div>
                </div>
                <div class="page-stat-table__value">
                  <span v-if="showWrongCount.profession_lesson">{{
                    getUserProgressCount(2, subject.subject)
                  }}</span
                  ><span v-else class="page-stat-table__wrongcount">{{
                    getUserStarCount(2, subject.subject)
                  }}</span
                  >/{{ subject.count }}
                </div>
              </div>
              <div
                class="page-stat-table__type page-stat-table__info"
                v-show="showSubType.profession_lesson"
                v-for="(item, index) in returnSubjectFromQuestionInfo(
                  2,
                  subject.subject,
                ).question_types"
                :key="index"
              >
                <div class="page-stat-table__question">
                  {{ questionStore.renderQuestionType(item.type) }}
                </div>
                <div class="page-stat-table__scroll">
                  <div
                    class="page-stat-table__progress"
                    :class="{ deemphasized: !showWrongCount.profession_lesson }"
                    :style="{
                      width:
                        (
                          (getUserProgressCount(2, subject.subject, item.type) /
                            item.count) *
                          100
                        ).toFixed(2) + '%',
                    }"
                  >
                    <div
                      class="page-stat-table__wrong"
                      :style="{
                        width:
                          (
                            (getUserStarCount(2, subject.subject, item.type) /
                              item.count) *
                            100
                          ).toFixed(2) + '%',
                      }"
                    ></div>
                  </div>
                </div>
                <div class="page-stat-table__value">
                  <span v-if="showWrongCount.profession_lesson">{{
                    getUserProgressCount(2, subject.subject, item.type)
                  }}</span
                  ><span v-else class="page-stat-table__wrongcount">{{
                    getUserStarCount(2, subject.subject, item.type)
                  }}</span
                  >/{{ item.count }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="page-stat-server">
      <div class="page-stat-server__title">后端数据库概览</div>
      <div class="page-stat-server__grid">
        <div class="page-stat-server__user">
          <div class="page-stat-server__usercount">
            <div class="page-stat-server__value">
              {{ totalStatInfo.user_count }}
            </div>
            <div class="page-stat-server__label">注册用户总数</div>
          </div>
          <div class="page-stat-server__wrongcount">
            <div class="page-stat-server__value">
              {{ totalStatInfo.profession_count }}
            </div>
            <div class="page-stat-server__label">专业课数量</div>
          </div>
        </div>
        <div class="page-stat-server__questioncount">
          <div class="page-stat-server__cultural">
            <div class="page-stat-server__coursename">文化基础</div>
            <div class="page-stat-server__progress">
              <div
                class="page-stat-server__item"
                v-for="subject in questionStore.questionInfo.cultural_lesson"
                :key="subject.subject"
                :style="{
                  'flex-grow': (
                    (subject.count / questionStore.getCulturalCount()) *
                    100
                  ).toFixed(2),
                }"
                v-tippy="{
                  content: `${((subject.count / questionStore.getCulturalCount()) * 100).toFixed(2)}%`,
                }"
              >
                {{ subject.name }}（{{ subject.count }}）
              </div>
            </div>
            <div class="page-stat-server__value">
              {{ questionStore.getCulturalCount() }}
            </div>
          </div>
          <div class="page-stat-server__profession">
            <div class="page-stat-server__coursename">专业基础</div>
            <div class="page-stat-server__progress">
              <div
                class="page-stat-server__item"
                v-for="subject in questionStore.questionInfo.profession_lesson"
                :key="subject.subject"
                :style="{
                  'flex-grow': (
                    (subject.count / questionStore.getProfessionCount()) *
                    100
                  ).toFixed(2),
                }"
                v-tippy="{
                  content: `${((subject.count / questionStore.getProfessionCount()) * 100).toFixed(2)}%`,
                }"
              >
                {{ subject.name }}（{{ subject.count }}）
              </div>
            </div>
            <div class="page-stat-server__value">
              {{ questionStore.getProfessionCount() }}
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="page-stat-userstat">
      <div class="page-stat-userstat__title">全站做题数据</div>
      <div class="page-stat-userstat__grid" v-if="userStatGroup">
        <div
          class="page-stat-userstat__itemwrapper"
          v-for="(user, index) in userStatGroup"
          :key="index"
        >
          <div
            class="page-stat-userstat__item"
            :class="{ user: user.uuid === userStore.profile.uuid }"
          >
            <div class="page-stat-userstat__info">
              <div
                class="page-stat-userstat__name"
                :class="{ hide: !user.name && !user.nick }"
              >
                <div class="page-stat-userstat__show">
                  {{
                    user.name
                      ? (user.name ?? '已隐藏')
                      : (user.nick ?? '已隐藏')
                  }}
                </div>
                <div
                  class="page-stat-userstat__lastlogin"
                  v-tippy="{
                    content: `上次登录：${formatTimestamp(user.last_login)}`,
                  }"
                >
                  {{ formatTimeAgo(user.last_login) }}
                </div>
              </div>
              <div class="page-stat-userstat__tags">
                <div
                  class="page-stat-userstat__progresscount page-stat-userstat__tag"
                  v-tippy="{ content: '完成率' }"
                >
                  {{
                    (
                      (user.user_progress.current / user.user_progress.total) *
                      100
                    ).toFixed(2)
                  }}%
                </div>
                <div
                  class="page-stat-userstat__wrongcount page-stat-userstat__tag"
                  v-tippy="{ content: '错误率' }"
                >
                  {{
                    user.user_progress.current === 0
                      ? '0.00'
                      : (
                          (user.wrong_count / user.user_progress.current) *
                          100
                        ).toFixed(2)
                  }}%
                </div>
                <div
                  class="page-stat-userstat__mainsubject page-stat-userstat__tag"
                  v-if="user.main_profession_subject"
                  v-tippy="{ content: '主专业课' }"
                >
                  {{
                    questionStore.renderQuestionSubject(
                      2,
                      user.main_profession_subject,
                    )
                  }}
                </div>
              </div>
              <div
                class="page-stat-userstat__regdate"
                v-tippy="{
                  content: `注册时间：${formatTimestamp(user.reg_date)}`,
                }"
              >
                <span class="emphasized">{{
                  formatTimeAgo(user.reg_date)
                }}</span>
                注册
              </div>
              <div
                class="page-stat-userstat__location"
                v-if="user.profession && user.school"
              >
                {{ user.profession }}（{{ user.school }}）
              </div>
              <div class="page-stat-userstat__location" v-else>注册用户</div>
            </div>
            <div class="page-stat-userstat__stat">
              <div class="page-stat-userstat__progress">
                <div
                  class="page-stat-userstat__scroll"
                  :style="{
                    width:
                      (
                        (user.user_progress.current /
                          user.user_progress.total) *
                        100
                      ).toFixed(2) + '%',
                  }"
                >
                  <div
                    class="page-stat-userstat__wrong"
                    :style="{
                      width:
                        user.user_progress.total === 0
                          ? '0%'
                          : (
                              (user.wrong_count / user.user_progress.total) *
                              100
                            ).toFixed(2) + '%',
                    }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="page-stat-statement">注：错题数据是基于错题收藏夹。</div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/media_screen.scss' as screen;

.page-stat {
  $value-page-gap: 2.5rem;
  overflow-y: auto;

  .page-stat-info {
    .page-stat-grid {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1.75rem;

      .page-stat-data {
        display: flex;
        flex-wrap: wrap;
        gap: 1.5rem;
        padding: 0 1rem;

        .page-stat-data__item {
          display: flex;
          flex-direction: column;
          gap: 2px;

          .page-stat-data__label {
            color: var(--color-base--subtle);
            font-size: 12px;
            line-height: 1;
          }

          .page-stat-data__value {
            font-size: 32px;
            font-weight: 600;
          }
        }
      }
    }

    .page-stat-charts {
      padding: 0.5rem;
      margin-bottom: 1.25rem;
      border: 1px solid var(--border-color-base--darker);
      border-radius: 16px;

      .page-stat-charts__title {
        color: var(--color-base--subtle);
        font-size: 12px;
        text-align: center;
        margin-bottom: 0.25rem;
      }

      .page-stat-charts__draw {
        width: 100%;
        height: 120px;
        border-radius: 16px;

        &.none {
          display: flex;
          justify-content: center;
          align-items: center;
          flex-direction: column;
          gap: 4px;
          color: var(--color-base--subtle);
          font-size: 14px;
          cursor: not-allowed;
          user-select: none;

          .icon .material-icons {
            color: var(--failed-color);
            font-size: 42px;
          }

          .text {
            display: flex;
            align-items: center;

            .material-icons {
              color: var(--color-surface-4);
              font-size: 16px;
              padding: 4px;
              border-radius: 50%;
              cursor: pointer;
              transition: 150ms;

              &:hover {
                background: var(--border-color-base);
              }

              &:active {
                transform: scale(0.9);
              }
            }
          }
        }
      }
    }
  }

  .page-stat-list {
    display: flex;
    flex-direction: column;
    gap: $value-page-gap;
    margin-top: $value-page-gap;

    .page-stat-course {
      .page-stat-course__title {
        color: var(--color-base--subtle);
        font-size: 12px;
        text-align: center;
        margin-bottom: 0.5rem;
      }

      .page-stat-table__filterlist {
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-bottom: 0.25rem;

        @include screen.media-screen(mobile) {
          margin-bottom: 0.5rem;
        }

        .page-stat-table__filter {
          color: var(--color-base--subtle);
          font-size: 10px;
          padding: 2px 10px;
          border-radius: 16px;
          background: var(--background-color-primary--hover);
          transition: 150ms;
          user-select: none;
          cursor: pointer;

          &:hover {
            background: var(--background-color-primary--active);
          }

          &:active {
            transform: scale(0.9);
          }

          &.active {
            color: var(--color-surface-0);
            background: var(--color-primary);
          }
        }
      }

      .page-stat-table {
        display: flex;
        flex-direction: column;
        gap: 1rem;

        @include screen.media-screen(mobile) {
          gap: 1.5rem;
        }

        .page-stat-table__course {
          display: flex;
          gap: 1.25rem;

          @include screen.media-screen(mobile) {
            flex-direction: column;
            gap: 0.25rem;
          }

          .page-stat-table__name {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            width: 130px;
            height: fit-content;
            color: var(--color-base--emphasized);
            font-size: 18px;
            font-weight: 500;

            @include screen.media-screen(mobile) {
              width: 100%;
            }
          }

          .page-stat-table__id {
            flex: 0 0 18px;
            font-size: 16px;
            font-weight: 600;
            text-align: center;
          }

          .page-stat-table__infos {
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 0.25rem;

            .page-stat-table__info {
              display: flex;
              align-items: center;
              gap: 0.25rem;
              height: 100%;

              .page-stat-table__question {
                color: var(--color-base--subtle);
                font-size: 12px;
                flex: 0 0 48px;
              }

              .page-stat-table__value {
                display: flex;
                flex-wrap: wrap;
                color: var(--color-base--subtle);
                font-size: 12px;
                text-align: center;
                flex: 0 0 70px;
                white-space: nowrap;

                span {
                  display: inline-flex;
                }
              }

              .page-stat-table__wrongcount {
                color: var(--failed-color);
              }
            }

            .page-stat-table__scroll {
              display: flex;
              align-items: center;
              width: 100%;
              height: 6px;
              background: var(--color-surface-3);
              border-radius: 16px;
              overflow: hidden;

              .page-stat-table__progress {
                width: inherit;
                height: inherit;
                border-radius: inherit;
                background: var(--color-primary);
                overflow: hidden;
                transition: 150ms;

                .page-stat-table__wrong {
                  width: inherit;
                  height: inherit;
                  border-radius: inherit;
                  background: var(--failed-color);
                }

                &.deemphasized {
                  background: hsl(var(--color-primary__h), 10%, 70%);
                }
              }
            }

            .page-stat-table__total {
              .page-stat-table__value {
                color: var(--color-base);
                font-size: 13px;
                font-weight: 600;
              }
            }
          }
        }
      }
    }
  }

  .page-stat-server {
    font-size: 14px;
    padding: 0.5rem 1.25rem 1.25rem 1.25rem;
    margin: $value-page-gap * 1.25;
    border: 1px solid var(--border-color-base--darker);
    border-radius: 16px;
    background: var(--color-surface-2);

    @include screen.media-screen(mobile) {
      margin: $value-page-gap * 1.25 0;
    }

    .page-stat-server__title {
      color: var(--color-base--subtle);
      font-size: 12px;
      text-align: center;
      margin-bottom: 0.25rem;
    }

    .page-stat-server__grid {
      display: flex;
      flex-direction: column;

      .page-stat-server__label {
        color: var(--color-base--subtle);
        font-size: 12px;
        line-height: 1;
      }

      .page-stat-server__value {
        font-size: 26px;
      }

      .page-stat-server__user {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
      }

      .page-stat-server__questioncount {
        display: grid;
        grid-template-rows: repeat(2, 1fr);
        gap: 0.25rem;
        font-size: 12px;
        margin-top: 1.5rem;
        width: 100%;

        .page-stat-server__cultural,
        .page-stat-server__profession {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .page-stat-server__coursename {
          width: fit-content;
          white-space: nowrap;
        }

        .page-stat-server__progress {
          display: flex;
          width: 100%;
          height: 100%;
          border-radius: 4px;
          background: var(--color-surface-3);
          font-size: 10px;
          overflow: hidden;

          .page-stat-server__item {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100%;
            color: var(--color-surface-0);
            text-align: center;
            padding: 2px 4px;
            background: #3ba6dc;
            user-select: none;
            cursor: pointer;
          }

          .page-stat-server__item:nth-of-type(2n) {
            background: #35caab;
          }

          .page-stat-server__item:nth-of-type(3n) {
            background: #ec87e0;
          }

          .page-stat-server__item:nth-of-type(4n) {
            background: #ef617b;
          }
        }

        .page-stat-server__value {
          width: 20px;
          color: var(--color-base--subtle);
          font-size: 12px;
        }
      }
    }
  }

  .page-stat-userstat {
    font-size: 14px;
    margin-bottom: $value-page-gap;
    border-radius: 16px;

    .page-stat-userstat__title {
      color: var(--color-base--subtle);
      font-size: 12px;
      text-align: center;
      margin-bottom: 0.25rem;
    }

    .page-stat-userstat__grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      grid-gap: 0.75rem;
      padding: 0.75rem;
      overflow-y: auto;

      @include screen.media-screen(phone) {
        grid-template-columns: repeat(1, minmax(0, 1fr));
      }

      .page-stat-userstat__itemwrapper {
        position: relative;
      }

      .page-stat-userstat__item {
        display: flex;
        justify-content: space-between;
        flex-direction: column;
        height: 100%;
        border-radius: 8px;
        border: 1px solid var(--border-color-base);
        overflow: hidden;

        &.user {
          background:
            radial-gradient(
              ellipse at 5% 0%,
              rgba(191, 57, 137, 0.04) 0,
              transparent 75%
            ),
            radial-gradient(
              ellipse at 60% 0%,
              rgba(9, 107, 222, 0.04) 0,
              transparent 75%
            );
        }

        .page-stat-userstat__info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 0.75rem;
        }

        .page-stat-userstat__name {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          color: var(--color-base--emphasized);
          font-size: 24px;
          font-weight: 500;
          width: 100%;
          margin: 0 2px;
          margin-bottom: 0.25rem;

          &.hide {
            color: var(--color-surface-3);
          }

          .page-stat-userstat__show {
            flex: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }

        .page-stat-userstat__lastlogin {
          color: var(--color-surface-0);
          font-size: 12px;
          padding: 2px 8px;
          border-radius: 12px;
          background: var(--success-color);
        }

        .page-stat-userstat__regdate {
          display: flex;
          align-items: center;
          gap: 2px;
          position: absolute;
          right: 0.75rem;
          bottom: calc(100% - 20px / 2);
          color: var(--color-base--subtle);
          font-size: 10px;
          height: 20px;
          padding: 2px 6px;
          border: 1px solid var(--border-color-base);
          border-radius: 6px;
          background: var(--color-surface-0);
          transform: translateY(4px);
          opacity: 0;
          transition: 150ms;

          .emphasized {
            font-weight: 600;
          }
        }

        .page-stat-userstat__tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;

          .page-stat-userstat__tag {
            color: var(--color-base--subtle);
            font-size: 10px;
            width: fit-content;
            padding: 2px 8px;
            border-radius: 12px;
            background: var(--background-color-primary--hover);
            user-select: none;
            cursor: pointer;
          }

          .page-stat-userstat__mainsubject {
            background: var(--background-color-primary--active);
          }

          .page-stat-userstat__progresscount {
            color: var(--color-surface-0);
            background: #74c5a2;
          }

          .page-stat-userstat__wrongcount {
            color: var(--color-surface-0);
            background: #f29a86;
          }
        }

        .page-stat-userstat__location {
          color: var(--color-surface-4);
          font-size: 12px;
        }

        .page-stat-userstat__stat {
          display: flex;
          flex-direction: column;
        }

        .page-stat-userstat__progress {
          height: 3px;
          background: var(--color-surface-3);
          margin: 0 2px;

          .page-stat-userstat__scroll {
            height: inherit;
            background: var(--color-primary);
            overflow: hidden;

            .page-stat-userstat__wrong {
              height: inherit;
              background: var(--failed-color);
            }
          }
        }

        &:hover {
          .page-stat-userstat__regdate {
            opacity: 1;
            transform: translateY(0);
          }
        }
      }
    }
  }

  .page-stat-statement {
    color: var(--color-surface-4);
    font-size: 12px;
    margin-top: 1rem;
  }
}
</style>
