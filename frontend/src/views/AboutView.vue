<script lang="ts">
import { defineComponent } from 'vue'
import { useQuestionStore } from '@/stores/question'

export default defineComponent({
    name: 'AboutView',
    setup() {
        const questionStore = useQuestionStore()
        return {
            questionStore
        }
    }
})
</script>

<template>
    <div class="page-container-slide page-about">
        <div class="page-container-title">关于</div>
        <div class="page-about-github">
            <div class="page-about-github__name">FJCPC Transfer Exam Practice System</div>
            <div class="page-about-github__desc">给需要转轨考的朋友准备的喵</div>
            <div class="page-about-github__info">
                <div class="page-about-github__version">v3.0.0 ({{ questionStore.questionInfo.git_info.current_commit.slice(0, 8) }})</div>
            </div>
            <div class="page-about-github__links">
                <a
                    class="page-about-github__link"
                    href="https://github.com/AurLemon/fjcpc-transfer-exam-practice-system"
                    v-tippy="{ content: '项目 GitHub 仓库' }"
                >
                    <img src="../assets/images/logo/GitHub_logo.svg" />
                </a>
            </div>
        </div>
        <div class="page-about-content">
            <div class="page-about-block">
                <p>
                    本人（开发者 &
                    站长）是船政学院2021级的“3+2”学生，24年4月底时在转轨考的练习系统做卷子的时候，第一次进去就被震撼到了，发现不管是界面还是性能都挺烂的，合理怀疑是找了个大学生做的，所以就想着能不能自己再做一个刷题的东西出来？于是就开始做了。
                </p>
                <p>
                    那会我发在班群里让大家用了下发现还可以，虽然赶进度写的很水但也是第一次写出来的东西能给身边人用，十分的有成就感啊！现在（24年8月）暑假，快开学的时候，打算拿新东西重写一下，顺便加点功能。如果你能用得到的话非常谢谢你的支持🤝❤。虽然站点仅供技术学习，但如果有什么技术问题或者交流都可以找我喵。
                </p>
            </div>
        </div>
        <div class="page-about-footer">
            <div class="page-about-footer__contact">
                <div class="page-about-footer__title">项目开发者</div>
                <div class="page-about-footer__wrapper">
                    <a href="https://aurlemon.top" target="_blank">
                        <div class="page-about-footer__user">
                            <div class="page-about-footer__avatar">
                                <img src="../assets/images/logo/AurLemon_logo.jpg" />
                            </div>
                            <div class="page-about-footer__name" v-tippy="{ content: '别信，船政好不到哪去' }">柠檬</div>
                            <div class="page-about-footer__id" v-tippy="{ content: 'MC 的 ID 也是这个' }">Aurora_Lemon</div>
                        </div>
                        <div class="page-about-footer__whereru">
                            <div class="page-about-footer__iamhere">
                                <a href="https://space.bilibili.com/204271518" target="_blank" v-tippy="{ content: 'B 站' }">
                                    <img src="../assets/images/logo/bilibili_logo.svg" />
                                </a>
                            </div>
                            <div class="page-about-footer__iamhere">
                                <a href="https://github.com/AurLemon" target="_blank" v-tippy="{ content: 'GitHub' }">
                                    <img src="../assets/images/logo/GitHub_logo.svg" />
                                </a>
                            </div>
                            <div class="page-about-footer__iamhere">
                                <a href="https://cnblogs.com/AurLemon" target="_blank" v-tippy="{ content: '博客园' }">
                                    <img src="../assets/images/logo/cnblogs_logo.svg" />
                                </a>
                            </div>
                        </div>
                    </a>
                </div>
            </div>
            <div class="page-about-footer__techstacks">
                <div class="page-about-footer__title">项目涉及的工具链（写在这=用过，≠会了）</div>
                <div class="page-about-footer__techstack" v-tippy="{ content: '先进👍' }">
                    <a href="https://cn.vitejs.dev/" target="_blank">
                        <img class="tech-logo" src="../assets/images/logo/Vite_logo.svg" />
                        Vite
                    </a>
                </div>
                <div class="page-about-footer__techstack" v-tippy="{ content: '和 React 比，Vue 写的习惯👍' }">
                    <a href="https://cn.vuejs.org/" target="_blank">
                        <img class="tech-logo" src="../assets/images/logo/Vuejs_logo.svg" />
                        Vue.js
                    </a>
                </div>
                <div class="page-about-footer__techstack" v-tippy="{ content: '类型检查写多了就习惯了，我们 TS 伟大无需多言' }">
                    <a href="https://www.typescriptlang.org/" target="_blank">
                        <img class="tech-logo" src="../assets/images/logo/TypeScript_logo.svg" />
                        TypeScript
                    </a>
                </div>
                <div class="page-about-footer__techstack" v-tippy="{ content: '方便，比事件总线好' }">
                    <a href="https://pinia.vuejs.org/zh/" target="_blank">
                        <img class="tech-logo" src="../assets/images/logo/pinia_logo.svg" />
                        Pinia
                    </a>
                </div>
                <div class="page-about-footer__techstack" v-tippy="{ content: '没有预处理器要写死了，沙比 CSS 写多了看着都头大' }">
                    <a href="https://sass-lang.com/" target="_blank">
                        <img class="tech-logo" src="../assets/images/logo/Sass_logo.svg" />
                        Sass
                    </a>
                </div>
                <div class="page-about-footer__techstack" v-tippy="{ content: '有点难看' }">
                    <a href="https://echarts.apache.org/" target="_blank">
                        <img class="tech-logo" src="../assets/images/logo/ECharts_logo.png" />
                        Apache ECharts
                    </a>
                </div>
                <div class="page-about-footer__techstack" v-tippy="{ content: '小项目感觉没必要用 UI 库，而且没几个好看的，特别是 Element 丑死了' }">
                    <a href="https://cnblogs.com/AurLemon" target="_blank">
                        <img class="tech-logo" src="../assets/images/logo/Noui_logo.png" />
                        手写 UI
                    </a>
                </div>
                <div class="page-about-footer__techstack" v-tippy="{ content: '俗称 Spring.js' }">
                    <a href="https://nestjs.com/" target="_blank">
                        <img class="tech-logo" src="../assets/images/logo/Nestjs_logo.svg" />
                        Nest.js
                    </a>
                </div>
                <div class="page-about-footer__techstack" v-tippy="{ content: '第一次用，高级' }">
                    <a href="https://typeorm.io/" target="_blank">
                        <img class="tech-logo" src="../assets/images/logo/TypeORM_logo.png" />
                        TypeORM
                    </a>
                </div>
            </div>
            <div class="page-about-footer__acknowledgements">
                <div class="page-about-footer__info">
                    感谢
                    <a href="https://fjgmxx.cn/" target="_blank">福建工贸学校</a>
                    的老师和同学们的支持，感谢
                    <a href="https://www.fjcpc.edu.cn/" target="_blank">福建船政交通职业学院</a>
                    有这个机会给我发挥
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.page-about {
    padding: 1.5rem !important;
    overflow: auto;

    .page-about-github {
        $img-value-length: 24px;
        text-align: center;
        padding: 3rem 2rem;
        margin: 1rem 0;
        border: 1px solid var(--border-color-base);
        outline: 3px solid transparent;
        border-radius: 12px;
        background: radial-gradient(ellipse at 5% 0%, #bf398910 0, transparent 75%), radial-gradient(ellipse at 60% 0%, #096bde10 0, transparent 75%);
        transition: 150ms ease;

        .page-about-github__name {
            font-size: 32px;
            font-weight: 600;
            margin-bottom: 0.25rem;
        }

        .page-about-github__desc {
            color: var(--color-base--subtle);
            font-size: 14px;
        }

        .page-about-github__info {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 1rem;
            margin-top: 0.5rem;

            .page-about-github__version {
                font-size: 14px;
                font-family: 'JetBrains Mono';
                padding: 2px 4px;
                border: 1px solid var(--border-color-base);
                border-radius: 4px;
                background: var(--color-surface-2);
            }
        }

        .page-about-github__links {
            display: flex;
            justify-content: center;
            gap: 0.5rem;
            margin-top: 1rem;

            img {
                display: block;
                width: $img-value-length;
                height: $img-value-length;
                border-radius: 50%;
                user-select: none;
            }
        }

        &:hover {
            outline-color: var(--color-primary);
        }
    }

    .page-about-content {
        padding: 0 1rem;
        margin: 1.75rem 0;

        .page-about-block {
            color: var(--color-base--subtle);
            font-size: 14px;
            text-align: center;
            line-height: 1.5;
            letter-spacing: 0.75px;

            p {
                margin: 8px 0;
            }
        }
    }

    .page-about-footer {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        padding-top: 3.5rem;

        .page-about-footer__title {
            color: var(--color-surface-4);
            font-size: 12px;
            text-align: center;
            flex: 1 0 100%;
            user-select: none;
        }

        .page-about-footer__contact {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 0.5rem;

            .page-about-footer__wrapper {
                min-width: 280px;

                a {
                    display: flex;
                    justify-content: space-between;
                    gap: 1rem;
                    color: var(--color-base--subtle);
                    font-size: 14px;
                    padding: 5px 10px;
                    border-radius: 6px;
                    background: var(--color-surface-2);
                    text-decoration: none;

                    .page-about-footer__user {
                        display: flex;
                        align-items: center;
                        gap: 0.25rem;

                        .page-about-footer__avatar {
                            $img-value-length: 20px;

                            img {
                                display: block;
                                width: $img-value-length;
                                height: $img-value-length;
                                border-radius: 50%;
                                user-select: none;
                            }
                        }

                        .page-about-footer__name {
                            font-weight: 600;
                        }

                        .page-about-footer__id {
                            color: var(--color-surface-4);
                            font-weight: 600;
                        }
                    }

                    .page-about-footer__whereru {
                        display: flex;
                        align-items: center;

                        .page-about-footer__iamhere {
                            $img-value-length: 18px;
                            display: flex;

                            a {
                                padding: 5px;
                                transition: 150ms ease;
                                border-radius: 50%;

                                img {
                                    display: block;
                                    width: $img-value-length;
                                    height: $img-value-length;
                                    user-select: none;
                                }

                                &:hover {
                                    background: var(--border-color-base);
                                }
                            }
                        }
                    }
                }
            }
        }

        .page-about-footer__techstacks {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 0.5rem;

            .page-about-footer__techstack {
                $img-value-length: 20px;

                a {
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                    color: var(--color-base--subtle);
                    font-size: 14px;
                    font-weight: 600;
                    text-decoration: none;
                    padding: 5px 10px;
                    border: 1px soldi var(--border-color-base--darker);
                    border-radius: 6px;
                    background: var(--color-surface-2);
                    transition: 150ms ease;
                    user-select: none;

                    img {
                        display: block;
                        height: $img-value-length;
                    }

                    &:hover {
                        background: var(--background-color-primary--active);
                    }

                    &:active {
                        transform: scale(0.95);
                    }
                }
            }
        }

        .page-about-footer__acknowledgements {
            display: flex;
            justify-content: center;
            align-items: baseline;
            gap: 0.25rem;
            color: var(--color-surface-4);
            font-size: 12px;
            text-align: center;
            margin-top: 0.5rem;

            a {
                color: var(--color-primary);
                text-decoration: none;
            }

            &::before,
            &::after {
                content: '❤';
            }
        }
    }
}
</style>
