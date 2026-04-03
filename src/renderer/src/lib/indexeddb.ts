const DB_NAME = 'sway-radio-db'
const DB_VERSION = 4

export const STORES = {
  FAVOURITES: 'favourites',
  SAVED_STATIONS: 'saved-stations',
  SETTINGS: 'settings',
  HISTORY: 'history',
  ALARMS: 'alarms',
  EQUALIZER: 'equalizer',
  RECORDINGS: 'recordings',
  CURATIONS: 'curations',
  BACKGROUNDS: 'backgrounds'
} as const

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = (event) => {
      const error = (event.target as IDBOpenDBRequest).error
      console.error('Failed to open IndexedDB:', error)
      dbPromise = null // allow retry
      reject(error)
    }

    request.onblocked = () => {
      console.warn('DB upgrade blocked — close other tabs using this app')
    }

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      db.onversionchange = () => {
        db.close()
        dbPromise = null
      }

      db.onerror = (event) => {
        console.error('DB error:', (event.target as IDBRequest).error)
      }

      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      const tx = (event.target as IDBOpenDBRequest).transaction!

      tx.onerror = () => {
        console.error('Upgrade transaction error:', tx.error)
      }

      const stores = Object.values(STORES)
      for (const store of stores) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id' })
        }
      }
    }
  })

  return dbPromise
}

export async function getItem<T>(storeName: string, key: string): Promise<T | null> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(key)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const result = request.result
        resolve(result ? result.value : null)
      }
    })
  } catch (error) {
    console.error(`Failed to get item from ${storeName}:`, error)
    return null
  }
}

export async function setItem<T>(storeName: string, key: string, value: T): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.put({ id: key, value })

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  } catch (error) {
    console.error(`Failed to set item in ${storeName}:`, error)
  }
}

export async function removeItem(storeName: string, key: string): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.delete(key)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  } catch (error) {
    console.error(`Failed to remove item from ${storeName}:`, error)
  }
}

export async function clearStore(storeName: string): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.clear()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  } catch (error) {
    console.error(`Failed to clear store ${storeName}:`, error)
  }
}
