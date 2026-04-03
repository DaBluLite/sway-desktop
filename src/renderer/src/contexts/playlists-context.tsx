import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getItem, setItem, STORES } from '../lib/indexeddb'
import { Station } from 'radio-browser-api'

export interface Playlist {
  id: string
  name: string
  description?: string
  icon?: string // emoji or icon name
  color?: string // hex color for the playlist
  stations: Station[]
  createdAt: string
  updatedAt: string
}

interface PlaylistsContextType {
  playlists: Playlist[]
  createPlaylist: (
    name: string,
    options?: { description?: string; icon?: string; color?: string }
  ) => Playlist
  updatePlaylist: (id: string, updates: Partial<Omit<Playlist, 'id' | 'createdAt'>>) => void
  deletePlaylist: (id: string) => void
  addStationToPlaylist: (playlistId: string, station: Station) => void
  removeStationFromPlaylist: (playlistId: string, stationUrl: string) => void
  moveStationInPlaylist: (playlistId: string, fromIndex: number, toIndex: number) => void
  isStationInPlaylist: (playlistId: string, stationUrl: string) => boolean
  getPlaylistsForStation: (stationUrl: string) => Playlist[]
  duplicatePlaylist: (id: string, newName?: string) => Playlist | null
  reorderPlaylists: (fromIndex: number, toIndex: number) => void
  importPlaylists: (playlists: Playlist[]) => void
  exportPlaylists: () => Playlist[]
}

const PlaylistsContext = createContext<PlaylistsContextType | undefined>(undefined)

const STORAGE_KEY = 'user-playlists'

