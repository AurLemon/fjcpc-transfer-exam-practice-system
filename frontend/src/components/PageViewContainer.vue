<script lang="ts">
import { defineComponent } from 'vue'
import { useCardStore } from '@/stores/card'
import LoginCard from './common/LoginCard.vue'
import AuthCard from './common/AuthCard.vue'

export default defineComponent({
  name: 'PageViewContainer',
  components: {
    LoginCard,
    AuthCard,
  },
  setup() {
    const cardStore = useCardStore()
    return {
      cardStore,
    }
  },
})
</script>

<template>
  <div
    class="page-view-container"
    :class="{ active: cardStore.isViewContainerOn() }"
  >
    <Transition name="login">
      <LoginCard v-if="cardStore.showLoginCard" />
    </Transition>
    <Transition name="auth">
      <AuthCard v-if="cardStore.showAuthCard" />
    </Transition>
  </div>
</template>

<style lang="scss" scoped>
$page-value-z-index: 100;

.page-view-container {
  /* 想用 inset: 0 简写但是有点担心兼容性 */
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1;

  &.active {
    padding: 15px;
    z-index: $page-value-z-index;
    background: var(--background-color-overlay--lighter);
    backdrop-filter: blur(48px) saturate(0.5);
    transition: 250ms ease;
  }
}

.login-enter-active,
.login-leave-active {
  transition: all 350ms ease;
}

.login-enter-from,
.login-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.auth-enter-active,
.auth-leave-active {
  transition: all 350ms ease;
}

.auth-enter-from,
.auth-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>
