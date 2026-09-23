<script lang="ts" setup>
import { ref } from 'vue'
import dayjs from 'dayjs'

import { get, post, getPublicKey } from '@/api/api'
import { sm2Encrypt } from '@/utils/crypto'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
import { useQuestionStore } from '@/stores/question'
import { useCardStore } from '@/stores/card'
import { useNotifyStore } from '@/stores/notify'

const authStore = useAuthStore()
const userStore = useUserStore()
const questionStore = useQuestionStore()
const cardStore = useCardStore()
const notifyStore = useNotifyStore()

const userSettingMap: Record<number, string> = {
  0: 'user_main_profession_subject', // 专业课科目
  1: 'auto_sync_data', // 自动同步数据
  2: 'auto_save_progress', // 自动更新进度
  3: 'auto_star_question', // 自动保存错题
  4: 'show_user_stat', // 允许向其他人展示做题进度
  5: 'show_name', // 对外展示的姓名 'id_number' 或 'nick'
}

const changeMainSubject = async (mainSubject: number): Promise<void> => {
  if (userStore.setting.user_main_profession_subject === mainSubject) return
  await authStore.saveUserSetting({ user_main_profession_subject: mainSubject })
}

const changeSetting = (mapIndex: number, value: any) => {
  if (userStore.login.isLogged && !userStore.login.refreshing) {
    const key = userSettingMap[mapIndex]
    authStore.saveUserSetting({ [key]: value })
  } else {
    userStore.setting[userSettingMap[mapIndex]] = value
    if (!authStore.readUserSetting()) {
      authStore.setUserSetting()
    }
    authStore.setUserSetting()
  }
}

const formatTimestamp = (timestamp: string): string => {
  return dayjs(Number(timestamp)).format('YYYY-MM-DD HH:mm:ss')
}

const resetPassword = () => {
  cardStore.closeAllCard()
  cardStore.showAuthCard = true
}

const isSyncAccount = ref<boolean>(false)
const isSyncLoading = ref<boolean>(false)
const account = ref('')
const status = ref('')

const syncAccountStatus = () => {
  isSyncAccount.value = !isSyncAccount.value
}

const syncIdNumber = async () => {
  isSyncLoading.value = true
  status.value = '加载中'

  try {
    if (!account.value) {
      status.value = '请输入身份证号'
      return
    }

    const publicKey = await getPublicKey()
    if (!publicKey) {
      status.value = '获取公钥失败，请重试'
      return
    }

    const encryptedIdNumber = sm2Encrypt(account.value, publicKey)
    if (!encryptedIdNumber) {
      status.value = '加密失败，请检查输入'
      return
    }

    const response: any = await post(
      '/user/sync',
      {
        id_number: encryptedIdNumber,
      },
      {
        headers: {
          Authorization: `Bearer ${authStore.readToken()}`,
        },
      },
    )

    if (response.data.code === 200) {
      status.value = '同步成功'
      await authStore.getUserProfile()
      account.value = ''
    } else {
      status.value = `同步失败：${response.message || '未知错误'}`
    }
  } catch (error: any) {
    status.value = `同步失败：${error.message || '网络错误'}`
  } finally {
    setTimeout(() => {
      isSyncLoading.value = false
      isSyncAccount.value = false
      status.value = ''
    }, 3000)
  }
}

const isEditNick = ref<boolean>(false)
const nickInput = ref<string>(userStore.profile.nick || '')

const toggleEdit = () => {
  isEditNick.value = true
  nickInput.value = userStore.profile.nick || ''
}

const cancelEdit = () => {
  isEditNick.value = false
  nickInput.value = userStore.profile.nick || ''
}

const saveNick = async () => {
  if (!nickInput.value.trim()) {
    notifyStore.addMessage('error', '昵称不能为空')
    return
  }

  try {
    const response: any = await post(
      '/user/nick',
      {
        nick: nickInput.value,
      },
      {
        headers: {
          Authorization: `Bearer ${authStore.readToken()}`,
        },
      },
    )

    if (response.data.code === 200) {
      notifyStore.addMessage('success', '昵称修改成功')
      await authStore.getUserProfile()
    } else {
      console.log(response.data)

      notifyStore.addMessage(
        'failed',
        `修改失败：${response.data.data.message || '未知错误'}`,
      )
    }
  } catch (error) {
    notifyStore.addMessage('failed', '网络错误，请重试')
  } finally {
    isEditNick.value = false
    nickInput.value = ''
  }
}
</script>

