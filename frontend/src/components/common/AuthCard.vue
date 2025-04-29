<script lang="ts" setup>
import { ref, watch } from 'vue'
import { debounce } from '@/utils/debounce'

import { useAuthStore } from '@/stores/auth'
import { useCardStore } from '@/stores/card'
import { useUserStore } from '@/stores/user'
import { useNotifyStore } from '@/stores/notify'

import { getPublicKey, post } from '@/api/api'
import { sm2Encrypt } from '@/utils/crypto'

interface Data {
  id_number: string
  password: string
  loadStatus: string
  loadingInfo: string
}

const id_number = ref<string>('')
const password = ref<string>('')
const realname = ref<string>('')
const loadStatus = ref<string>('none')
const loadingInfo = ref<string>('')

const authStore = useAuthStore()
const cardStore = useCardStore()
const userStore = useUserStore()
const notifyStore = useNotifyStore()

const fetchData = async () => {
  if (id_number.value.length === 0 && realname.value.length === 0) {
    loadStatus.value = 'error'
    loadingInfo.value = '请输入账号和姓名'
    return
  }

  if (realname.value === '') {
    loadStatus.value = 'error'
    loadingInfo.value = '请输入姓名'
    return
  }

  if (
    id_number.value.length < 18 ||
    !(password.value.length === 0 || password.value.length === 6)
  ) {
    loadStatus.value = 'error'
    loadingInfo.value = '账号或密码长度不足'
    return
  }

  loadStatus.value = 'loading'
  loadingInfo.value = '正在获取公钥以加密信息…'

  const publicKey: string | null = await getPublicKey()
  if (publicKey !== null) {
    loadingInfo.value = '加密信息中…'

    const encryptedIdNumber = sm2Encrypt(id_number.value, publicKey)
    let encryptedPassword =
      password.value === '' ? 'empty' : sm2Encrypt(password.value, publicKey)
    const encryptedRealname = sm2Encrypt(realname.value, publicKey)

    try {
      loadingInfo.value = '请求令牌中…'
      const tokenResponse: any = await post('/auth/reset', {
        id_number: encryptedIdNumber,
        new_password: encryptedPassword,
        realname: encryptedRealname,
      })

      if (tokenResponse.data.data.type === 'password_illegal') {
        loadStatus.value = 'error'
        loadingInfo.value = `密码不合法`
        return
      } else if (tokenResponse.data.data.type === 'unauthorized') {
        loadStatus.value = 'error'
        loadingInfo.value = `请传入参数`
        return
      } else if (tokenResponse.data.data.type === 'user_not_found') {
        loadStatus.value = 'error'
        loadingInfo.value = `无法验证身份，身份证号或姓名有误`
        return
      } else if (tokenResponse.data.data.type === 'no_detected') {
        loadStatus.value = 'error'
        loadingInfo.value = `船政系统内不存在你的身份证，等船政加了你再说`
        return
      }

      loadStatus.value = 'success'
      loadingInfo.value = '重置成功'
      notifyStore.addMessage('success', '重置成功，即将跳转登录页面')

      setTimeout(() => {
        cardStore.closeAllCard()
        cardStore.showLoginCard = true
      }, 1200)
    } catch (err) {
      loadStatus.value = 'error'
      loadingInfo.value = `请求失败（${err}）`
    }
  } else {
    loadStatus.value = 'error'
    loadingInfo.value = '获取公钥失败，请检查网络连接。'
  }
}

const closeAuthCard = () => {
  cardStore.showAuthCard = false
}

const openLoginCard = () => {
  closeAuthCard()
  cardStore.showLoginCard = true
}

const keyupFetchData = debounce(() => {
  fetchData()
}, 300)

const resetLoadStatus = debounce(() => {
  setTimeout(() => {
    loadStatus.value = 'none'
    loadingInfo.value = ''
  }, 2000)
}, 1000)

watch(loadStatus, (newStatus) => {
  if (newStatus === 'success' || newStatus === 'error') {
    resetLoadStatus()
  }
})
</script>

