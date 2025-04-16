// src/stores/user.ts

import { defineStore } from 'pinia'
import { get, post } from '@/api/api'

import { getUserProgress, setUserProgress, checkQuestionExists, getProgressCount, isProgressEmpty } from '@/idb/user_progress.db'
import { setStarProgress, checkStarExists, addItemToFolder, removeItemFromFolder, getFolderContent } from '@/idb/star_questions.db'

import { useAuthStore } from './auth'
import { useQuestionStore } from './question'
import { useNotifyStore } from './notify'

export interface StarItem {
    pid: string
    course: number
    subject: number
    time: string
    type: number
}

export interface ProgressData {
    pid: string
    course: number
    subject: number
    time: string
    type: number
}

export interface StarProgressData {
    folderName: string
    items: StarItem[]
}

export interface UserSettings {
    user_main_profession_subject: number
    auto_sync_data: boolean
    auto_save_progress: boolean
    auto_star_question: boolean
    show_user_stat: boolean
    show_name: 'id_number' | 'name'
    [key: string]: number | boolean | string
}

export const useUserStore = defineStore('user', {
    state: () => ({
        login: {
            isLogged: false,
            refreshing: false,
            isResetPassword: false
        },
        profile: {
            nick: '',
            uuid: '',
            name: '',
            id_number: '',
            school: '',
            profession: '',
            profession_main_subject: 1,
            last_login: '',
            reg_date: '',
            permission: 1,
            user_progress: {
                current: 0,
                total: 0
            }
        },
        setting: {
            user_main_profession_subject: 1,
            auto_sync_data: true,
            auto_save_progress: true,
            auto_star_question: true,
            show_user_stat: true,
            show_name: 'id_number'
        } as UserSettings
    }),
    actions: {
        setLogin(status: boolean = true) {
            localStorage.setItem('isLogged', JSON.stringify(status))
        },
        readLogin() {
            const authStore: any = useAuthStore()

            if (authStore.readToken() !== null && authStore.readRefreshToken() !== null) {
                return true
            }
            return false
        },
        userLogout() {
            const authStore = useAuthStore()
            this.login.isLogged = false
            authStore.deleteToken()
            authStore.deleteRefreshToken()
            this.resetProfile()
        },
        resetProfile() {
            this.profile.uuid = ''
            this.profile.name = ''
            this.profile.id_number = ''
            this.profile.school = ''
            this.profile.profession = ''
            this.profile.last_login = ''
            this.profile.reg_date = ''
        },
        async fetchUserProgress() {
            const userStore = useUserStore()
            const authStore = useAuthStore()
            const notifyStore = useNotifyStore()
            const token = authStore.readToken()

            try {
                const response: any = await get('/user/progress', undefined, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                })

                if (response.data.code === 200) {
                    const data = response.data.data
                    let currentData: ProgressData[] = []

                    if (userStore.setting.auto_sync_data) {
                        currentData = await this.getAllProgress()

                        if (!currentData) {
                            currentData = []
                        }

                        if (currentData.length > data.length) {
                            const localPids = currentData.map((item) => item.pid)
                            const serverPids = data.map((item: ProgressData) => item.pid)
                            const extraPids = localPids.filter((pid) => !serverPids.includes(pid))

                            await this.addProgressByArray(extraPids)

                            await this.fetchUserProgress()
                        }
                    }

                    await setUserProgress(data)
                } else {
                    if (response.data.data.type === 'expiry_token') {
                        await authStore.refreshTokenAndRetry()
                        this.fetchUserProgress()
                    } else if (response.data.data.type === 'token_not_exist' && !this.login.refreshing) {
                        this.login.isLogged = false
                    }
                }
            } catch (err) {
                console.error('Catch error in UserStore - fetchUserProgress(). Details: ', err)
                notifyStore.addMessage('failed', `获取用户进度时出现异常（${err}）`)
            }
        },
        async isProgress(pid: string): Promise<boolean> {
            try {
                const exists = await checkQuestionExists(pid)

                if (exists) {
                    return true
                } else {
                    return false
                }
            } catch (err) {
                console.error('Catch error in UserStore - isProgress(). Details: ', err)
                return false
            }
        },
        async getAllProgress() {
            try {
                const data = await getUserProgress()
                return data
            } catch (err) {
                console.error('Catch error in UserStore - getAllProgress(). Details: ', err)
                return []
            }
        },
        async isProgressEmpty() {
            try {
                const data = await isProgressEmpty()
                return data
            } catch (err) {
                console.error('Catch error in UserStore - getAllProgress(). Details: ', err)
                return []
            }
        },
        async getProgressSubject(course: number, subject: number, type: number) {
            try {
                const progress = await getUserProgress()
                const filteredProgress = progress.filter(
                    (item) => item.course === course && (subject === -1 || item.subject === subject) && (type === -1 || item.type === type)
                )
                return filteredProgress
            } catch (err) {
                console.error('Catch error in UserStore - getProgressSubject(). Details: ', err)
                return []
            }
        },
        async addProgress(pid: string, course: number, subject: number, type: number) {
            const authStore = useAuthStore()
            const notifyStore = useNotifyStore()
            const userStore = useUserStore()
            const token = authStore.readToken()
            const pidArray = [pid]
            this.profile.user_progress.current++

            try {
                let currentProgress = await getUserProgress()

                if (!Array.isArray(currentProgress)) {
                    currentProgress = []
                }

                if (userStore.readLogin()) {
                    const response: any = await post(
                        '/user/progress',
                        { pid: pidArray },
                        {
                            headers: {
                                Authorization: `Bearer ${token}`
                            }
                        }
                    )

                    if (response.data.code === 200) {
                        const serverProgress = await getUserProgress()

                        if (!serverProgress.some((item) => item.pid === pid)) {
                            const updatedProgress = [...serverProgress, { pid, course, subject, type, time: Date.now().toString() }]
                            await setUserProgress(updatedProgress)
                        }
                        return true
                    } else {
                        if (response.data.data.type === 'expiry_token') {
                            await authStore.refreshTokenAndRetry()
                            await this.addProgress(pid, course, subject, type)
                        } else if (response.data.data.type === 'token_not_exist') {
                            return false
                        } else {
                            return false
                        }
                    }
                } else {
                    if (!currentProgress.some((item) => item.pid === pid)) {
                        const updatedProgress = [...currentProgress, { pid, course, subject, type, time: Date.now().toString() }]
                        await setUserProgress(updatedProgress)
                    }
                    return true
                }
            } catch (err) {
                notifyStore.addMessage('failed', `添加用户进度时异常（${err}）`)
                console.error('Catch error in UserStore - addProgress(). Details: ', err)
                return false
            }
        },
        async addProgressByArray(pidArray: string[]) {
            const authStore = useAuthStore()
            const notifyStore = useNotifyStore()
            const userStore = useUserStore()
            const token = authStore.readToken()
            this.profile.user_progress.current += pidArray.length

            try {
                let currentProgress = await getUserProgress()

                if (!Array.isArray(currentProgress)) {
                    currentProgress = []
                }

                if (userStore.readLogin()) {
                    const response: any = await post(
                        '/user/progress',
                        { pid: pidArray },
                        {
                            headers: {
                                Authorization: `Bearer ${token}`
                            }
                        }
                    )

                    if (response.data.code === 200) {
                        const serverProgress = await getUserProgress()

                        const newProgress = pidArray
                            .filter((pid) => !serverProgress.some((item) => item.pid === pid))
                            .map((pid) => ({
                                pid,
                                course: null,
                                subject: null,
                                type: null,
                                time: Date.now().toString()
                            }))

                        const updatedProgress: any = [...serverProgress, ...newProgress]
                        await setUserProgress(updatedProgress)
                        return true
                    } else {
                        if (response.data.data.type === 'expiry_token') {
                            await authStore.refreshTokenAndRetry()
                            await this.addProgressByArray(pidArray)
                        } else if (response.data.data.type === 'token_not_exist') {
                            return false
                        } else {
                            return false
                        }
                    }
                } else {
                    const newProgress = pidArray
                        .filter((pid) => !currentProgress.some((item) => item.pid === pid))
                        .map((pid) => ({
                            pid,
                            course: null,
                            subject: null,
                            type: null,
                            time: Date.now().toString()
                        }))

                    const updatedProgress: any = [...currentProgress, ...newProgress]
                    await setUserProgress(updatedProgress)
                    return true
                }
            } catch (err) {
                notifyStore.addMessage('failed', `添加用户进度时异常（${err}）`)
                console.error('Catch error in UserStore - addProgressByArray(). Details: ', err)
                return false
            }
        },
        async deleteProgress(pid: string): Promise<boolean> {
            const authStore = useAuthStore()
            const notifyStore = useNotifyStore()
            const userStore = useUserStore()
            const token = authStore.readToken()

            const pidArray = [pid]
            const type = 'delete'
            this.profile.user_progress.current--

            try {
                let currentProgress = await getUserProgress()

                if (!Array.isArray(currentProgress)) {
                    currentProgress = []
                }

                if (userStore.readLogin()) {
                    const response: any = await post(
                        '/user/progress',
                        { pid: pidArray, type },
                        {
                            headers: {
                                Authorization: `Bearer ${token}`
                            }
                        }
                    )

                    if (response.data.code === 200) {
                        const updatedProgress = currentProgress.filter((item) => item.pid !== pid)

                        await setUserProgress(updatedProgress)
                        return true
                    } else {
                        if (response.data.data.type === 'expiry_token') {
                            await authStore.refreshTokenAndRetry()
                            return await this.deleteProgress(pid)
                        } else if (response.data.data.type === 'token_not_exist') {
                            return false
                        } else {
                            return false
                        }
                    }
                } else {
                    const updatedProgress = currentProgress.filter((item) => item.pid !== pid)

                    await setUserProgress(updatedProgress)
                    return true
                }
            } catch (err) {
                notifyStore.addMessage('failed', `删除用户进度时服务器异常（${err}）`)
                console.error('Catch error in UserStore - deleteStar(). Details: ', err)
                return false
            }
        },
        async updateProgressCount() {
            const questionStore = useQuestionStore()
            this.profile.user_progress.current = await getProgressCount()
            this.profile.user_progress.total = questionStore.getCulturalCount() + questionStore.getProfessionCount()
        },
        async fetchStarProgress() {
            const authStore = useAuthStore()
            const notifyStore = useNotifyStore()
            const token = authStore.readToken()

            try {
                const response: any = await get('/user/star', undefined, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                })

                if (response.data.code === 200) {
                    const starItems = response.data.data

                    const starProgressData: StarProgressData = {
                        folderName: 'wrong',
                        items: starItems
                    }

                    await setStarProgress(starProgressData)
                } else {
                    if (response.data.data.type === 'expiry_token') {
                        await authStore.refreshTokenAndRetry()
                        await this.fetchStarProgress()
                    } else if (response.data.data.type === 'token_not_exist' && !this.login.refreshing) {
                        this.login.isLogged = false
                    }
                }
            } catch (err) {
                notifyStore.addMessage('failed', `获取收藏数据时异常（${err}）`)
                console.error('Catch error in UserStore - fetchStarProgress(). Details: ', err)
                console.log(err)
            }
        },
        async isStar(pid: string): Promise<boolean> {
            try {
                const exists = await checkStarExists(pid)
                return exists
            } catch (err) {
                console.error('Catch error in UserStore - isStar(). Details: ', err)
                return false
            }
        },
        async addStar(pid: string, course: number, subject: number, type: number): Promise<boolean> {
            const authStore = useAuthStore()
            const notifyStore = useNotifyStore()
            const userStore = useUserStore()
            const token = authStore.readToken()

            const starItem: StarItem = {
                pid,
                course,
                subject,
                type,
                time: new Date().toISOString()
            }

            try {
                if (userStore.readLogin()) {
                    const response: any = await post(
                        '/user/star',
                        { pid: [pid] },
                        {
                            headers: {
                                Authorization: `Bearer ${token}`
                            }
                        }
                    )

                    if (response.data.code === 200) {
                        const exists = await checkStarExists(pid, 'wrong')
                        if (!exists) {
                            await addItemToFolder(starItem, 'wrong')
                        }
                        return true
                    } else {
                        if (response.data.data.type === 'expiry_token') {
                            await authStore.refreshTokenAndRetry()
                            return await this.addStar(pid, course, subject, type)
                        } else if (response.data.data.type === 'token_not_exist') {
                            return false
                        } else {
                            return false
                        }
                    }
                } else {
                    const exists = await checkStarExists(pid, 'wrong')
                    if (!exists) {
                        await addItemToFolder(starItem, 'wrong')
                    }
                    return true
                }
            } catch (err) {
                notifyStore.addMessage('failed', `添加收藏时服务器异常（${err}）`)
                console.error('Catch error in UserStore - addStar(). Details: ', err)
                return false
            }
        },
        async deleteStar(pid: string): Promise<boolean> {
            const authStore = useAuthStore()
            const notifyStore = useNotifyStore()
            const userStore = useUserStore()
            const token = authStore.readToken()

            const pidArray = [pid]
            const type = 'delete'

            try {
                if (userStore.readLogin()) {
                    const response: any = await post(
                        '/user/star',
                        { type: type, pid: pidArray },
                        {
                            headers: {
                                Authorization: `Bearer ${token}`
                            }
                        }
                    )

                    if (response.data.code === 200) {
                        await removeItemFromFolder(pid, 'wrong')
                        return true
                    } else {
                        if (response.data.data.type === 'expiry_token') {
                            await authStore.refreshTokenAndRetry()
                            return await this.deleteStar(pid)
                        } else if (response.data.data.type === 'token_not_exist') {
                            return false
                        } else {
                            return false
                        }
                    }
                } else {
                    await removeItemFromFolder(pid, 'wrong')
                    return true
                }
            } catch (err) {
                notifyStore.addMessage('failed', `删除收藏时服务器异常（${err}）`)
                console.error('Catch error in UserStore - deleteStar(). Details: ', err)
                return false
            }
        },
        async getFolderContent(folderName: string = 'wrong'): Promise<StarItem[]> {
            try {
                const folderContent = await getFolderContent(folderName)
                return folderContent
            } catch (err) {
                console.error('Catch error in UserStore - getFolderContent(). Details: ', err)
                return []
            }
        },
        async getStarSubject(course: number, subject: number, type: number, folderName: string = 'wrong') {
            try {
                const starContent = await getFolderContent(folderName)
                const filteredStars = starContent.filter(
                    (item) => item.course === course && (subject === -1 || item.subject === subject) && (type === -1 || item.type === type)
                )
                return filteredStars
            } catch (err) {
                console.error('Catch error in UserStore - getStarSubject(). Details: ', err)
                return []
            }
        }
    }
})
