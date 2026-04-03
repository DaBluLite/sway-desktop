import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getItem, setItem, STORES } from '../lib/indexeddb'
import { Station } from 'radio-browser-api'

interface FavouritesContextType {
  favourites: Station[]
  addFavourite: (station: Station) => void
  removeFavourite: (url: string) => void
  isFavourite: (url: string) => boolean
  toggleFavourite: (station: Station) => void
  clearFavourites: () => void
  importFavourites: (stations: Station[], merge?: boolean) => void
}

const FavouritesContext = createContext<FavouritesContextType | undefined>(undefined)

const STORAGE_KEY = 'favourites-list'

interface FavouritesProviderProps {
  children: React.ReactNode
}

export const FavouritesProvider: React.FC<FavouritesProviderProps> = ({
  children
}: FavouritesProviderProps) => {
  const [favourites, setFavourites] = useState<Station[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  // Load favourites from IndexedDB on mount
  useEffect(() => {
    const loadFavourites = async () => {
      try {
        const stored = await getItem<Station[]>(STORES.FAVOURITES, STORAGE_KEY)
        if (stored && Array.isArray(stored)) {
          setFavourites(stored)
        }
      } catch (error) {
        console.error('Failed to load favourites from IndexedDB:', error)
      } finally {
        setIsInitialized(true)
      }
    }

    loadFavourites()
  }, [])

  // Save favourites to IndexedDB whenever they change
  useEffect(() => {
    if (isInitialized) {
      setItem(STORES.FAVOURITES, STORAGE_KEY, favourites).catch((error) => {
        console.error('Failed to save favourites to IndexedDB:', error)
      })
    }
  }, [favourites, isInitialized])

  const addFavourite = useCallback((station: Station) => {
    setFavourites((prev) => {
      if (prev.some((fav) => fav.url === station.url)) {
        return prev
      }
      return [...prev, station]
    })
  }, [])

  const removeFavourite = useCallback((url: string) => {
    setFavourites((prev) => prev.filter((fav) => fav.url !== url))
  }, [])

  const isFavourite = useCallback(
    (url: string): boolean => {
      return favourites.some((fav) => fav.url === url)
    },
    [favourites]
  )

  const toggleFavourite = useCallback((station: Station) => {
    setFavourites((prev) => {
      const exists = prev.some((fav) => fav.url === station.url)
      if (exists) {
        return prev.filter((fav) => fav.url !== station.url)
      }
      return [...prev, station]
    })
  }, [])

  const clearFavourites = useCallback(() => {
    setFavourites([])
  }, [])

  /**
   * Import favourites from backup data
   * @param stations - Array of stations to import
   * @param merge - If true, merge with existing favourites. If false, replace all.
   */
  const importFavourites = useCallback((stations: Station[], merge: boolean = true) => {
    if (!Array.isArray(stations)) return

    setFavourites((prev) => {
      if (!merge) {
        // Replace all favourites
        return stations
      }

      // Merge: add new stations that don't already exist
      const existingUrls = new Set(prev.map((fav) => fav.url))
      const newStations = stations.filter((station) => !existingUrls.has(station.url))

      return [...prev, ...newStations]
    })
  }, [])

  return (
    <FavouritesContext.Provider
      value={{
        favourites,
        addFavourite,
        removeFavourite,
        isFavourite,
        toggleFavourite,
        clearFavourites,
        importFavourites
      }}
    >
      {children}
    </FavouritesContext.Provider>
  )
}

export const useFavourites = (): FavouritesContextType => {
  const context = useContext(FavouritesContext)
  if (!context) {
    throw new Error('useFavourites must be used within FavouritesProvider')
  }
  return context
}