// Generate a unique ID
const generateId = (): string => {
  return `playlist_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// Default colors for playlists
const DEFAULT_COLORS = [
  '#22c55e', // green
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316' // orange
]

// Default icons (emojis)
const DEFAULT_ICONS = ['🎵', '🎧', '📻', '🎶', '🎤', '🎸', '🎹', '🎺']

interface PlaylistsProviderProps {
  children: React.ReactNode
}

export const PlaylistsProvider: React.FC<PlaylistsProviderProps> = ({
  children
}: PlaylistsProviderProps) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  // Load playlists from IndexedDB on mount
  useEffect(() => {
    const loadPlaylists = async () => {
      try {
        const stored = await getItem<Playlist[]>(STORES.SETTINGS, STORAGE_KEY)
        if (stored && Array.isArray(stored)) {
          setPlaylists(stored)
        }
      } catch (error) {
        console.error('Failed to load playlists from IndexedDB:', error)
      } finally {
        setIsInitialized(true)
      }
    }

    loadPlaylists()
  }, [])

  // Save playlists to IndexedDB whenever they change
  useEffect(() => {
    if (isInitialized) {
      setItem(STORES.SETTINGS, STORAGE_KEY, playlists).catch((error) => {
        console.error('Failed to save playlists to IndexedDB:', error)
      })
    }
  }, [playlists, isInitialized])

  const createPlaylist = useCallback(
    (name: string, options?: { description?: string; icon?: string; color?: string }): Playlist => {
      const now = new Date().toISOString()
      const playlistIndex = playlists.length

      const newPlaylist: Playlist = {
        id: generateId(),
        name: name.trim() || 'Untitled Playlist',
        description: options?.description,
        icon: options?.icon || DEFAULT_ICONS[playlistIndex % DEFAULT_ICONS.length],
        color: options?.color || DEFAULT_COLORS[playlistIndex % DEFAULT_COLORS.length],
        stations: [],
        createdAt: now,
        updatedAt: now
      }

      setPlaylists((prev) => [...prev, newPlaylist])
      return newPlaylist
    },
    [playlists.length]
  )

  const updatePlaylist = useCallback(
    (id: string, updates: Partial<Omit<Playlist, 'id' | 'createdAt'>>) => {
      setPlaylists((prev) =>
        prev.map((playlist) =>
          playlist.id === id
            ? {
                ...playlist,
                ...updates,
                updatedAt: new Date().toISOString()
              }
            : playlist
        )
      )
    },
    []
  )

  const deletePlaylist = useCallback((id: string) => {
    setPlaylists((prev) => prev.filter((playlist) => playlist.id !== id))
  }, [])

  const addStationToPlaylist = useCallback((playlistId: string, station: Station) => {
    setPlaylists((prev) =>
      prev.map((playlist) => {
        if (playlist.id !== playlistId) return playlist

        // Check if station already exists
        if (playlist.stations.some((s) => s.url === station.url)) {
          return playlist
        }

        return {
          ...playlist,
          stations: [...playlist.stations, station],
          updatedAt: new Date().toISOString()
        }
      })
    )
  }, [])

  const removeStationFromPlaylist = useCallback((playlistId: string, stationUrl: string) => {
    setPlaylists((prev) =>
      prev.map((playlist) => {
        if (playlist.id !== playlistId) return playlist

        return {
          ...playlist,
          stations: playlist.stations.filter((s) => s.url !== stationUrl),
          updatedAt: new Date().toISOString()
        }
      })
    )
  }, [])

  const moveStationInPlaylist = useCallback(
    (playlistId: string, fromIndex: number, toIndex: number) => {
      setPlaylists((prev) =>
        prev.map((playlist) => {
          if (playlist.id !== playlistId) return playlist

          const stations = [...playlist.stations]
          const [removed] = stations.splice(fromIndex, 1)
          stations.splice(toIndex, 0, removed)

          return {
            ...playlist,
            stations,
            updatedAt: new Date().toISOString()
          }
        })
      )
    },
    []
  )

  const isStationInPlaylist = useCallback(
    (playlistId: string, stationUrl: string): boolean => {
      const playlist = playlists.find((p) => p.id === playlistId)
      if (!playlist) return false
      return playlist.stations.some((s) => s.url === stationUrl)
    },
    [playlists]
  )

  const getPlaylistsForStation = useCallback(
    (stationUrl: string): Playlist[] => {
      return playlists.filter((playlist) => playlist.stations.some((s) => s.url === stationUrl))
    },
    [playlists]
  )

  const duplicatePlaylist = useCallback(
    (id: string, newName?: string): Playlist | null => {
      const original = playlists.find((p) => p.id === id)
      if (!original) return null

      const now = new Date().toISOString()
      const duplicated: Playlist = {
        ...original,
        id: generateId(),
        name: newName || `${original.name} (Copy)`,
        createdAt: now,
        updatedAt: now
      }

      setPlaylists((prev) => [...prev, duplicated])
      return duplicated
    },
    [playlists]
  )

  const reorderPlaylists = useCallback((fromIndex: number, toIndex: number) => {
    setPlaylists((prev) => {
      const newPlaylists = [...prev]
      const [removed] = newPlaylists.splice(fromIndex, 1)
      newPlaylists.splice(toIndex, 0, removed)
      return newPlaylists
    })
  }, [])

  const importPlaylists = useCallback((importedPlaylists: Playlist[]) => {
    const now = new Date().toISOString()

    // Regenerate IDs to avoid conflicts
    const processedPlaylists = importedPlaylists.map((playlist) => ({
      ...playlist,
      id: generateId(),
      createdAt: playlist.createdAt || now,
      updatedAt: now
    }))

    setPlaylists((prev) => [...prev, ...processedPlaylists])
  }, [])

  const exportPlaylists = useCallback((): Playlist[] => {
    return playlists
  }, [playlists])

  return (
    <PlaylistsContext.Provider
      value={{
        playlists,
        createPlaylist,
        updatePlaylist,
        deletePlaylist,
        addStationToPlaylist,
        removeStationFromPlaylist,
        moveStationInPlaylist,
        isStationInPlaylist,
        getPlaylistsForStation,
        duplicatePlaylist,
        reorderPlaylists,
        importPlaylists,
        exportPlaylists
      }}
    >
      {children}
    </PlaylistsContext.Provider>
  )
}

export const usePlaylists = (): PlaylistsContextType => {
  const context = useContext(PlaylistsContext)
  if (!context) {
    throw new Error('usePlaylists must be used within PlaylistsProvider')
  }
  return context
}

// Export constants for use in other components
export { DEFAULT_COLORS, DEFAULT_ICONS }
