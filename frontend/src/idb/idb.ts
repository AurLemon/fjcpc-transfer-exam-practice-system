import { openDB, deleteDB } from 'idb'

export async function checkIndexedDBSupport(): Promise<boolean> {
  try {
    const db = await openDB('test-db', 1, {
      upgrade(db) {
        db.createObjectStore('test')
      },
    })
    await db.close()
    return true
  } catch {
    return false
  }
}

export async function initDB() {
  const isIndexedDBSupported = await checkIndexedDBSupport()

  if (!isIndexedDBSupported) {
    console.error('你的浏览器不支持 IndexedDB，本地缓存将被禁用')
    return
  } else {
    await deleteDB('test-db')
  }

  try {
    const db = await openDB('user-info', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('user_progress')) {
          const userProgressStore = db.createObjectStore('user_progress')
          userProgressStore.createIndex('progressIndex', 'progress')
          console.log('user_progress store created')
        }

        if (!db.objectStoreNames.contains('star_questions')) {
          const starProgressStore = db.createObjectStore('star_questions', {
            keyPath: 'folderName',
          })
          console.log('star_questions store created')
        }

        if (!db.objectStoreNames.contains('questions')) {
          db.createObjectStore('questions', { keyPath: 'unique_code' })
          console.log('questions store created')
        }

        if (!db.objectStoreNames.contains('user_settings')) {
          db.createObjectStore('user_settings', { keyPath: 'id' })
          console.log('user_settings store created')
        }
      },
    })

    db.onerror = (event) => {
      if (event.target instanceof IDBDatabase) {
        console.error('IndexedDB 存储空间不足，某些功能可能受限')
      }
    }
  } catch (error) {
    console.error('failed', '初始化 IndexedDB 时出错，请检查浏览器设置' + error)
  }
}
