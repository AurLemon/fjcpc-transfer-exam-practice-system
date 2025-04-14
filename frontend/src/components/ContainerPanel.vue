<script lang="ts">
import { defineComponent } from 'vue'
import dayjs from 'dayjs'

import { useCardStore } from '@/stores/card'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
import { useQuestionStore } from '@/stores/question'
import { useNotifyStore } from '@/stores/notify'

export interface StarItem {
    pid: string
    course: number
    subject: number
    time: string
    type: number
}

export interface ProgressData {
    pid: string
    course: number
    subject: number
    time: string
    type: number
}

export default defineComponent({
    name: 'ContainerPanel',
    data() {
        return {
            showPanel: false,
            profileInfo: {}
        }
    },
    methods: {
        handleLoginCard(state: string): void {
            switch (state) {
                case 'open':
                    this.cardStore.closeAllCard()
                    this.cardStore.showLoginCard = true
                    this.cardStore.mobileShowPanel = false
                    break
                case 'close':
                    this.cardStore.closeAllCard()
                    this.cardStore.showLoginCard = false
                    break
                default:
                    break
            }
        },
        openLoginCard(): void {
            this.cardStore.showLoginCard = true
            this.cardStore.mobileShowPanel = false
        },
        userLogout(): void {
            this.notifyStore.addMessage('success', '即将登出')
            this.cardStore.mobileShowPanel = false
            setTimeout(() => {
                this.userStore.userLogout()
                this.notifyStore.addMessage('success', `已登出（${dayjs().format('YYYY-MM-DD HH:mm:ss')}）`)
            }, 1000)
        },
        getCulturalCount(): number {
            return this.questionStore.questionInfo.cultural_lesson.reduce(
                (sum: number, lesson: { subject: number; id: string; name: string; count: number }) => {
                    return sum + lesson.count
                },
                0
            )
        },
        getProfessionCount(): number {
            return this.questionStore.questionInfo.profession_lesson.reduce(
                (sum: number, lesson: { subject: number; id: string; name: string; count: number }) => {
                    return sum + lesson.count
                },
                0
            )
        },
        examTime(): string {
            const questionStore = useQuestionStore()
            return questionStore.questionInfo.exam_info.exam_time || '2025-05-15'
        },
        isExamTimeTrust() {
            const questionStore = useQuestionStore()
            return !questionStore.questionInfo.exam_info.exam_trust || false
        },
        examCountdown(): number {
            const examDate = this.examTime()
            return dayjs(examDate).diff(dayjs(), 'day')
        }
    },
    computed: {
        calculateUserProgress(): number {
            const userProgress = this.userStore.profile.user_progress
            return Number(((userProgress.current / userProgress.total) * 100).toFixed(2))
        }
    },
    setup() {
        const cardStore = useCardStore()
        const authStore = useAuthStore()
        const userStore = useUserStore()
        const questionStore = useQuestionStore()
        const notifyStore = useNotifyStore()
        return {
            cardStore,
            userStore,
            authStore,
            questionStore,
            notifyStore
        }
    }
})
</script>

