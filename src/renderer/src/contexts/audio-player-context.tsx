import { Station } from 'radio-browser-api'
import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react'
import { audioEqualizer } from '../lib/audio-eq'

interface AudioPlayerContextType {
  // State
  isPlaying: boolean
  currentStation: Station | null
  volume: number
  isMuted: boolean
  isLoading: boolean
  error: string | null

  // Controls
  play: (station: Station) => void
  pause: () => void
  stop: () => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  audioElement: HTMLAudioElement | null
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined)

interface AudioPlayerProviderProps {
  children: React.ReactNode
}

export const AudioPlayerProvider: React.FC<AudioPlayerProviderProps> = ({
  children
}: AudioPlayerProviderProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStation, setCurrentStation] = useState<Station | null>(null)
  const [volume, setVolumeState] = useState(0.7)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const retryCountRef = useRef(0)
  const shouldBePlayingRef = useRef(false)

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio()
    audioRef.current.volume = volume
    audioRef.current.preload = 'none'
    audioRef.current.crossOrigin = 'anonymous'

    // Add audio element to DOM (hidden) for proper recording support
    audioRef.current.style.display = 'none'
    document.body.appendChild(audioRef.current)

    // Set state so it can be accessed in render without lint errors
    setAudioElement(audioRef.current)

    // Connect to equalizer
    audioEqualizer.connect(audioRef.current)

    const audio = audioRef.current

    const handleLoadStart = () => {
      console.log('Load start')
      setIsLoading(true)

      // Clear any existing load timeout
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current)
      }

      // Set a timeout to prevent infinite loading (30 seconds)
      loadTimeoutRef.current = setTimeout(() => {
        console.warn('Loading timeout reached')
        setIsLoading(false)
        if (shouldBePlayingRef.current) {
          setError('Stream took too long to load')
          shouldBePlayingRef.current = false
        }
      }, 30000)
    }

    const handleCanPlay = () => {
      console.log('Can play')
      setIsLoading(false)

      // Clear load timeout since we can play
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current)
        loadTimeoutRef.current = null
      }
    }

    const handlePlaying = () => {
      console.log('Playing')
      setIsPlaying(true)
      setIsLoading(false)
      setError(null)
      retryCountRef.current = 0 // Reset retry count on successful playback
    }

    const handlePause = () => {
      console.log('Paused')
      setIsPlaying(false)
    }
    const handleError = (e: Event) => {
      const target = e.target as HTMLAudioElement
      console.error(
        'Audio error:',
        e,
        'Network state:',
        target?.networkState,
        'Ready state:',
        target?.readyState
      )
      setIsLoading(false)

      // Don't retry if we're not supposed to be playing (user switched stations)
      if (!shouldBePlayingRef.current) {
        return
      }

      // Attempt to retry if we should be playing
      if (shouldBePlayingRef.current && retryCountRef.current < 3) {
        retryCountRef.current++
        const retryDelay = Math.min(1000 * retryCountRef.current, 3000)
        console.log(`Retrying in ${retryDelay}ms (attempt ${retryCountRef.current}/3)...`)

        retryTimeoutRef.current = setTimeout(() => {
          if (shouldBePlayingRef.current && audio.src) {
            console.log('Attempting retry with load() and play()...')
            audio.load()
            audio.play().catch((err) => console.error('Retry failed:', err))
          }
        }, retryDelay)
      } else {
        setIsPlaying(false)
        shouldBePlayingRef.current = false
        setError('Failed to load stream')
      }
    }

    // Handle stalled streams
    const handleStalled = () => {
      console.log('Stream stalled')
    }

    // Handle waiting state
    const handleWaiting = () => {
      console.log('Stream waiting for data...')
    }

    // Handle ended event (shouldn't happen with streams, but just in case)
    const handleEnded = () => {
      console.log('Stream ended')
    }

    audio.addEventListener('loadstart', handleLoadStart)
    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('playing', handlePlaying)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('error', handleError)
    audio.addEventListener('stalled', handleStalled)
    audio.addEventListener('waiting', handleWaiting)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('loadstart', handleLoadStart)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('playing', handlePlaying)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('stalled', handleStalled)
      audio.removeEventListener('waiting', handleWaiting)
      audio.removeEventListener('ended', handleEnded)

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }

      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current)
      }

      audio.pause()
      audio.src = ''

      // Remove audio element from DOM
      if (audio.parentNode) {
        audio.parentNode.removeChild(audio)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const play = useCallback(
    async (station: Station) => {
      if (!audioRef.current) return

      setError(null)
      setIsLoading(true)
      shouldBePlayingRef.current = true
      retryCountRef.current = 0

      // Clear any existing retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }

      // Clear any existing load timeout
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current)
        loadTimeoutRef.current = null
      }

      try {
        // Resume AudioContext if suspended (required for user gesture)
        if (audioEqualizer.context?.state === 'suspended') {
          await audioEqualizer.context.resume()
          console.log('AudioContext resumed')
        }

        const audio = audioRef.current

        // If switching stations, properly stop current and load new
        if (currentStation?.urlResolved !== station.urlResolved) {
          // Pause and reset current audio
          audio.pause()
          audio.currentTime = 0

          // Set new source and load it
          audio.src = station.urlResolved
          audio.load() // Important: explicitly load the new stream

          // Update the current station
          setCurrentStation(station)

          console.log(`Switching to station: ${station.name} (${station.urlResolved})`)
        }

        // Attempt to play
        await audio.play()

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error('Play error:', err)

        if (err.name === 'NotAllowedError') {
          setError('Click to enable audio playback')
        } else if (err.name === 'AbortError') {
          setError('Playback was interrupted')
        } else if (err.name === 'NotSupportedError') {
          setError('This audio format is not supported')
        } else {
          setError('Failed to play stream')
        }
        setIsLoading(false)
        shouldBePlayingRef.current = false
      }
    },
    [currentStation?.urlResolved]
  )

  const pause = useCallback(() => {
    if (!audioRef.current) return
    shouldBePlayingRef.current = false

    // Clear any retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }

    // Clear any load timeout
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current)
      loadTimeoutRef.current = null
    }

    audioRef.current.pause()
  }, [])

  const stop = useCallback(() => {
    if (!audioRef.current) return
    shouldBePlayingRef.current = false

    // Clear any retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }

    // Clear any load timeout
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current)
      loadTimeoutRef.current = null
    }

    audioRef.current.pause()
    audioRef.current.src = ''
    setCurrentStation(null)
    setIsPlaying(false)
    setIsLoading(false) // Ensure loading is cleared when stopping
  }, [])

  const setVolume = useCallback(
    (newVolume: number) => {
      const clampedVolume = Math.max(0, Math.min(1, newVolume))
      setVolumeState(clampedVolume)
      if (audioRef.current) {
        audioRef.current.volume = clampedVolume
      }
      if (clampedVolume > 0 && isMuted) {
        setIsMuted(false)
      }
    },
    [isMuted]
  )

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return

    if (isMuted) {
      audioRef.current.volume = volume
      setIsMuted(false)
    } else {
      audioRef.current.volume = 0
      setIsMuted(true)
    }
  }, [isMuted, volume])

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
