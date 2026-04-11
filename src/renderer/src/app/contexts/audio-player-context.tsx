import { Station } from 'radio-browser-api'
import { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { SubsonicSong } from '../../../../types/subsonic'
import {
  AudioPlayerState,
  AudioPlayerChannels,
  AudioPlayerStateChanged,
  RepeatMode,
  AudioDevice
} from '../../../../types/audio-player'
import { getItem, setItem, STORES } from '../lib/indexeddb'

interface AudioPlayerContextType {
  // State
  isPlaying: boolean
  currentStation: Station | null
  currentSong: SubsonicSong | null
  currentSongId: string | null
  queue: SubsonicSong[]
  shuffle: boolean
  repeat: RepeatMode
  duration: number
  currentTime: number
  isSeekable: boolean
  volume: number
  isMuted: boolean
  isLoading: boolean
  error: string | null

  // Settings
  gaplessEnabled: boolean
  exclusiveEnabled: boolean
  bitPerfectEnabled: boolean
  audioDevice: string | null

  // Controls
  play: (station: Station) => void
  playSong: (songs: SubsonicSong[], songId: string) => void
  shufflePlay: (songs: SubsonicSong[]) => void
  playFromQueue: (songId: string) => void
  pause: () => void
  stop: () => void
  resume: () => Promise<void>
  seek: (time: number) => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  updateSettings: (settings: Partial<AudioPlayerState>) => Promise<void>
  getAudioDevices: () => Promise<AudioDevice[]>
  onSongEnded: (callback: () => void) => () => void

  // Queue Controls
  addToQueue: (song: SubsonicSong) => void
  clearQueue: () => void
  removeFromQueue: (songId: string) => void
  toggleShuffle: () => void
  setRepeat: (mode: RepeatMode) => void
  playNext: () => void
  playPrevious: () => void
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined)

interface AudioPlayerProviderProps {
  children: React.ReactNode
}

const QUEUE_STORAGE_KEY = 'audio-player-queue'
const SHUFFLED_QUEUE_STORAGE_KEY = 'audio-player-shuffled-queue'
const SHUFFLE_STORAGE_KEY = 'audio-player-shuffle'

export const AudioPlayerProvider: React.FC<AudioPlayerProviderProps> = ({
  children
}: AudioPlayerProviderProps) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStation, setCurrentStation] = useState<Station | null>(null)
  const [currentSong, setCurrentSong] = useState<SubsonicSong | null>(null)
  const [currentSongId, setCurrentSongId] = useState<string | null>(null)
  const [originalQueue, setOriginalQueue] = useState<SubsonicSong[]>([])
  const [shuffledQueue, setShuffledQueue] = useState<SubsonicSong[]>([])
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState<RepeatMode>('off')
  const [volume, setVolumeState] = useState(0.7)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duration, setDuration] = useState<number>(0)
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [isSeekable, setIsSeekable] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Settings state
  const [gaplessEnabled, setGaplessEnabled] = useState(true)
  const [exclusiveEnabled, setExclusiveEnabled] = useState(false)
  const [bitPerfectEnabled, setBitPerfectEnabled] = useState(false)
  const [audioDevice, setAudioDevice] = useState<string | null>(null)

  const onSongEndedCallbacks = useRef<Set<() => void>>(new Set())

  // Sync with main process state and load persisted state
  useEffect(() => {
    const initAndSync = async () => {
      // 1. Load persisted queue state
      const savedQueue = await getItem<SubsonicSong[]>(STORES.SETTINGS, QUEUE_STORAGE_KEY)
      const savedShuffledQueue = await getItem<SubsonicSong[]>(
        STORES.SETTINGS,
        SHUFFLED_QUEUE_STORAGE_KEY
      )
      const savedShuffle = await getItem<boolean>(STORES.SETTINGS, SHUFFLE_STORAGE_KEY)

      if (savedQueue) setOriginalQueue(savedQueue)
      if (savedShuffledQueue) setShuffledQueue(savedShuffledQueue)
      if (savedShuffle !== null) setShuffle(savedShuffle)

      const syncState = (state: AudioPlayerState) => {
        setIsPlaying(state.isPlaying)
        setCurrentStation(state.currentStation)
        setCurrentSong(state.currentSong)
        setCurrentSongId(state.currentSong?.id || null)
        setVolumeState(state.volume)
        setIsMuted(state.isMuted)
        setIsLoading(state.isLoading)
        setError(state.error)
        setCurrentTime(state.currentTime)
        setDuration(state.duration || 0)
        setIsSeekable(state.isSeekable)

        // Update settings state
        setGaplessEnabled(state.gaplessEnabled)
        setExclusiveEnabled(state.exclusiveEnabled)
        setBitPerfectEnabled(state.bitPerfectEnabled)
        setAudioDevice(state.audioDevice)
      }

      // Get initial state
      const initialState = await window.api.audioPlayer.getState()

      // CRITICAL: Handle startup "leftovers" - if not playing, don't show metadata
      // that can't be resumed because MPV instance is fresh.
      if (!initialState.isPlaying) {
        initialState.currentStation = null
        initialState.currentSong = null
        initialState.currentTime = 0
        initialState.duration = 0
      }

      syncState(initialState)
      setIsInitialized(true)

      // Listen for changes
      const unsubscribe = window.api.audioPlayer.onStateChanged((event) => {
        syncState(event.state)

        // Detect song end
        if (event.source === 'ended') {
          onSongEndedCallbacks.current.forEach((cb) => cb())
        }
      })

      return unsubscribe
    }

    const cleanupPromise = initAndSync()
    return () => {
      cleanupPromise.then((unsubscribe) => unsubscribe && unsubscribe())
    }
  }, [])

  // Persist queue changes
  useEffect(() => {
    if (isInitialized) {
      setItem(STORES.SETTINGS, QUEUE_STORAGE_KEY, originalQueue)
      setItem(STORES.SETTINGS, SHUFFLED_QUEUE_STORAGE_KEY, shuffledQueue)
      setItem(STORES.SETTINGS, SHUFFLE_STORAGE_KEY, shuffle)
    }
  }, [originalQueue, shuffledQueue, shuffle, isInitialized])

  // The active queue depends on shuffle state
  const queue = useMemo(
    () => (shuffle ? shuffledQueue : originalQueue),
    [shuffle, shuffledQueue, originalQueue]
  )

  // Helper to shuffle an array
  const shuffleArray = (array: SubsonicSong[]) => {
    const newArray = [...array]
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[newArray[i], newArray[j]] = [newArray[j], newArray[i]]
    }
    return newArray
  }

  const onSongEnded = useCallback((callback: () => void) => {
    onSongEndedCallbacks.current.add(callback)
    return () => {
      onSongEndedCallbacks.current.delete(callback)
    }
  }, [])

  const seek = useCallback((time: number) => {
    window.api.audioPlayer.seek(time)
  }, [])

  const play = useCallback(async (station: Station) => {
    await window.api.audioPlayer.playStation(station)
  }, [])

  const playSongInternal = useCallback(async (song: SubsonicSong) => {
    try {
      const stream = await window.api.subsonic.generateStreamUrl(song.id)
      if (!stream) {
        throw new Error('Failed to generate stream URL')
      }
      await window.api.audioPlayer.playSong(song, stream)
    } catch (err: any) {
      console.error('Play error:', err)
    }
  }, [])

  const playSong = useCallback(
    async (songs: SubsonicSong[], songId: string) => {
      setOriginalQueue(songs)
      setShuffledQueue(shuffleArray(songs))

      const song = songs.find((s) => s.id === songId)
      if (song) {
        await playSongInternal(song)
      }
    },
    [playSongInternal]
  )

  const shufflePlay = useCallback(
    async (songs: SubsonicSong[]) => {
      setShuffle(true)
      const shuffled = shuffleArray(songs)
      setOriginalQueue(songs)
      setShuffledQueue(shuffled)

      if (shuffled.length > 0) {
        await playSongInternal(shuffled[0])
      }
    },
    [playSongInternal]
  )

  const playFromQueue = useCallback(
    async (songId: string) => {
      const song = queue.find((s) => s.id === songId)
      if (song) {
        await playSongInternal(song)
      }
    },
    [queue, playSongInternal]
  )

  const playNext = useCallback(() => {
    if (queue.length === 0) return

    const currentIndex = queue.findIndex((s) => s.id === currentSong?.id)
    let nextIndex = currentIndex + 1

    if (nextIndex >= queue.length) {
      if (repeat === 'all') {
        nextIndex = 0
      } else {
        return // End of queue
      }
    }

    const nextSong = queue[nextIndex]
    if (nextSong) {
      playSongInternal(nextSong)
    }
  }, [queue, currentSong, repeat, playSongInternal])

  const playPrevious = useCallback(() => {
    if (queue.length === 0) return

    const currentIndex = queue.findIndex((s) => s.id === currentSong?.id)
    let prevIndex = currentIndex - 1

    if (prevIndex < 0) {
      if (repeat === 'all') {
        prevIndex = queue.length - 1
      } else {
        prevIndex = 0 // Just restart current song or stay at first
      }
    }

    const prevSong = queue[prevIndex]
    if (prevSong) {
      playSongInternal(prevSong)
    }
  }, [queue, currentSong, repeat, playSongInternal])

  const toggleShuffle = useCallback(() => {
    setShuffle((prev) => {
      const nextShuffle = !prev
      if (nextShuffle) {
        const newShuffled = shuffleArray(originalQueue)
        if (currentSong) {
          const index = newShuffled.findIndex((s) => s.id === currentSong.id)
          if (index > -1) {
            const [song] = newShuffled.splice(index, 1)
            newShuffled.unshift(song)
          }
        }
        setShuffledQueue(newShuffled)
      }
      return nextShuffle
    })
  }, [originalQueue, currentSong])

  const addToQueue = useCallback((song: SubsonicSong) => {
    setOriginalQueue((prev) => [...prev, song])
    setShuffledQueue((prev) => [...prev, song])
  }, [])

  const clearQueue = useCallback(() => {
    setOriginalQueue([])
    setShuffledQueue([])
    setCurrentSongId(null)
    setCurrentSong(null)
    window.api.audioPlayer.stop()
  }, [])

  const removeFromQueue = useCallback(
    (songId: string) => {
      setOriginalQueue((prev) => prev.filter((s) => s.id !== songId))
      setShuffledQueue((prev) => prev.filter((s) => s.id !== songId))
      if (currentSongId === songId) {
        playNext()
      }
    },
    [currentSongId, playNext]
  )

  const resume = useCallback(async () => {
    await window.api.audioPlayer.resume()
  }, [])

  const pause = useCallback(async () => {
    await window.api.audioPlayer.pause()
  }, [])

  const stop = useCallback(async () => {
    await window.api.audioPlayer.stop()
  }, [])

  const setVolume = useCallback(async (newVolume: number) => {
    await window.api.audioPlayer.setVolume(newVolume)
  }, [])

  const toggleMute = useCallback(async () => {
    await window.api.audioPlayer.toggleMute()
  }, [])

  const updateSettings = useCallback(async (settings: Partial<AudioPlayerState>) => {
    await window.api.audioPlayer.updateSettings(settings)
  }, [])

  const getAudioDevices = useCallback(async () => {
    return await window.api.audioPlayer.getAudioDevices()
  }, [])

  // Handle automatic song advancement
  const repeatRef = useRef(repeat)
  useEffect(() => {
    repeatRef.current = repeat
  }, [repeat])

  useEffect(() => {
    const handleEndedInternal = () => {
      if (repeatRef.current === 'one') {
        if (currentSong) {
          playSongInternal(currentSong)
        }
      } else {
        playNext()
      }
    }

    const cleanup = onSongEnded(handleEndedInternal)
    return cleanup
  }, [onSongEnded, playNext, currentSong, playSongInternal])

  return (
    <AudioPlayerContext.Provider
      value={{
        isPlaying,
        currentStation,
        currentSong,
        currentSongId,
        queue,
        shuffle,
        repeat,
        playSong,
        shufflePlay,
        playFromQueue,
        volume,
        isMuted,
        isLoading,
        error,
        gaplessEnabled,
        exclusiveEnabled,
        bitPerfectEnabled,
        audioDevice,
        play,
        resume,
        pause,
        stop,
        setVolume,
        toggleMute,
        updateSettings,
        getAudioDevices,
        seek,
        isSeekable,
        duration,
        currentTime,
        onSongEnded,
        addToQueue,
        clearQueue,
        removeFromQueue,
        toggleShuffle,
        setRepeat,
        playNext,
        playPrevious
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
