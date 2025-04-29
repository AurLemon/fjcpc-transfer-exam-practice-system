import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import VueTippy from 'vue-tippy'

import 'tippy.js/dist/tippy.css'
import 'tippy.js/themes/light.css'
import './assets/styles/main.scss'
import './assets/styles/tippy.scss'
import 'material-icons/iconfont/material-icons.css'

import Clarity from '@microsoft/clarity'
const projectId = 'm61b0fjnza'

if (import.meta.env.PROD) {
  Clarity.init(projectId)
}

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(VueTippy, {
  directive: 'tippy',
  defaultProps: {
    placement: 'auto-end',
    allowHTML: true,
    theme: 'light',
  },
})

app.mount('#app')
