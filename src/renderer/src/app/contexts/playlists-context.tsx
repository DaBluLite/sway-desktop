import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { SubsonicPlaylist, SubsonicSong } from '../../../../types/subsonic'

interface PlaylistsContextType {
  playlists: SubsonicPlaylist[]
  loading: boolean
  refreshPlaylists: () => Promise<void>
  createPlaylist: (name: string, songIds?: string[]) => Promise<void>
  deletePlaylist: (playlistId: string) => Promise<void>
  updatePlaylist: (playlistId: string, name?: string, comment?: string) => Promise<void>
  addSongToPlaylist: (playlistId: string, songId: string) => Promise<void>
  removeSongFromPlaylist: (playlistId: string, songId: string) => Promise<void>
  isSongInPlaylist: (playlistId: string, songId: string) => Promise<boolean>
}

const PlaylistsContext = createContext<PlaylistsContextType | undefined>(undefined)

export const PlaylistsProvider = ({ children }: { children: ReactNode }) => {
  const [playlists, setPlaylists] = useState<SubsonicPlaylist[]>([])
  const [loading, setLoading] = useState(false)

  const refreshPlaylists = useCallback(async () => {
    setLoading(true)
    try {
      const status = await window.api.subsonic.getCredentialsStatus()
      if (!status.configured) {
        setPlaylists([])
        return
      }

      const result = await window.api.subsonic.getPlaylists()
      if (result.success && Array.isArray(result.data)) {
        setPlaylists(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch Subsonic playlists:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const createPlaylist = async (name: string, songIds: string[] = []) => {
    const result = await window.api.subsonic.createPlaylist(name, songIds)
    if (result.success) {
      await refreshPlaylists()
    } else {
      throw new Error(result.error || 'Failed to create playlist')
    }
  }

  const deletePlaylist = async (playlistId: string) => {
    const result = await window.api.subsonic.deletePlaylist(playlistId)
    if (result.success) {
      await refreshPlaylists()
    } else {
      throw new Error(result.error || 'Failed to delete playlist')
    }
  }

  const updatePlaylist = async (playlistId: string, name?: string, comment?: string) => {
    const result = await window.api.subsonic.updatePlaylist(playlistId, name, comment)
    if (result.success) {
      await refreshPlaylists()
    } else {
      throw new Error(result.error || 'Failed to update playlist')
    }
  }

  const addSongToPlaylist = async (playlistId: string, songId: string) => {
    const getRes = await window.api.subsonic.getPlaylist(playlistId)
    if (getRes.success && getRes.data) {
      const currentPlaylist = getRes.data as SubsonicPlaylist
      const currentSongs = currentPlaylist.entry || []
      const songIds = [...currentSongs.map((s: SubsonicSong) => s.id), songId]

      const res = await window.api.subsonic.replacePlaylistSongs(playlistId, songIds)
      if (res.success) {
        await refreshPlaylists()
      } else {
        throw new Error(res.error || 'Failed to add song to playlist')
      }
    }
  }

  const removeSongFromPlaylist = async (playlistId: string, songId: string) => {
    const getRes = await window.api.subsonic.getPlaylist(playlistId)
    if (getRes.success && getRes.data) {
      const currentPlaylist = getRes.data as SubsonicPlaylist
      const currentSongs = currentPlaylist.entry || []
      const songIds = currentSongs
        .map((s: SubsonicSong) => s.id)
        .filter((id: string) => id !== songId)

      const res = await window.api.subsonic.replacePlaylistSongs(playlistId, songIds)
      if (res.success) {
        await refreshPlaylists()
      } else {
        throw new Error(res.error || 'Failed to remove song from playlist')
      }
    }
  }

  const isSongInPlaylist = async (playlistId: string, songId: string): Promise<boolean> => {
    const getRes = await window.api.subsonic.getPlaylist(playlistId)
    if (getRes.success && getRes.data) {
      const currentPlaylist = getRes.data as SubsonicPlaylist
      const currentSongs = currentPlaylist.entry || []
      return currentSongs.some((s: SubsonicSong) => s.id === songId)
    }
    return false
  }

  useEffect(() => {
    refreshPlaylists()

    const unsubscribe = window.api.subsonic.onCredentialsChanged((status) => {
      if (status.configured) {
        refreshPlaylists()
      } else {
        setPlaylists([])
      }
    })

    return () => unsubscribe()
  }, [refreshPlaylists])

  return (
    <PlaylistsContext.Provider
      value={{
        playlists,
        loading,
        refreshPlaylists,
        createPlaylist,
        deletePlaylist,
        updatePlaylist,
        addSongToPlaylist,
        removeSongFromPlaylist,
        isSongInPlaylist
      }}
    >
      {children}
    </PlaylistsContext.Provider>
  )
}

export const usePlaylists = () => {
  const context = useContext(PlaylistsContext)
  if (!context) {
    throw new Error('usePlaylists must be used within PlaylistsProvider')
  }
  return context
}
