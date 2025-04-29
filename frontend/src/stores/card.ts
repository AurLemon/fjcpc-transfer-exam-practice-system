// src/stores/card.ts

import { defineStore } from 'pinia'

export const useCardStore = defineStore('card', {
  state: () => ({
    showLoginCard: false,
    showAuthCard: false,
    mobileShowPanel: false,
    questionFocusMode: false,
  }),
  actions: {
    isViewContainerOn(): Boolean {
      return this.showLoginCard || this.showAuthCard
    },
    closeAllCard() {
      this.showLoginCard = false
      this.showAuthCard = false
    },
  },
})
