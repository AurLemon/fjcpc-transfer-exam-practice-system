<script lang="ts">
import { ref } from 'vue'
import axios from 'axios'

export default {
  setup() {
    const sfz = ref('') // 身份证号
    const lxlx = ref('') // 联系类型
    const xsid = ref('') // 学生ID
    const userOutput = ref('') // 用户信息输出
    const paperOutput = ref('') // 试卷信息输出
    const errorMessage = ref('') // 错误信息输出
    const isError = ref(false) // 判断是否为错误

    const getUserInfo = async () => {
      try {
        const response = await axios.post(
          'https://appzb.fjcpc.edu.cn/kszx-api/kszx-back/StudentTest32/test32UserLogin',
          {
            sfz: sfz.value,
          },
        )
        const result = response.data.data.outmap
        if (result.err === 'success') {
          isError.value = false
          const student = result.xs
          userOutput.value = `学校: ${student.xx}\n姓名: ${student.xm}\n身份证: ${student.sfz}\n专业: ${student.zy}\n照片: ${student.zp}`
        } else {
          isError.value = true
          errorMessage.value = result.err
        }
      } catch (error) {
        isError.value = true
        errorMessage.value = `请求失败: ${error}`
      }
    }

    const getTestPaper = async () => {
      try {
        const response = await axios.post(
          'https://appzb.fjcpc.edu.cn/kszx-api/kszx-back/StudentTest32/getTestSjTmInfo',
          {
            lxlx: lxlx.value,
            xsid: xsid.value,
          },
        )
        paperOutput.value = JSON.stringify(response.data, null, 2)
      } catch (error) {
        paperOutput.value = `请求失败: ${error}`
      }
    }

    return {
      sfz,
      lxlx,
      xsid,
      userOutput,
      paperOutput,
      errorMessage,
      isError,
      getUserInfo,
      getTestPaper,
    }
  },
}
</script>

<template>
  <div class="page-container-slide page-debug">
    <div class="page-container-title">调试</div>

    <div class="page-debug-wrapper student-info">
      <div class="page-debug-desc">
        <span class="http-type">POST</span>
        <div class="page-debug-title">获取用户信息</div>
        <div class="page-debug-use">通过身份证件获取学生信息</div>
      </div>
      <div class="page-debug-url">
        https://appzb.fjcpc.edu.cn/kszx-api/kszx-back/StudentTest32/test32UserLogin
      </div>
      <div class="page-debug-info">
        <div class="page-debug-input">
          <div class="page-debug-info__title">
            输入
            <button @click="getUserInfo">发送请求</button>
          </div>
          <input type="text" v-model="sfz" placeholder="身份证号" />
        </div>
        <div class="page-debug-output">
          <div class="page-debug-info__title">输出</div>
          <div class="page-debug-output-info">
            <pre v-if="!isError">{{ userOutput }}</pre>
            <pre v-else style="color: red">{{ errorMessage }}</pre>
          </div>
        </div>
      </div>
    </div>

    <div class="page-debug-wrapper paper-info">
      <div class="page-debug-desc">
        <span class="http-type">POST</span>
        <div class="page-debug-title">获取试卷</div>
        <div class="page-debug-use">传入联系类型和身份证件获取试卷信息</div>
      </div>
      <div class="page-debug-url">
        https://appzb.fjcpc.edu.cn/kszx-api/kszx-back/StudentTest32/getTestSjTmInfo
      </div>
      <div class="page-debug-info">
        <div class="page-debug-input">
          <div class="page-debug-info__title">
            输入
            <button @click="getTestPaper">发送请求</button>
          </div>
          <input
            type="text"
            v-model="lxlx"
            placeholder="试卷类型（1为文化课，2为专业课）"
          />
          <input type="text" v-model="xsid" placeholder="身份证号" />
        </div>
        <div class="page-debug-output">
          <div class="page-debug-info__title">输出</div>
          <div class="page-debug-output-info">
            <pre>{{ paperOutput }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/media_screen.scss' as screen;

.page-debug {
  word-break: break-all;
  overflow-y: auto;

  .page-debug-wrapper {
    padding: 15px;
    border: 1px solid var(--border-color-base--darker);
    border-radius: 12px;
    margin-bottom: 1rem;

    .page-debug-desc {
      display: grid;
      align-items: center;
      grid-template-columns: 40px max-content;
      column-gap: 0.5rem;
      color: var(--color-base--subtle);

      .http-type {
        grid-row: span 2;
        display: flex;
        justify-content: center;
        align-items: center;
        color: var(--color-primary);
        font-size: 12px;
        font-weight: 600;
        border-radius: 4px;
      }

      .page-debug-title {
        color: var(--color-base--emphasized);
      }

      .page-debug-use {
        font-size: 12px;
        grid-column: 3;

        @include screen.media-screen(mobile) {
          grid-column: unset;
        }
      }
    }

    .page-debug-url {
      font-size: 12px;
      font-family: 'JetBrains Mono';
      padding: 0.25rem;
      margin: 0.25rem 0;
      border-radius: 8px;
      background: var(--color-surface-2);
    }

    .page-debug-info {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-top: 1.5rem;

      .page-debug-info__title {
        display: flex;
        align-items: center;
        font-size: 14px;
        margin-bottom: 0.5rem;

        button {
          margin: 0;
          padding: 2px 4px;
          transition: 150ms ease;
          margin-left: 1rem;

          &:hover {
            color: var(--color-primary);
          }
        }

        label {
          color: var(--color-base--subtle);
          display: flex;
          align-items: center;
          gap: 0.25rem;
          margin-left: 0.5rem;
        }
      }

      .page-debug-input,
      .page-debug-output {
        display: flex;
        flex-direction: column;
        flex: 0 0 50%;
      }

      .page-debug-output-info {
        height: 100%;
        word-break: break-all;
      }

      pre {
        padding: 8px;
        margin: 0;
        height: 100%;
        border-radius: 12px;
        background: var(--color-surface-2);
        overflow: auto;
        transition: 300ms ease;
      }

      input {
        margin: 4px 0;
      }
    }
  }
}
</style>