<template>
  <div class="page-container-slide page-advanced">
    <div class="page-container-title">设置</div>
    <div
      class="page-advanced-user"
      v-if="userStore.login.isLogged && !userStore.login.refreshing"
    >
      <div class="page-advanced-user__info">
        <div
          class="page-advanced-user__wrapper"
          v-if="userStore.profile.name && userStore.profile.id_number"
        >
          <div class="page-advanced-user__name">
            {{ userStore.profile.name }}
          </div>
          <div class="page-advanced-user__id">
            {{ userStore.profile.id_number }}
          </div>
        </div>
        <div
          class="page-advanced-user__wrapper"
          v-else
          :class="{ nick: userStore.profile.nick }"
        >
          <div class="page-advanced-user__name">
            {{ userStore.profile.nick }}
          </div>
        </div>
        <div class="page-advanced-user__uuid">{{ userStore.profile.uuid }}</div>
      </div>
      <div class="page-advanced-user__tags">
        <div class="page-advanced-user__regdate page-advanced-user__tag">
          注册时间
          <span class="data">{{
            formatTimestamp(userStore.profile.reg_date)
          }}</span>
        </div>
        <div class="page-advanced-user__lastlogin page-advanced-user__tag">
          上次登录
          <span class="data">{{
            formatTimestamp(userStore.profile.last_login)
          }}</span>
        </div>
        <div
          class="page-advanced-user__resetpw page-advanced-user__tag"
          @click="resetPassword"
        >
          重置密码
        </div>
      </div>
    </div>
    <div class="page-advanced-basic">
      <div class="page-advanced-basic__mainsubject">
        <div class="page-advanced-basic__name">切换主专业课</div>
        <div
          class="page-advanced-basic__subject"
          v-for="subject in questionStore.questionInfo.profession_lesson"
          :key="subject.subject"
          :class="{
            active:
              userStore.setting.user_main_profession_subject ===
              subject.subject,
          }"
          @click="changeMainSubject(subject.subject)"
        >
          <div class="id">{{ subject.subject }}</div>
          {{ subject.name }}
        </div>
      </div>
      <div class="page-advanced-basic__nick" v-if="userStore.login.isLogged">
        <div class="page-advanced-basic__name">
          昵称
          <div class="page-advanced-basic__tags" v-if="!isEditNick">
            <div class="page-advanced-basic__tag edit" @click="toggleEdit">
              编辑
            </div>
          </div>
          <div class="page-advanced-basic__tags" v-else>
            <div class="page-advanced-basic__tag cancel" @click="cancelEdit">
              取消
            </div>
            <div class="page-advanced-basic__tag save" @click="saveNick">
              保存
            </div>
          </div>
        </div>
        <div class="page-advanced-basic__wrapper" v-if="!isEditNick">
          {{ userStore.profile.nick || '无' }}
        </div>
        <div class="page-advanced-basic__wrapper" v-else>
          <UInput
            v-model="nickInput"
            type="text"
            placeholder="请输入新昵称"
            class="page-advanced-basic__input"
            max-length="20"
          />
        </div>
      </div>
      <div
        class="page-advanced-basic__idnumber"
        v-if="userStore.login.isLogged"
      >
        <div class="page-advanced-basic__name">
          船政转轨练习系统对应的身份证
          <div
            class="page-advanced-basic__tags"
            v-if="!userStore.profile.id_number"
          >
            <div
              class="page-advanced-basic__tag add"
              @click="syncAccountStatus"
              v-if="!isSyncAccount"
            >
              新增
            </div>
            <div
              class="page-advanced-basic__tag cancel"
              @click="syncAccountStatus"
              v-if="isSyncAccount && !isSyncLoading"
            >
              取消
            </div>
            <div
              class="page-advanced-basic__tag sync"
              @click="syncIdNumber"
              v-if="isSyncAccount && !isSyncLoading"
            >
              同步
            </div>
            <div
              class="page-advanced-basic__tag status"
              v-if="isSyncAccount && isSyncLoading"
            >
              {{ status }}
            </div>
          </div>
        </div>
        <div class="page-advanced-basic__wrapper" v-if="!isSyncAccount">
          {{ userStore.profile.id_number ? userStore.profile.id_number : '无' }}
        </div>
        <div class="page-advanced-basic__wrapper" v-else>
          <UInput
            v-model="account"
            type="text"
            placeholder="请输入身份证号"
            class="page-advanced-basic__input"
          />
        </div>
      </div>
      <div
        class="page-advanced-basic__setting"
        v-if="userStore.login.isLogged && !userStore.login.refreshing"
      >
        <div
          class="page-advanced-basic__button material-icons"
          @click="changeSetting(4, !userStore.setting.show_user_stat)"
        >
          {{
            userStore.setting.show_user_stat
              ? 'check_circle'
              : 'check_circle_outline'
          }}
        </div>
        <div class="page-advanced-basic__title">公开用户数据</div>
        <div class="page-advanced-basic__desc">
          如果勾选，你的数据会在统计页面被其它用户看到👁👁。
        </div>
      </div>
      <div
        class="page-advanced-basic__setting"
        v-if="
          userStore.login.isLogged &&
          !userStore.login.refreshing &&
          userStore.setting.show_user_stat
        "
      >
        <div
          class="page-advanced-basic__button material-icons"
          @click="
            changeSetting(
              5,
              userStore.setting.show_name === 'id_number'
                ? 'nick'
                : 'id_number',
            )
          "
        >
          {{
            userStore.setting.show_name === 'id_number'
              ? 'remove_red_eye'
              : 'interests'
          }}
        </div>
        <div class="page-advanced-basic__title">
          当前对外展示的为：{{
            userStore.setting.show_name === 'id_number' ? '真实数据' : '昵称'
          }}
        </div>
        <div class="page-advanced-basic__desc">
          点击后切换对外展示的名称，可以自由切换为真实数据或昵称。
        </div>
      </div>
      <div class="page-advanced-basic__setting">
        <div
          class="page-advanced-basic__button material-icons"
          @click="changeSetting(1, !userStore.setting.auto_sync_data)"
        >
          {{
            userStore.setting.auto_sync_data
              ? 'check_circle'
              : 'check_circle_outline'
          }}
        </div>
        <div class="page-advanced-basic__title">自动对齐数据</div>
        <div class="page-advanced-basic__desc">
          如果勾选，当本地的做题进度比服务器数据多的时候，会合并同步本地和远程的数据到服务器。
        </div>
      </div>
      <div class="page-advanced-basic__setting">
        <div
          class="page-advanced-basic__button material-icons"
          @click="changeSetting(2, !userStore.setting.auto_save_progress)"
        >
          {{
            userStore.setting.auto_save_progress
              ? 'check_circle'
              : 'check_circle_outline'
          }}
        </div>
        <div class="page-advanced-basic__title">自动保存进度</div>
        <div class="page-advanced-basic__desc">
          如果勾选，做完一题后，这题会自动标记已完成。
        </div>
      </div>
      <div class="page-advanced-basic__setting">
        <div
          class="page-advanced-basic__button material-icons"
          @click="changeSetting(3, !userStore.setting.auto_star_question)"
        >
          {{
            userStore.setting.auto_star_question
              ? 'check_circle'
              : 'check_circle_outline'
          }}
        </div>
        <div class="page-advanced-basic__title">自动收藏错题</div>
        <div class="page-advanced-basic__desc">
          如果勾选，做错一题后，这题会自动收藏至错题集。
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-advanced {
  $value-page-gap: 3rem;
  overflow-y: auto;

  .page-advanced-user {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: $value-page-gap;

    .page-advanced-user__info {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 0.75rem 0 1.5rem 0;
      width: 100%;

      .page-advanced-user__wrapper {
        font-size: 24px;
        display: flex;
        align-items: center;
        gap: 1rem;

        &.nick {
          width: 100%;
        }
      }

      .page-advanced-user__name {
        width: 100%;
        font-weight: 600;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .page-advanced-user__id {
        font-size: 20px;
      }

      .page-advanced-user__uuid {
        color: var(--color-surface-4);
        font-size: 14px;
        font-family: 'JetBrains Mono';
        text-align: center;
        word-break: break-all;
      }
    }

    .page-advanced-user__tags {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 0.5rem;
      color: var(--color-base--subtle);
      font-size: 12px;

      .page-advanced-user__tag {
        background: var(--background-color-primary--hover);
        padding: 2px 10px;
        border-radius: 16px;

        .data {
          font-weight: 600;
        }
      }

      .page-advanced-user__resetpw {
        background: var(--border-color-base);
        transition: 150ms;
        user-select: none;
        cursor: pointer;

        &:hover {
          color: var(--color-surface-0);
          background: var(--color-primary);
        }

        &:active {
          transform: scale(0.85);
        }
      }
    }
  }

  .page-advanced-basic {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: $value-page-gap * 1.75;

    .page-advanced-basic__mainsubject,
    .page-advanced-basic__idnumber,
    .page-advanced-basic__nick {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      padding: 1.25rem;
      border-radius: 8px;
      background: var(--color-surface-2);
      margin-bottom: 0.5rem;

      .page-advanced-basic__name {
        flex: 0 0 100%;
        color: var(--color-base--subtle);
        font-size: 12px;
      }

      .page-advanced-basic__subject {
        display: flex;
        align-items: center;
        flex-direction: column;
        gap: 2px;
        color: var(--color-base--subtle);
        font-size: 12px;
        text-align: center;
        width: 70px;
        height: 100%;
        padding: 0.5rem;
        background: var(--background-color-primary--active);
        border-radius: 8px;
        transition: 150ms;
        user-select: none;
        cursor: pointer;

        &.active {
          color: var(--color-surface-0);
          background: var(--color-primary);
        }

        .id {
          display: flex;
          justify-content: center;
          align-items: center;
          color: var(--color-primary);
          font-size: 8px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--color-surface-0);
        }

        &:hover {
          background: var(--color-base--subtle);
        }
      }

      .page-advanced-basic__tags {
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        gap: 0.5rem;
        color: var(--color-base--subtle);

        .page-advanced-basic__tag {
          background: var(--border-color-input);
          padding: 1px 10px;
          border-radius: 16px;
          transition: 300ms;

          &:hover {
            color: var(--color-surface-0);
            background: var(--color-primary);
            cursor: pointer;
          }

          &.sync {
            color: var(--color-surface-0);
            background: var(--success-color);
          }
        }
      }
    }

    .page-advanced-basic__idnumber,
    .page-advanced-basic__nick {
      .page-advanced-basic__name {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .page-advanced-basic__wrapper {
        width: 100%;
        font-weight: 600;
        font-size: 18px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;

        input {
          width: 100%;
          font-weight: 600;
          font-size: 1.0625rem;
        }
      }
    }

    .page-advanced-basic__setting {
      display: grid;
      grid-template-columns: 24px auto;
      column-gap: 0.25rem;

      .page-advanced-basic__button {
        display: flex;
        justify-content: center;
        align-items: center;
        color: var(--color-primary);
        font-size: 20px;
        padding: 3px;
        border-radius: 50%;
        transition: 150ms;
        user-select: none;
        cursor: pointer;

        &:hover {
          background: var(--border-color-base);
        }

        &:active {
          transform: scale(0.85);
        }
      }

      .page-advanced-basic__title {
        display: flex;
        align-items: center;
        color: var(--color-base--subtle);
        letter-spacing: 0.75px;
      }

      .page-advanced-basic__desc {
        grid-column: 2;
        color: var(--color-surface-4);
        font-size: 12px;
        line-height: 1;
      }
    }
  }

  .page-advanced-server {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.75rem;
    border: 1px solid var(--border-color-base--darker);
    border-radius: 16px;
    margin-bottom: 1.5rem;

    .page-advanced-server__title {
      color: var(--color-base--subtle);
      font-size: 12px;
      text-align: center;
      margin-bottom: 0.5rem;
    }

    .page-advanced-server__form {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .page-advanced-server__input {
      flex: 1;
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;

      input {
        margin: 0;
        border-color: var(--border-color-base);
      }

      label {
        display: flex;
        align-items: center;
        gap: 2px;
        color: var(--color-base--subtle);
        font-size: 12px;
      }
    }

    button {
      flex: 0 0 80px;
      height: fit-content;
      border-color: transparent;
      background: var(--background-color-primary--active);
      transition: 150ms;
      user-select: none;
      cursor: pointer;

      &:hover {
        color: var(--color-surface-0);
        background: var(--color-primary);
      }
    }

    .page-advanced-server__info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--color-base);
      font-size: 12px;
      margin: 2px 0.25rem;

      .material-icons {
        color: var(--color-base);
        font-size: 16px;
      }
    }

    .page-advanced-server__crawl {
      .page-advanced-server__input {
        display: flex;
        align-items: center;
        gap: 1.5rem;

        .course-selection,
        .subject-selection {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
      }
    }
  }
}
</style>
