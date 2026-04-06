import { Station } from 'radio-browser-api'
import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react'
import { audioEqualizer } from '../lib/audio-eq'

interface AudioPlayerContextType {
  // State (synced with main process)
  isPlaying: boolean
  currentStation: Station | null
  volume: number
  isMuted: boolean
  isLoading: boolean
  error: string | null

  // Controls (IPC commands)
  play: (station: Station) => void
  pause: () => void
  stop: () => void
  setVolume: (volume: number) => void
  toggleMute: () => void

  // HTMLAudioElement reference (stays in renderer)
  audioElement: HTMLAudioElement | null
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined)

interface AudioPlayerProviderProps {
  children: React.ReactNode
}

export const AudioPlayerProvider: React.FC<AudioPlayerProviderProps> = ({
  children
}: AudioPlayerProviderProps) => {
  // HTMLAudioElement for Web Audio API (equalizer) only - not for playback
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)

  // State synced with main process
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStation, setCurrentStation] = useState<Station | null>(null)
  const [volume, setVolumeState] = useState(0.7)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cleanup functions for IPC event listeners
  const cleanupStateListener = useRef<(() => void) | null>(null)

  // Initialize HTMLAudioElement for Web Audio API and IPC listeners
  useEffect(() => {
    // Initialize audio element for Web Audio API features (equalizer, recording)
    audioRef.current = new Audio()
    audioRef.current.volume = 0 // Muted since MPV handles actual playback
    audioRef.current.preload = 'none'
    audioRef.current.crossOrigin = 'anonymous'

    // Add audio element to DOM (hidden) for proper Web Audio API support
    audioRef.current.style.display = 'none'
    document.body.appendChild(audioRef.current)

    // Set state so it can be accessed in render without lint errors
    setAudioElement(audioRef.current)

    // Connect to equalizer (this will work with the dummy audio element)
    audioEqualizer.connect(audioRef.current)

    console.log('Audio player context initialized (MPV mode)')

    // Set up IPC event listeners for state synchronization
    cleanupStateListener.current = window.api.audioPlayer.onStateChanged((event) => {
      console.log('State changed from main process:', event.source, event.state)

      const newState = event.state

      // Update local state to match main process
      setIsPlaying(newState.isPlaying)
      setCurrentStation(newState.currentStation)
      setVolumeState(newState.volume)
      setIsMuted(newState.isMuted)
      setIsLoading(newState.isLoading)
      setError(newState.error)

      console.log('UI state updated:', {
        isPlaying: newState.isPlaying,
        station: newState.currentStation?.name,
        volume: newState.volume,
        isMuted: newState.isMuted,
        isLoading: newState.isLoading,
        error: newState.error
      })
    })

    // Load initial state from main process
    window.api.audioPlayer
      .getState()
      .then((initialState) => {
        if (initialState) {
          console.log('Loaded initial state from main process:', initialState)
          setIsPlaying(initialState.isPlaying)
          setCurrentStation(initialState.currentStation)
          setVolumeState(initialState.volume)
          setIsMuted(initialState.isMuted)
          setIsLoading(initialState.isLoading)
          setError(initialState.error)
        }
      })
      .catch((err) => {
        console.error('Failed to load initial audio player state:', err)
      })

    // Cleanup function
    return () => {
      // Cleanup IPC listeners
      if (cleanupStateListener.current) {
        cleanupStateListener.current()
      }

      // Cleanup dummy audio element
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''

        // Remove audio element from DOM
        if (audioRef.current.parentNode) {
          audioRef.current.parentNode.removeChild(audioRef.current)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // IPC Command handlers (call main process - MPV handles actual playback)
  const play = useCallback(async (station: Station) => {
    console.log('Play command:', station.name)

    try {
      const result = await window.api.audioPlayer.playStation(station)
      if (!result.success) {
        console.error('Failed to play station:', result.error)
      }
    } catch (error) {
      console.error('IPC play command failed:', error)
    }
  }, [])

  const pause = useCallback(async () => {
    console.log('Pause command')

    try {
      const result = await window.api.audioPlayer.pause()
      if (!result.success) {
        console.error('Failed to pause:', result.error)
      }
    } catch (error) {
      console.error('IPC pause command failed:', error)
    }
  }, [])

  const stop = useCallback(async () => {
    console.log('Stop command')

    try {
      const result = await window.api.audioPlayer.stop()
      if (!result.success) {
        console.error('Failed to stop:', result.error)
      }
    } catch (error) {
      console.error('IPC stop command failed:', error)
    }
  }, [])

  const setVolume = useCallback(async (newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume))
    console.log('Set volume command:', clampedVolume)

    try {
      const result = await window.api.audioPlayer.setVolume(clampedVolume)
      if (!result.success) {
        console.error('Failed to set volume:', result.error)
      }
    } catch (error) {
      console.error('IPC set volume command failed:', error)
    }
  }, [])

  const toggleMute = useCallback(async () => {
    console.log('Toggle mute command')

    try {
      const result = await window.api.audioPlayer.toggleMute()
      if (!result.success) {
        console.error('Failed to toggle mute:', result.error)
      }
    } catch (error) {
      console.error('IPC toggle mute command failed:', error)
    }
  }, [])

  return (
    <AudioPlayerContext.Provider
      value={{
        isPlaying,
        currentStation,
        volume,
        isMuted,
        isLoading,
        error,
        play,
        pause,
        stop,
        setVolume,
        toggleMute,
        audioElement
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  )
}

export const useAudioPlayer = (): AudioPlayerContextType => {
  const context = useContext(AudioPlayerContext)
  if (!context) {
    throw new Error('useAudioPlayer must be used within AudioPlayerProvider')
  }
  return context
}
