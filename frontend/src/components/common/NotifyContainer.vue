<script lang="ts">
import { defineComponent, computed } from 'vue'
import { useNotifyStore } from '@/stores/notify'

export default defineComponent({
  name: 'NotifyContainer',
  setup() {
    const notifyStore = useNotifyStore()

    const visible = computed(() => notifyStore.messageStack.length > 0)

    return {
      notifyStore,
      visible,
    }
  },
})
</script>

<template>
  <transition-group
    name="notify"
    tag="div"
    class="notify-container"
    v-show="visible"
  >
    <div
      class="notify"
      v-for="notify in notifyStore.messageStack"
      :key="notify.id"
      :class="notify.type"
    >
      <div class="notify-message">{{ notify.message }}</div>
    </div>
  </transition-group>
</template>

<style lang="scss" scoped>
.notify-container {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  gap: var(--gap-value);
  padding: 15px;
  position: fixed;
  top: calc(100% - 250px);
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 200;
  overflow: hidden;
  pointer-events: none;
  transition: var(--transition-hover);

  .notify {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: var(--color-base--emphasized);
    width: fit-content;
    padding: 4px 12px;
    font-size: 14px;
    border-radius: 12px;
    background: var(--color-surface-3);
    box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.1);
    transition: var(--transition-hover);
    user-select: none;
    pointer-events: all;
    cursor: pointer;

    &.success {
      color: var(--color-surface-0);
      background: var(--success-color);
    }

    &.failed {
      color: var(--color-surface-0);
      background: var(--failed-color);
    }
  }

  .notify-enter-active,
  .notify-leave-active {
    transition:
      opacity 300ms ease,
      transform 300ms ease;
  }

  .notify-enter-from,
  .notify-leave-to {
    opacity: 0;
    transform: translateY(20px);
  }
}
</style>
