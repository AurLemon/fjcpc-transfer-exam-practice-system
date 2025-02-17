// src/idb/user_progress.db

import { openDB } from 'idb'
import { initDB } from './idb'

interface ProgressData {
    pid: string
    course: number
    subject: number
    time: string
    type: number
}

const dbPromise = (async () => {
    await initDB()
    return openDB('user-info', 1)
})()

export async function getUserProgress(): Promise<ProgressData[]> {
    const db = await dbPromise
    return db.get('user_progress', 'progress') || []
}

export async function setUserProgress(progress: ProgressData[]) {
    const db = await dbPromise
    await db.put('user_progress', progress, 'progress')
}

export async function deleteUserProgress(pid: string) {
    const db = await dbPromise
    const currentProgress = (await db.get('user_progress', 'progress')) || []

    const updatedProgress = currentProgress.filter((item: { pid: string }) => item.pid !== pid)

    await db.put('user_progress', updatedProgress, 'progress')
}

export async function checkQuestionExists(pid: string): Promise<boolean> {
    const db = await dbPromise
    const progressData: ProgressData[] = (await db.get('user_progress', 'progress')) || []

    return progressData.some((item) => item.pid === pid)
}

export async function getProgressCount(): Promise<number> {
    const db = await dbPromise
    const progressData = (await db.get('user_progress', 'progress')) || []
    return Array.isArray(progressData) ? progressData.length : 0
}

export async function isProgressEmpty(): Promise<boolean> {
    const db = await dbPromise
    const progressData = await db.get('user_progress', 'progress')
    return Boolean(!progressData)
}