<template>
    <nav class="page-container-panel" :class="{ show: cardStore.mobileShowPanel }">
        <div class="container-panel-countdown">
            <div class="container-panel-header-countdown">
                <div class="container-panel-header-countdown__value">{{ questionStore.isGetQuestionInfo ? '-' : getCulturalCount() }}</div>
                <div class="container-panel-header-countdown__label">文化课题目数</div>
            </div>
            <div class="container-panel-header-countdown">
                <div class="container-panel-header-countdown__value">{{ questionStore.isGetQuestionInfo ? '-' : getProfessionCount() }}</div>
                <div class="container-panel-header-countdown__label">专业课题目数</div>
            </div>
            <div class="container-panel-header-countdown">
                <div class="container-panel-header-countdown__value">
                    {{ questionStore.isGetQuestionInfo ? '-' : getCulturalCount() + getProfessionCount() }}
                </div>
                <div class="container-panel-header-countdown__label">题目总数</div>
            </div>
            <div class="container-panel-header-countdown">
                <div
                    class="container-panel-header-countdown__value"
                    v-tippy="{ content: `${examTime()}（${isExamTimeTrust() ? '推算' : '已确定考试时间'}）`, placement: 'left' }"
                >
                    {{ examCountdown() }}
                </div>
                <div class="container-panel-header-countdown__label">
                    离转轨考还有几天
                    <span class="material-icons" v-if="isExamTimeTrust()" v-tippy="{ content: '考试时间为推算，船政公布考试时间后会自动更新。' }">info</span>
                </div>
            </div>
        </div>
        <div class="container-panel-status">
            <div
                class="container-panel-status__progress"
                v-if="questionStore.questionInfo.cultural_lesson && questionStore.questionInfo.profession_lesson && userStore.profile.user_progress.total"
            >
                <div class="container-panel-status__progressLabel">
                    做题进度
                    <span class="value">
                        {{ `${calculateUserProgress}% (${userStore.profile.user_progress.current} / ${userStore.profile.user_progress.total})` }}
                    </span>
                </div>
                <div class="container-panel-status__progressWrapper">
                    <div class="container-panel-status__progressScroll" :style="{ width: calculateUserProgress + '%' }"></div>
                </div>
            </div>
        </div>
        <div class="container-panel-profile">
            <div class="container-panel-profile-wrapper container-panel-profile-info" :class="{ blur: !userStore.login.isLogged || authStore.isLoading }">
                <div class="container-panel-profile__greeting" v-if="userStore.profile.name">
                    {{ userStore.login.isLogged && userStore.profile.name.length > 0 ? `${userStore.profile.name[0]}同学，你好。` : '-' }}
                </div>
                <div class="container-panel-profile__greeting" v-else>
                    {{ userStore.login.isLogged && userStore.profile.nick.length > 0 ? `${userStore.profile.nick}，你好。` : '-' }}
                </div>
                <div class="container-panel-profile__inner">
                    <div class="container-panel-profile__account" v-if="userStore.profile.id_number">
                        {{ userStore.login.isLogged && userStore.profile.id_number.length > 0 ? userStore.profile.id_number : '-' }}
                    </div>
                    <div class="container-panel-profile__account" v-else>
                        {{ userStore.login.isLogged && userStore.profile.uuid.length > 0 ? userStore.profile.uuid : '-' }}
                    </div>
                    <div class="container-panel-profile__buttons">
                        <div class="container-panel-profile__button container-panel-profile__edit" @click="openLoginCard" v-tippy="{ content: '切换账户' }">
                            <span class="material-icons">edit</span>
                        </div>
                        <div class="container-panel-profile__button container-panel-profile__logout" @click="userLogout" v-tippy="{ content: '退出' }">
                            <span class="material-icons">logout</span>
                        </div>
                    </div>
                </div>
                <div class="container-panel-profile__detail" v-if="userStore.profile.profession && userStore.profile.school">
                    {{
                        userStore.login.isLogged && userStore.profile.profession.length > 0 && userStore.profile.school.length > 0
                            ? `${userStore.profile.profession}（${userStore.profile.school}）`
                            : '-'
                    }}
                </div>
                <div class="container-panel-profile__detail" v-else>注册用户</div>
            </div>
            <div class="container-panel-profile-wrapper container-panel-profile-login" v-if="!userStore.login.isLogged">
                <div class="container-panel-profile-login__title">未登录</div>
                <button @click="handleLoginCard('open')" :class="{ disabled: cardStore.showLoginCard }">
                    <div class="info" v-if="!cardStore.showLoginCard">打开登录面板</div>
                    <div class="info" v-else>请在登录面板内操作</div>
                </button>
            </div>
            <div class="container-panel-profile-wrapper container-panel-profile-loading" v-if="authStore.isLoading">
                <div class="loading material-icons">autorenew</div>
            </div>
        </div>
    </nav>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/media_screen.scss' as screen;

