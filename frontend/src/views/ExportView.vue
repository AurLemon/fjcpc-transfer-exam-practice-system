<script lang="ts" setup>
import { ref, computed, watch, onMounted } from 'vue'
import { get } from '@/api/api'
import { useNotifyStore } from '@/stores/notify'

const notifyStore = useNotifyStore()

interface Course {
    id: number
    name: string
}

interface Subject {
    courseId: number
    id: number
    name: string
}

interface ExportConfig {
    courses: Course[]
    subjects: Subject[]
}

// 导出设置
const exportSettings = ref({
    count: 50,
    course: 2,
    subject: 1,
    includeImage: false,
    questionType: -1 // 添加题目类型选择，默认为-1（全部题型）
})

// 配置数据
const config = ref<ExportConfig>({
    courses: [],
    subjects: []
})

// 加载状态
const isLoading = ref<boolean>(false)

// 根据选择的课程过滤科目
const filteredSubjects = computed(() => {
    return config.value.subjects.filter((subject) => subject.courseId === exportSettings.value.course || subject.courseId === 0)
})

// 获取课程和科目配置
const getExportConfig = async () => {
    isLoading.value = true
    try {
        const response: any = await get('/export/config')
        config.value = response.data.data
    } catch (error) {
        notifyStore.addMessage('failed', '获取导出配置失败，请稍后再试')
        console.error('Failed to get export configuration', error)
    } finally {
        isLoading.value = false
    }
}

const exportQuestions = () => {
    isLoading.value = true

    try {
        // 构建URL参数
        const params = new URLSearchParams()
        params.append('count', exportSettings.value.count.toString())
        params.append('course', exportSettings.value.course.toString())
        params.append('subject', exportSettings.value.subject.toString())
        params.append('includeImage', exportSettings.value.includeImage.toString())
        params.append('questionType', exportSettings.value.questionType.toString()) // 添加题目类型参数

        // 构建完整URL
        const url = `/api/export/questions?${params.toString()}`

        // 触发下载
        window.location.href = url

        notifyStore.addMessage('success', '正在导出题目，请稍等...')
    } catch (error) {
        notifyStore.addMessage('failed', '导出题目失败，请稍后再试')
        console.error('Failed to export questions', error)
    } finally {
        setTimeout(() => {
            isLoading.value = false
        }, 1000)
    }
}

// 重置表单
const resetForm = () => {
    exportSettings.value = {
        count: 50,
        course: 2,
        subject: 1,
        includeImage: false,
        questionType: -1 // 重置时也要设置题目类型为全部
    }
}

// 监听课程变化，重置科目选择
watch(
    () => exportSettings.value.course,
    (newVal) => {
        exportSettings.value.subject = 0
    }
)

// 组件挂载时获取配置
onMounted(() => {
    getExportConfig()
})
</script>

