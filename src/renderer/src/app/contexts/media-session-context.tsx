import React, { createContext, useContext, useEffect, useRef } from 'react'
import { useAudioPlayer } from './audio-player-context'

interface MediaSessionContextType {}

const MediaSessionContext = createContext<MediaSessionContextType | undefined>(undefined)

export const MediaSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    isPlaying,
    currentStation,
    currentSong,
    pause,
    resume,
    playNext,
    playPrevious,
    seek,
    currentTime,
    duration
  } = useAudioPlayer()

  const lastMetadataRef = useRef<string>('')

  // Update playback state
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
    }
  }, [isPlaying])

  // Update position state
  useEffect(() => {
    if ('mediaSession' in navigator && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(0, duration),
          playbackRate: 1,
          position: Math.max(0, currentTime)
        })
      } catch (e) {
        // Some browsers/environments might throw on invalid position state
        console.warn('Failed to update media session position state:', e)
      }
    }
  }, [currentTime, duration])

  // Update metadata
  useEffect(() => {
    if (!('mediaSession' in navigator)) return

    const updateMetadata = async () => {
      let title = 'Sway Radio'
      let artist = 'Discovery'
      let album = 'Live Stream'
      let artworkUrl = ''

      if (currentSong) {
        title = currentSong.title
        artist = currentSong.artist
        album = currentSong.album
        artworkUrl = (await window.api.subsonic.getCoverArtUrl(currentSong.id)) || ''
      } else if (currentStation) {
        title = currentStation.name
        artist = currentStation.country || 'Radio'
        album = 'Sway Desktop'
        artworkUrl = currentStation.favicon || ''
      }

      const metadataKey = `${title}-${artist}-${album}`
      if (metadataKey === lastMetadataRef.current) return
      lastMetadataRef.current = metadataKey

      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist,
        album,
        artwork: artworkUrl ? [{ src: artworkUrl, sizes: '512x512', type: 'image/png' }] : []
      })
    }

    updateMetadata()
  }, [currentSong, currentStation])

  // Set action handlers
  useEffect(() => {
    if (!('mediaSession' in navigator)) return

    navigator.mediaSession.setActionHandler('play', () => resume())
    navigator.mediaSession.setActionHandler('pause', () => pause())
    navigator.mediaSession.setActionHandler('previoustrack', () => playPrevious())
    navigator.mediaSession.setActionHandler('nexttrack', () => playNext())

    try {
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          seek(details.seekTime)
        }
      })
    } catch {
      // seekto might not be supported in all environments
    }

    return () => {
      navigator.mediaSession.setActionHandler('play', null)
      navigator.mediaSession.setActionHandler('pause', null)
      navigator.mediaSession.setActionHandler('previoustrack', null)
      navigator.mediaSession.setActionHandler('nexttrack', null)
      try {
        navigator.mediaSession.setActionHandler('seekto', null)
      } catch {
        // ignore
      }
    }
  }, [resume, pause, playNext, playPrevious, seek])

  return <MediaSessionContext.Provider value={{}}>{children}</MediaSessionContext.Provider>
}

export const useMediaSession = () => {
  const context = useContext(MediaSessionContext)
  if (context === undefined) {
    throw new Error('useMediaSession must be used within a MediaSessionProvider')
  }
  return context
}
