// src/stores/question.ts

import { defineStore } from 'pinia'
import { get } from '@/api/api'
import { useNotifyStore } from '@/stores/notify'

export interface Lesson {
    subject: number
    id: string
    name: string
    count: number
    question_types: {
        type: number
        count: number
    }[]
}

export interface QuestionInfo {
    cultural_lesson: Lesson[]
    profession_lesson: Lesson[]
    exam_info: {
        exam_time: string
        exam_trust: boolean
    }
    git_info: {
        local_commit: string
        local_commit_time: string
        repo_commit: string
        repo_commit_time: string
        recent_commit: string
    }
}

export const useQuestionStore = defineStore('question', {
    state: () => ({
        questionInfo: {
            cultural_lesson: [],
            profession_lesson: [],
            exam_info: {
                exam_time: '',
                exam_trust: false
            },
            git_info: {
                local_commit: '',
                local_commit_time: '',
                repo_commit: '',
                repo_commit_time: '',
                recent_commit: ''
            }
        } as QuestionInfo,
        currentStat: {} as any,
        isGetQuestionInfo: true
    }),
    actions: {
        async getQuestionInfo(callback?: Function) {
            const notifyStore = useNotifyStore()

            try {
                const response: any = await get('/question/info')
                this.questionInfo = response.data.data
                this.isGetQuestionInfo = false

                if (callback) {
                    callback()
                }
            } catch (err) {
                notifyStore.addMessage('failed', '无法获取题库信息，请检查网络连接。')
            }
        },
        getCulturalCount() {
            return this.questionInfo.cultural_lesson.reduce((sum: number, lesson: { subject: number; id: string; name: string; count: number }) => {
                return sum + lesson.count
            }, 0)
        },
        getProfessionCount() {
            return this.questionInfo.profession_lesson.reduce((sum: number, lesson: { subject: number; id: string; name: string; count: number }) => {
                return sum + lesson.count
            }, 0)
        },
        renderQuestionCourse(course: number) {
            if (course === 1) {
                return '文化基础'
            } else if (course === 2) {
                return '专业基础'
            }
        },
        renderQuestionSubject(course: number, subject: number) {
            if (subject === -1) {
                return this.renderQuestionCourse(course)
            }

            if (course === 1) {
                switch (subject) {
                    case 1:
                        return '语文'
                    case 2:
                        return '数学'
                    case 3:
                        return '英语'
                    case 4:
                        return '政治'
                }
            } else if (course === 2) {
                return this.questionInfo.profession_lesson.find((item) => item.subject === subject)?.name || null
            }
        },
        renderQuestionType(type: number) {
            switch (type) {
                case 0:
                    return '单选题'
                case 1:
                    return '多选题'
                case 2:
                    return '判断题'
                case 8:
                    return '阅读题'
            }
        }
    }
})