<template>
    <div class="page-export" :class="{ loading: isLoading }">
        <div class="page-container-title">
            <h1>导出题目</h1>
            <p>将题目导出为Word文档，方便离线学习和打印</p>
        </div>

        <div class="export-view-form">
            <div class="export-view-section">
                <h2>基本设置</h2>

                <div class="export-view-field">
                    <label for="count">题目数量</label>
                    <div class="export-view-input-wrapper">
                        <input type="number" id="count" v-model="exportSettings.count" min="1" max="100" class="export-view-input" />
                        <div class="export-view-input-hint">导出题目的数量，最多100题</div>
                    </div>
                </div>

                <div class="export-view-field">
                    <label for="course">课程类型</label>
                    <div class="export-view-input-wrapper">
                        <select id="course" v-model="exportSettings.course" class="export-view-select">
                            <option v-for="course in config.courses" :key="course.id" :value="course.id">
                                {{ course.name }}
                            </option>
                        </select>
                    </div>
                </div>

                <div class="export-view-field">
                    <label for="subject">科目</label>
                    <div class="export-view-input-wrapper">
                        <select id="subject" v-model="exportSettings.subject" class="export-view-select">
                            <option v-for="subject in filteredSubjects" :key="subject.id" :value="subject.id">
                                {{ subject.name }}
                            </option>
                        </select>
                    </div>
                </div>

                <div class="export-view-field">
                    <label for="questionType">题目类型</label>
                    <div class="export-view-input-wrapper">
                        <select id="questionType" v-model="exportSettings.questionType" class="export-view-select">
                            <option value="-1">所有题型</option>
                            <option value="0">单选题</option>
                            <option value="1">多选题</option>
                            <option value="2">判断题</option>
                            <option value="8">阅读题</option>
                        </select>
                    </div>
                </div>

                <div class="export-view-field">
                    <label for="includeImage">包含图片</label>
                    <div class="export-view-input-wrapper">
                        <div class="export-view-checkbox-wrapper">
                            <input type="checkbox" id="includeImage" v-model="exportSettings.includeImage" class="export-view-checkbox" />
                            <span class="export-view-checkbox-label">包含带图片的题目</span>
                        </div>
                        <div class="export-view-input-hint">有一点 BUG，图片的尺寸不太对，如果不勾选，将只导出不包含图片的题目。</div>
                    </div>
                </div>
            </div>

            <div class="export-view-actions">
                <button @click="resetForm" class="export-view-button export-view-button-secondary">
                    <span class="material-icons">refresh</span>
                    重置
                </button>

                <button @click="exportQuestions" class="export-view-button export-view-button-primary" :disabled="isLoading">
                    <span class="material-icons">download</span>
                    导出题目
                </button>
            </div>
        </div>

        <div class="export-view-loading" v-if="isLoading">
            <span class="material-icons">autorenew</span>
            <div class="export-view-loading-text">正在处理...</div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.page-export {
    display: flex;
    flex-direction: column;
    padding: 1.5rem;
    height: 100%;
    position: relative;
    overflow-y: auto;

    @keyframes loading {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }

    &.loading {
        pointer-events: none;

        .page-container-title,
        .export-view-form {
            opacity: 0.5;
            filter: grayscale(1);
        }
    }

    .page-container-title {
        h1 {
            font-size: inherit;
            font-weight: inherit;
            margin: 0;
        }

        p {
            font-size: 14px;
            color: var(--color-surface-4);
        }
    }

    .export-view-form {
        display: flex;
        flex-direction: column;
        gap: 2rem;
        margin: 0 1rem;

        .export-view-section {
            h2 {
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 1rem;
                padding-bottom: 0.5rem;
                border-bottom: 1px solid var(--border-color-base);
            }

            .export-view-field {
                display: flex;
                align-items: baseline;
                margin-bottom: 1.25rem;

                label {
                    flex: 0 0 80px;
                    font-weight: 500;
                }

                .export-view-input-wrapper {
                    flex: 1;

                    .export-view-input,
                    .export-view-select {
                        width: 100%;
                        max-width: 300px;
                        padding: 8px 10px;
                        border: 1px solid var(--border-color-base);
                        border-radius: 8px;
                        background-color: var(--background-color-primary--active);
                        transition: 150ms ease;

                        &:hover {
                            background-color: var(--color-surface-3);
                        }

                        &:focus {
                            border-color: var(--color-primary);
                            outline: none;
                        }
                    }

                    .export-view-checkbox-wrapper {
                        display: flex;
                        align-items: center;

                        .export-view-checkbox {
                            margin-right: 0.5rem;
                        }
                    }

                    .export-view-input-hint {
                        font-size: 12px;
                        color: var(--color-surface-4);
                        margin-top: 0.25rem;
                    }
                }
            }
        }

        .export-view-actions {
            display: flex;
            justify-content: flex-end;
            gap: 1rem;
            margin-top: 1rem;

            .export-view-button {
                display: flex;
                align-items: center;
                gap: 0.25rem;
                padding: 8px 16px;
                border-radius: 8px;
                border: none;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: 150ms ease;

                .material-icons {
                    font-size: 18px;
                }

                &:active {
                    transform: scale(0.98);
                }

                &:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                &.export-view-button-primary {
                    color: var(--color-surface-0);
                    background-color: var(--color-primary);

                    &:hover:not(:disabled) {
                        background-color: var(--color-base--subtle);
                    }
                }

                &.export-view-button-secondary {
                    color: var(--color-base--emphasized);
                    background-color: var(--color-surface-2);

                    &:hover {
                        background-color: var(--color-surface-3);
                    }
                }
            }
        }
    }

    .export-view-loading {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        background-color: rgba(255, 255, 255, 0.5);
        backdrop-filter: blur(3px);
        z-index: 10;

        .material-icons {
            font-size: 48px;
            animation: loading 1s ease-in-out infinite;
            color: var(--color-primary);
            margin-bottom: 1rem;
        }

        .export-view-loading-text {
            font-weight: 500;
        }
    }
}
</style>
