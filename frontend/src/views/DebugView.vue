<script lang="ts" setup>
import { ref } from 'vue'
import axios from 'axios'
import { useToast } from '@nuxt/ui/composables/useToast'

interface StudentInfo {
  xx?: string
  xm?: string
  sfz?: string
  zy?: string
  zp?: string
}

interface UserInfoResponse {
  data?: {
    outmap?: {
      err?: string
      xs?: StudentInfo
    }
  }
  message?: string
}

const toast = useToast()
const apiBaseUrl = 'https://appzb.fjcpc.edu.cn/kszx-api/kszx-back/StudentTest32'
const userInfoUrl = `${apiBaseUrl}/test32UserLogin`
const paperInfoUrl = `${apiBaseUrl}/getTestSjTmInfo`

const sfz = ref('')
const lxlx = ref('')
const xsid = ref('')
const userOutput = ref('')
const paperOutput = ref('')
const isUserLoading = ref(false)
const isPaperLoading = ref(false)

const notifyError = (title: string, message: string) => {
  toast.add({
    title,
    description: message,
    color: 'error',
    icon: 'i-lucide-circle-alert',
  })
}

const getErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as
      | { message?: string; error?: string }
      | undefined
    return responseData?.message || responseData?.error || error.message
  }

  return error instanceof Error ? error.message : String(error)
}

const getUserInfo = async () => {
  if (!sfz.value.trim()) {
    notifyError('获取用户信息失败', '请先输入身份证号。')
    return
  }

  isUserLoading.value = true
  userOutput.value = ''

  try {
    const response = await axios.post<UserInfoResponse>(userInfoUrl, {
      sfz: sfz.value.trim(),
    })
    const result = response.data.data?.outmap

    if (!result || result.err !== 'success' || !result.xs) {
      notifyError(
        '获取用户信息失败',
        result?.err || '接口未返回有效的学生信息。',
      )
      return
    }

    const student = result.xs
    userOutput.value = [
      `学校: ${student.xx || '—'}`,
      `姓名: ${student.xm || '—'}`,
      `身份证: ${student.sfz || '—'}`,
      `专业: ${student.zy || '—'}`,
      `照片: ${student.zp || '—'}`,
    ].join('\n')
  } catch (error) {
    notifyError('获取用户信息失败', getErrorMessage(error))
  } finally {
    isUserLoading.value = false
  }
}

const getTestPaper = async () => {
  if (!lxlx.value.trim() || !xsid.value.trim()) {
    notifyError('获取试卷失败', '请填写试卷类型和身份证号。')
    return
  }

  isPaperLoading.value = true
  paperOutput.value = ''

  try {
    const response = await axios.post(paperInfoUrl, {
      lxlx: lxlx.value.trim(),
      xsid: xsid.value.trim(),
    })
    const responseData = response.data as {
      code?: number
      message?: string
      data?: { outmap?: { err?: string } }
    }
    const apiError = responseData.data?.outmap?.err

    if (apiError && apiError !== 'success') {
      notifyError('获取试卷失败', apiError)
      return
    }

    if (responseData.code && responseData.code !== 200) {
      notifyError('获取试卷失败', responseData.message || '接口返回错误。')
      return
    }

    paperOutput.value = JSON.stringify(responseData, null, 2)
  } catch (error) {
    notifyError('获取试卷失败', getErrorMessage(error))
  } finally {
    isPaperLoading.value = false
  }
}
</script>

