import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { getItem, setItem, STORES } from '../lib/indexeddb'
import { Station } from 'radio-browser-api'
import { useAudioPlayer } from './audio-player-context'

export interface Alarm {
  id: string
  label: string
  time: string // HH:MM format
  days: number[] // 0=Sunday, 1=Monday, etc. Empty = one-time
  station: Station
  volume: number // 0-1
  enabled: boolean
  snoozeMinutes: number
  gradualVolume: boolean // Fade in volume
  createdAt: number
}

interface AlarmContextType {
  alarms: Alarm[]
  activeAlarm: Alarm | null
  isRinging: boolean
  addAlarm: (alarm: Omit<Alarm, 'id' | 'createdAt'>) => void
  updateAlarm: (id: string, updates: Partial<Alarm>) => void
  deleteAlarm: (id: string) => void
  toggleAlarm: (id: string) => void
  dismissAlarm: () => void
  snoozeAlarm: () => void
  requestNotificationPermission: () => Promise<boolean>
  notificationPermission: NotificationPermission | 'default'
}

const AlarmContext = createContext<AlarmContextType | undefined>(undefined)

const ALARMS_KEY = 'alarms'

export const AlarmProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}: {
  children: React.ReactNode
}) => {
  const [alarms, setAlarms] = useState<Alarm[]>([])
  const [activeAlarm, setActiveAlarm] = useState<Alarm | null>(null)
  const [isRinging, setIsRinging] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    () => {
      if (typeof window !== 'undefined' && typeof Notification !== 'undefined') {
        return Notification.permission
      }
      return 'default'
    }
  )
  const [isLoaded, setIsLoaded] = useState(false)
  const { play, setVolume } = useAudioPlayer()
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const volumeFadeRef = useRef<NodeJS.Timeout | null>(null)
  const snoozeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load alarms from IndexedDB
  useEffect(() => {
    const loadAlarms = async (): Promise<void> => {
      const stored = await getItem<Alarm[]>(STORES.ALARMS, ALARMS_KEY)
      if (stored) {
        setAlarms(stored)
      }
      setIsLoaded(true)
    }
    loadAlarms()
  }, [])

  // Persist alarms
  useEffect(() => {
    if (isLoaded) {
      setItem(STORES.ALARMS, ALARMS_KEY, alarms)
    }
  }, [alarms, isLoaded])

  const triggerAlarm = useCallback(
    (alarm: Alarm) => {
      setActiveAlarm(alarm)
      setIsRinging(true)

      // Show notification
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('⏰ Alarm - ' + alarm.label, {
          body: `It's time! Playing ${alarm.station.name}`,
          icon: alarm.station.favicon || '/icon-192.png',
          tag: 'alarm-' + alarm.id,
          requireInteraction: true
        })
      }

      // Start playing with gradual volume if enabled
      if (alarm.gradualVolume) {
        setVolume(0.1)
        play(alarm.station)

        let currentVolume = 0.1
        const targetVolume = alarm.volume
        const steps = 30 // 30 seconds to reach full volume
        const increment = (targetVolume - 0.1) / steps

        volumeFadeRef.current = setInterval(() => {
          currentVolume += increment
          if (currentVolume >= targetVolume) {
            setVolume(targetVolume)
            if (volumeFadeRef.current) {
              clearInterval(volumeFadeRef.current)
            }
          } else {
            setVolume(currentVolume)
          }
        }, 1000)
      } else {
        setVolume(alarm.volume)
        play(alarm.station)
      }

      // Disable one-time alarms after triggering
      if (alarm.days.length === 0) {
        setAlarms((prev) => prev.map((a) => (a.id === alarm.id ? { ...a, enabled: false } : a)))
      }
    },
    [play, setVolume]
  )

  // Check alarms every second
  useEffect(() => {
    const checkAlarms = (): void => {
      if (isRinging || activeAlarm) return

      const now = new Date()
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      const currentDay = now.getDay()
      const currentSeconds = now.getSeconds()

      // Only check at the start of each minute
      if (currentSeconds !== 0) return

      for (const alarm of alarms) {
        if (!alarm.enabled) continue
        if (alarm.time !== currentTime) continue

        // Check if alarm should trigger today
        const isOneTime = alarm.days.length === 0
        const isScheduledToday = alarm.days.includes(currentDay)

        if (isOneTime || isScheduledToday) {
          triggerAlarm(alarm)
          break
        }
      }
    }

    checkIntervalRef.current = setInterval(checkAlarms, 1000)

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
    }
  }, [alarms, isRinging, activeAlarm, triggerAlarm])

  const dismissAlarm = useCallback(() => {
    setIsRinging(false)
    setActiveAlarm(null)

    if (volumeFadeRef.current) {
      clearInterval(volumeFadeRef.current)
    }
    if (snoozeTimeoutRef.current) {
      clearTimeout(snoozeTimeoutRef.current)
    }
  }, [])

  const snoozeAlarm = useCallback(() => {
    if (!activeAlarm) return

    const alarm = activeAlarm
    setIsRinging(false)

    if (volumeFadeRef.current) {
      clearInterval(volumeFadeRef.current)
    }

    // Set snooze timeout
    snoozeTimeoutRef.current = setTimeout(
      () => {
        triggerAlarm(alarm)
      },
      alarm.snoozeMinutes * 60 * 1000
    )
  }, [activeAlarm, triggerAlarm])

  const addAlarm = useCallback((alarmData: Omit<Alarm, 'id' | 'createdAt'>) => {
    const newAlarm: Alarm = {
      ...alarmData,
      id: crypto.randomUUID(),
      createdAt: Date.now()
    }
    setAlarms((prev) => [...prev, newAlarm])
  }, [])

  const updateAlarm = useCallback((id: string, updates: Partial<Alarm>) => {
    setAlarms((prev) => prev.map((alarm) => (alarm.id === id ? { ...alarm, ...updates } : alarm)))
  }, [])

  const deleteAlarm = useCallback((id: string) => {
    setAlarms((prev) => prev.filter((alarm) => alarm.id !== id))
  }, [])

  const toggleAlarm = useCallback((id: string) => {
    setAlarms((prev) =>
      prev.map((alarm) => (alarm.id === id ? { ...alarm, enabled: !alarm.enabled } : alarm))
    )
  }, [])

  const requestNotificationPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') {
      return false
    }

    const permission = await Notification.requestPermission()
    setNotificationPermission(permission)
    return permission === 'granted'
  }, [])

  return (
    <AlarmContext.Provider
      value={{
        alarms,
        activeAlarm,
        isRinging,
        addAlarm,
        updateAlarm,
        deleteAlarm,
        toggleAlarm,
        dismissAlarm,
        snoozeAlarm,
        requestNotificationPermission,
        notificationPermission
      }}
    >
      {children}
    </AlarmContext.Provider>
  )
}

export const useAlarm = (): AlarmContextType => {
  const context = useContext(AlarmContext)
  if (!context) {
    throw new Error('useAlarm must be used within AlarmProvider')
  }
  return context
}