<template>
  <div class="view-auth">
    <div class="view-auth-main">
      <div class="view-auth-title">重置密码</div>
      <div class="view-auth-form">
        <div
          class="view-auth-form__input"
          :class="{ disabled: loadStatus === 'loading' }"
        >
          <label>身份证</label>
          <input
            type="text"
            placeholder="请输入身份证号"
            v-model="id_number"
            maxlength="18"
            @keyup.enter="keyupFetchData"
          />
        </div>
        <div
          class="view-auth-form__input"
          :class="{ disabled: loadStatus === 'loading' }"
        >
          <label>姓名</label>
          <input
            type="text"
            placeholder="请输入姓名"
            v-model="realname"
            @keyup.enter="keyupFetchData"
          />
        </div>
        <div
          class="view-auth-form__input"
          :class="{ disabled: loadStatus === 'loading' }"
        >
          <label>新密码</label>
          <input
            type="name"
            placeholder="请输入新密码"
            v-model="password"
            maxlength="6"
            @keyup.enter="keyupFetchData"
          />
        </div>
        <div class="view-auth-form__login">
          <button
            @click="fetchData"
            :class="{ disabled: loadStatus === 'loading' }"
          >
            更新
            <div
              class="material-icons loading"
              :class="{ show: loadStatus === 'loading' }"
            >
              autorenew
            </div>
            <div
              class="material-icons success"
              :class="{ show: loadStatus === 'success' }"
            >
              done
            </div>
            <div
              class="material-icons error"
              :class="{ show: loadStatus === 'error' }"
            >
              close
            </div>
          </button>
          <div class="view-auth-form__loading">
            <div class="loading-info">{{ loadingInfo }}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="view-auth-form__options">
      <div class="view-auth-form__option" @click="openLoginCard">登录</div>
    </div>
    <div class="view-auth-desc">
      <div class="view-auth-desc__title">重置须知</div>
      <ul class="view-auth-desc__list">
        <li>用昵称的暂时不支持重置密码，有需要的先私聊联系我下。</li>
        <li>密码可以为空，但考虑到安全性不建议使用空密码。</li>
        <li>
          请输入原账号的身份证号、以及你的姓名以核验身份。随后输入新密码即可。
        </li>
      </ul>
    </div>
    <div class="view-auth-close" @click="closeAuthCard">
      <span class="material-icons">close</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/media_screen.scss' as screen;

.view-auth {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  height: 100%;
  position: relative;

  .view-auth-main {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    margin: auto;
  }

  .view-auth-title {
    font-size: 28px;
    font-weight: 600;
  }

  .view-auth-form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 3.5rem;

    .view-auth-form__input {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      transition: 250ms ease;

      label {
        flex: 0 0 50px;
        color: var(--color-base--emphasized);
        font-size: 14px;
        text-align: center;
        user-select: none;
      }

      input {
        font-size: 14px;
        min-width: 200px;
        background: var(--color-surface-0);
        outline: 2px solid transparent;
        transition: 250ms ease;

        &:focus {
          outline: 2px solid var(--color-primary);
        }

        @include screen.media-screen(mobile) {
          width: 180px;
          min-width: unset;
        }
      }

      &.disabled {
        opacity: 0.5;
        user-select: none;
        pointer-events: none;
        transform: scale(0.92);
      }
    }

    .view-auth-form__login {
      margin: 2rem auto 0 auto;
      position: relative;

      button {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 0.25rem;
        color: var(--color-surface-0);
        width: 150px;
        background: var(--color-primary);
        cursor: pointer;
        transition: 150ms ease;

        &:hover {
          background: var(--color-base--subtle);
          box-shadow: 0 1px 5px var(--border-color-base--darker);
        }

        &:active {
          transform: scale(0.98);
        }

        &.disabled {
          filter: grayscale(1);
          cursor: not-allowed;
        }

        @keyframes loading {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        .material-icons {
          display: none;
          position: absolute;
          left: calc(100% + 4px);
          color: var(--color-base--subtle);
          user-select: none;

          &.show {
            display: block;
          }
        }

        .loading {
          animation: loading 800ms linear infinite;
        }

        .success {
          color: var(--success-color);
        }

        .error {
          color: var(--failed-color);
        }
      }

      .view-auth-form__loading {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-base--subtle);
        font-size: 12px;
        position: absolute;
        top: calc(100% + 8px);
        left: 0;
        right: 0;
        opacity: 0.5;
        user-select: none;

        .loading-info {
          white-space: nowrap;
        }
      }
    }
  }

  .view-auth-form__options {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;

    .view-auth-form__option {
      color: var(--color-surface-4);
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 8px;
      transition: 150ms;
      user-select: none;
      cursor: pointer;

      &:hover {
        background: var(--border-color-base);
      }

      &:active {
        transform: scale(0.95);
        transition-duration: 80ms;
      }
    }
  }

  .view-auth-desc {
    color: var(--color-base--subtle);
    font-size: 12px;
    width: 100%;
    padding: 10px;
    border: 1px solid var(--border-color-base--darker);
    border-radius: 12px;

    .view-auth-desc__title {
      color: var(--color-surface-4);
      margin-bottom: 0.25rem;
    }

    .view-auth-desc__list {
      margin: 0;
      padding: 0;
      list-style-type: none;

      li {
        display: flex;

        &::before {
          content: '•';
          margin-right: 6px;
        }
      }
    }
  }

  .view-auth-close {
    position: absolute;
    top: 0;
    right: 0;
    padding: 5px;
    user-select: none;
    border-radius: 50%;
    transition: 250ms ease;

    .material-icons {
      display: block;
      color: var(--failed-color);
      font-size: 36px;
    }

    &:hover {
      background: var(--border-color-base);
      transform: rotate(-15deg);
    }

    &:active {
      transform: rotate(-15deg) scale(0.96);
      transition-duration: 80ms;
    }
  }
}
</style>