<template>
  <div class="page-container-slide page-debug">
    <div class="page-container-title">调试</div>

    <div class="debug-endpoints">
      <UCard class="debug-card">
        <template #header>
          <div class="debug-card-header">
            <div class="debug-card-heading">
              <h2>获取用户信息</h2>
              <p>通过身份证件获取学生信息</p>
            </div>
            <UBadge color="neutral">POST</UBadge>
          </div>
          <code class="debug-endpoint-url">{{ userInfoUrl }}</code>
        </template>

        <div class="debug-request-layout">
          <section class="debug-panel" aria-labelledby="user-input-title">
            <div class="debug-panel-heading">
              <h3 id="user-input-title">请求参数</h3>
              <UButton
                icon="i-lucide-send"
                variant="link"
                :loading="isUserLoading"
                :disabled="isUserLoading"
                @click="getUserInfo"
              >
                发送请求
              </UButton>
            </div>
            <UFormField label="身份证号" class="w-full">
              <UInput
                v-model="sfz"
                class="w-full"
                placeholder="请输入身份证号"
                autocomplete="off"
                @keyup.enter="getUserInfo"
              />
            </UFormField>
          </section>

          <section class="debug-panel" aria-labelledby="user-output-title">
            <div class="debug-panel-heading">
              <h3 id="user-output-title">响应结果</h3>
            </div>
            <pre v-if="userOutput" class="debug-output">{{ userOutput }}</pre>
            <div v-else class="debug-output-empty">
              <UIcon name="i-lucide-inbox" />
              <span>成功响应会显示在这里</span>
            </div>
          </section>
        </div>
      </UCard>

      <UCard class="debug-card">
        <template #header>
          <div class="debug-card-header">
            <div class="debug-card-heading">
              <h2>获取试卷</h2>
              <p>传入试卷类型和身份证件获取试卷信息</p>
            </div>
            <UBadge color="neutral">POST</UBadge>
          </div>
          <code class="debug-endpoint-url">{{ paperInfoUrl }}</code>
        </template>

        <div class="debug-request-layout">
          <section class="debug-panel" aria-labelledby="paper-input-title">
            <div class="debug-panel-heading">
              <h3 id="paper-input-title">请求参数</h3>
              <UButton
                icon="i-lucide-send"
                variant="link"
                :loading="isPaperLoading"
                :disabled="isPaperLoading"
                @click="getTestPaper"
              >
                发送请求
              </UButton>
            </div>
            <UFormField label="试卷类型" class="w-full">
              <UInput
                v-model="lxlx"
                class="w-full"
                placeholder="1 为文化课，2 为专业课"
                autocomplete="off"
              />
            </UFormField>
            <UFormField label="身份证号" class="w-full">
              <UInput
                v-model="xsid"
                class="w-full"
                placeholder="请输入身份证号"
                autocomplete="off"
                @keyup.enter="getTestPaper"
              />
            </UFormField>
          </section>

          <section class="debug-panel" aria-labelledby="paper-output-title">
            <div class="debug-panel-heading">
              <h3 id="paper-output-title">响应结果</h3>
            </div>
            <pre v-if="paperOutput" class="debug-output">{{ paperOutput }}</pre>
            <div v-else class="debug-output-empty">
              <UIcon name="i-lucide-inbox" />
              <span>成功响应会显示在这里</span>
            </div>
          </section>
        </div>
      </UCard>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-debug {
  overflow-y: auto;
}

.debug-endpoints {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding-bottom: 2rem;
}

.debug-card {
  min-width: 0;
}

.debug-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.debug-card-heading {
  min-width: 0;

  h2 {
    margin: 0;
    color: var(--color-base--emphasized);
    font-size: 1.125rem;
    font-weight: 650;
    line-height: 1.4;
  }

  p {
    margin: 0.35rem 0 0;
    color: var(--color-base--subtle);
    font-size: 0.875rem;
    line-height: 1.5;
  }
}

.debug-endpoint-url {
  display: block;
  margin-top: 1rem;
  padding: 0.625rem 0.75rem;
  border-radius: 0.5rem;
  background: var(--color-surface-2);
  color: var(--color-base--subtle);
  font-size: 0.8125rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.debug-request-layout {
  display: grid;
  grid-template-columns: minmax(16rem, 0.8fr) minmax(0, 1.2fr);
  gap: 1.5rem;
}

.debug-panel {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.875rem;
}

.debug-panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;

  h3 {
    margin: 0;
    color: var(--color-base);
    font-size: 0.9375rem;
    font-weight: 600;
  }
}

.debug-output,
.debug-output-empty {
  min-height: 8rem;
  max-height: 22rem;
  margin: 0;
  padding: 0.875rem 1rem;
  overflow: auto;
  border: 1px solid var(--border-color-base--darker);
  border-radius: 0.625rem;
  background: var(--color-surface-1);
  color: var(--color-base);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8125rem;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.debug-output-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: var(--color-base--subtle);
  font-family: inherit;
}

@media (max-width: 800px) {
  .debug-request-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 1.25rem;
  }
}

@media (max-width: 600px) {
  .debug-card-header {
    gap: 0.5rem;
  }

  .debug-endpoint-url {
    font-size: 0.75rem;
  }

  .debug-panel-heading {
    align-items: flex-start;
  }
}
</style>
