import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAudioPlayer } from './audio-player-context'

export type SleepTimerPreset = 15 | 30 | 45 | 60 | 90 | 120 | 'custom'

interface SleepTimerContextType {
  // State
  isActive: boolean
  remainingSeconds: number
  selectedPreset: SleepTimerPreset | null

  // Actions
  startTimer: (minutes: number) => void
  startPreset: (preset: SleepTimerPreset, customMinutes?: number) => void
  stopTimer: () => void
  addTime: (minutes: number) => void

  // Helpers
  formatTimeRemaining: () => string
}

const SleepTimerContext = createContext<SleepTimerContextType | undefined>(undefined)

interface SleepTimerProviderProps {
  children: React.ReactNode
}

export const SleepTimerProvider: React.FC<SleepTimerProviderProps> = ({
  children
}: SleepTimerProviderProps) => {
  const { stop, isPlaying } = useAudioPlayer()
  const [isActive, setIsActive] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [selectedPreset, setSelectedPreset] = useState<SleepTimerPreset | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  // Handle countdown
  useEffect(() => {
    if (!isActive) return

    intervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          // Timer finished
          setIsActive(false)
          setSelectedPreset(null)
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          // Stop audio playback
          stop()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isActive, stop])

  // If audio stops while timer is active, optionally stop the timer
  useEffect(() => {
    if (!isPlaying && isActive) {
      // Keep timer running - user might resume
      // Uncomment below to auto-cancel timer when audio stops:
      // stopTimer();
    }
  }, [isPlaying, isActive])

  const startTimer = useCallback((minutes: number) => {
    if (minutes <= 0) return

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    setRemainingSeconds(minutes * 60)
    setIsActive(true)
  }, [])

  const startPreset = useCallback(
    (preset: SleepTimerPreset, customMinutes?: number) => {
      setSelectedPreset(preset)

      if (preset === 'custom' && customMinutes) {
        startTimer(customMinutes)
      } else if (typeof preset === 'number') {
        startTimer(preset)
      }
    },
    [startTimer]
  )

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsActive(false)
    setRemainingSeconds(0)
    setSelectedPreset(null)
  }, [])

  const addTime = useCallback(
    (minutes: number) => {
      if (minutes <= 0) return
      setRemainingSeconds((prev) => prev + minutes * 60)
      if (!isActive) {
        setIsActive(true)
      }
    },
    [isActive]
  )

  const formatTimeRemaining = useCallback((): string => {
    if (remainingSeconds <= 0) return '0:00'

    const hours = Math.floor(remainingSeconds / 3600)
    const minutes = Math.floor((remainingSeconds % 3600) / 60)
    const seconds = remainingSeconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }, [remainingSeconds])

  return (
    <SleepTimerContext.Provider
      value={{
        isActive,
        remainingSeconds,
        selectedPreset,
        startTimer,
        startPreset,
        stopTimer,
        addTime,
        formatTimeRemaining
      }}
    >
      {children}
    </SleepTimerContext.Provider>
  )
}

export const useSleepTimer = (): SleepTimerContextType => {
  const context = useContext(SleepTimerContext)
  if (!context) {
    throw new Error('useSleepTimer must be used within SleepTimerProvider')
  }
  return context
}
