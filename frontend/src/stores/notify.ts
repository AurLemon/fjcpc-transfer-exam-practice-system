// src/stores/notify.ts

import { defineStore } from 'pinia'

export const useNotifyStore = defineStore('notify', {
  state: () => ({
    messageStack: [] as Array<{ id: number; type: string; message: string }>,
  }),
  actions: {
    addMessage(type: string, message: string, duration: number = 3000) {
      const id = Date.now()
      this.messageStack.push({ id, type, message })

      setTimeout(() => {
        this.removeMessage(id)
      }, duration)
    },
    removeMessage(id: number) {
      this.messageStack = this.messageStack.filter((msg) => msg.id !== id)
    },
  },
})