.page-container {
    .page-container-panel {
        display: flex;
        flex-direction: column;
        flex: 0;
        width: var(--panel-width);
        min-width: 280px;
        padding: 15px;
        border: 1px solid var(--border-color-base);
        border-radius: 10px;
        background: var(--color-surface-0);
        box-shadow: var(--box-shadow-diverge);
        transition: box-shadow 200ms ease;
        overflow-y: auto;

        &:hover {
            box-shadow: var(--box-shadow-diverge--hover);
        }

        .container-panel-profile {
            margin-top: 30px;
            margin-bottom: 10px;
            padding-top: 30px;
            border-top: 1px solid var(--border-color-base);
            position: relative;

            .container-panel-profile__greeting {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 5px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .container-panel-profile__inner {
                position: relative;
            }

            .container-panel-profile__account {
                max-width: calc(100% - 64px);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                height: 26px;
                padding: 4px 2px;
                font-size: 14px;
                font-family: 'JetBrains Mono';
                outline-color: var(--color-primary);
            }

            .container-panel-profile__buttons {
                display: flex;
                align-items: center;
                gap: calc(var(--gap-value) / 4);
                opacity: 0.1;
                position: absolute;
                top: 0;
                right: 0;
                bottom: 0;
                transition: var(--transition-hover);
            }

            .container-panel-profile__button {
                border-radius: 50%;

                .material-icons {
                    display: block;
                    font-size: 18px;
                    padding: 4px;
                    opacity: 0.7;
                    transition: var(--transition-hover);
                    user-select: none;
                }

                &:hover {
                    background: rgba(0, 0, 0, 0.1);
                }

                &:active {
                    .material-icons {
                        transform: scale(0.9);
                    }
                }
            }

            .container-panel-profile__detail {
                color: var(--color-surface-4);
                font-size: 12px;
                padding: 0 2px;
            }

            .container-panel-profile-info {
                &.blur {
                    filter: blur(8px);
                    user-select: none;
                    pointer-events: none;
                }
            }

            .container-panel-profile-login {
                display: flex;
                justify-content: flex-end;
                flex-direction: column;
                gap: 12px;
                padding: 10px;
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;

                .container-panel-profile-login__title {
                    font-size: 22px;
                    font-weight: 600;
                }

                button {
                    color: var(--color-surface-0);
                    background: var(--color-primary);
                    cursor: pointer;
                    transition-duration: 250ms;

                    &:hover {
                        background: var(--color-base--subtle);
                    }

                    &.disabled {
                        color: var(--color-base--subtle);
                        background: var(--background-color-primary--hover);
                        cursor: not-allowed;
                    }
                }
            }

            .container-panel-profile-loading {
                display: flex;
                justify-content: center;
                align-items: center;
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;

                @keyframes loading {
                    from {
                        transform: rotate(0deg);
                    }

                    to {
                        transform: rotate(360deg);
                    }
                }

                .material-icons {
                    animation: loading 500ms ease-in-out infinite;
                    user-select: none;
                }
            }
        }

        .container-panel-countdown {
            display: flex;
            flex-direction: column;
            gap: var(--gap-value);
            margin-bottom: auto;

            .container-panel-header-countdown {
                font-size: 14px;
                padding: 2px 6px;

                .container-panel-header-countdown__value {
                    width: fit-content;
                    font-size: 42px;
                }

                .container-panel-header-countdown__label {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    color: var(--color-base--subtle);
                    font-size: 14px;
                    letter-spacing: 0.75px;
                    line-height: 1;

                    .material-icons {
                        color: var(--color-surface-4);
                        font-size: 16px;
                    }
                }
            }
        }

        .container-panel-status {
            .container-panel-status__label {
                &,
                .container-panel-status__progress {
                    color: var(--color-base--subtle);
                    font-size: 12px;
                }

                .container-panel-status__color {
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    margin-right: 5px;
                }
            }

            .container-panel-status__progress {
                margin-top: 1rem;
            }

            .container-panel-status__progressLabel {
                color: var(--color-surface-4);
                font-size: 12px;
                margin-bottom: 0.25rem;

                .value {
                    color: var(--color-base--emphasized);
                    font-weight: 500;
                }
            }

            .container-panel-status__progressWrapper {
                width: 100%;
                height: 8px;
                border-radius: 8px;
                background: var(--color-surface-3);
                overflow: hidden;
            }

            .container-panel-status__progressScroll {
                width: 0%;
                height: inherit;
                border-radius: inherit;
                background: var(--color-primary);
                transition: var(--transition-hover);
            }
        }

        &:hover {
            .container-panel-profile__buttons {
                opacity: 1;
            }
        }
    }
}

@include screen.media-screen(mobile) {
    .page-container {
        .page-container-panel {
            height: 75%;
            border-top-left-radius: 0;
            border-bottom-left-radius: 0;
            background: var(--background-color-overlay);
            position: absolute;
            top: 0;
            bottom: 0;
            left: 0;
            z-index: 200;
            opacity: 0;
            backdrop-filter: blur(24px);
            transition: var(--transition-hover);
            transform: translate(calc(-100%), -16%);
            overflow-x: auto;

            .container-panel-profile .container-panel-profile__buttons {
                opacity: 1;
            }

            &.show {
                height: 80vh;
                max-height: 100%;
                opacity: 1;
                box-shadow:
                    2px 4px 10px rgba(0, 0, 0, 0.05),
                    0px 2px 5px rgba(0, 0, 0, 0.05);
                transform: translate(calc(0% - 5px), -4%);
            }
        }
    }
}
</style>
