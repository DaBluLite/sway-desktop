import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { getItem, setItem, STORES } from '../lib/indexeddb'
import { Station } from 'radio-browser-api'

export interface Recording {
  id: string
  stationName: string
  stationUrl: string
  stationFavicon?: string
  startTime: number
  endTime: number
  duration: number // in seconds
  size: number // in bytes
  mimeType: string
  blobUrl: string // Object URL for playback
  fileName: string
  blobData?: ArrayBuffer // Store actual audio data
}

interface RecordingsContextType {
  recordings: Recording[]
  isRecording: boolean
  currentRecordingStation: Station | null
  recordingDuration: number
  startRecording: (station: Station) => Promise<boolean>
  stopRecording: () => Promise<Recording | null>
  deleteRecording: (id: string) => void
  downloadRecording: (recording: Recording) => void
  clearAllRecordings: () => void
  disclaimerAccepted: boolean
  acceptDisclaimer: () => void
}

const RecordingsContext = createContext<RecordingsContextType | undefined>(undefined)

const RECORDINGS_KEY = 'recordings'
const DISCLAIMER_KEY = 'recording-disclaimer-accepted'
const MAX_RECORDING_DURATION = 3600 // 1 hour max
const MAX_RECORDINGS = 20

// Store blob data in memory during session
const blobStore = new Map<string, Blob>()

export const RecordingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}: {
  children: React.ReactNode
}) => {
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [currentRecordingStation, setCurrentRecordingStation] = useState<Station | null>(null)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  const startTimeRef = useRef<number>(0)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load recordings metadata from IndexedDB
  useEffect(() => {
    const loadRecordings = async () => {
      const stored = await getItem<Recording[]>(STORES.RECORDINGS, RECORDINGS_KEY)
      if (stored) {
        // Load recordings and recreate blob URLs from stored ArrayBuffer data
        const loadedRecordings = await Promise.all(
          stored.map(async (r) => {
            if (r.blobData) {
              try {
                // Convert ArrayBuffer back to Blob
                const blob = new Blob([r.blobData], { type: r.mimeType })
                blobStore.set(r.id, blob)
                return {
                  ...r,
                  blobUrl: URL.createObjectURL(blob)
                }
              } catch (error) {
                console.error('Failed to restore recording blob:', error)
                return {
                  ...r,
                  blobUrl: ''
                }
              }
            }
            return {
              ...r,
              blobUrl: ''
            }
          })
        )
        setRecordings(loadedRecordings)
      }

      const disclaimerStatus = await getItem<boolean>(STORES.SETTINGS, DISCLAIMER_KEY)
      if (disclaimerStatus) {
        setDisclaimerAccepted(true)
      }

      setIsLoaded(true)
    }
    loadRecordings()
  }, [])

  // Persist recordings metadata and blob data
  useEffect(() => {
    if (isLoaded) {
      // Store with blobData as ArrayBuffer for persistence
      const toStore = recordings.map((r) => {
        const blob = blobStore.get(r.id)
        if (blob) {
          return { ...r }
        }
        return r
      })
      setItem(STORES.RECORDINGS, RECORDINGS_KEY, toStore)
    }
  }, [recordings, isLoaded])

  const acceptDisclaimer = useCallback(() => {
    setDisclaimerAccepted(true)
    setItem(STORES.SETTINGS, DISCLAIMER_KEY, true)
  }, [])

  const stopRecording = useCallback(async (): Promise<Recording | null> => {
    if (!isRecording || !currentRecordingStation) {
      return null
    }

    try {
      console.log('Stopping recording via audio player service')

      // Stop recording via audio player service
      const result = await window.api.audioPlayer.stopRecording()

      if (!result.success) {
        console.error('Failed to stop recording:', result.error)
        return null
      }

      const endTime = Date.now()
      const duration = Math.floor((endTime - startTimeRef.current) / 1000)
      const station = currentRecordingStation

      console.log('Recording stopped, duration:', duration)

      // Generate filename
      const date = new Date(startTimeRef.current)
      const dateStr = date.toISOString().split('T')[0]
      const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-')
      const sanitizedName = station.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)
      const fileName = `${sanitizedName}_${dateStr}_${timeStr}.mp3`

      const recording: Recording = {
        id: crypto.randomUUID(),
        stationName: station.name,
        stationUrl: station.url,
        stationFavicon: station.favicon,
        startTime: startTimeRef.current,
        endTime,
        duration,
        size: 0, // Size will be determined when file is loaded
        mimeType: 'audio/mpeg',
        blobUrl: '', // Will be populated when file is available
        fileName
      }

      console.log('Recording metadata created:', {
        id: recording.id,
        station: recording.stationName,
        duration: recording.duration,
        fileName: recording.fileName
      })

      // Add to recordings list (limit to MAX_RECORDINGS)
      setRecordings((prev) => {
        const updated = [recording, ...prev]
        if (updated.length > MAX_RECORDINGS) {
          // Remove oldest and revoke its URL
          const removed = updated.pop()!
          if (removed.blobUrl) {
            URL.revokeObjectURL(removed.blobUrl)
          }
          blobStore.delete(removed.id)
        }
        return updated
      })

      // Cleanup
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }

      setIsRecording(false)
      setCurrentRecordingStation(null)
      setRecordingDuration(0)

      return recording
    } catch (error) {
      console.error('Failed to stop recording:', error)
      return null
    }
  }, [isRecording, currentRecordingStation])

  const startRecording = useCallback(
    async (station: Station): Promise<boolean> => {
      if (isRecording) {
        console.warn('Already recording')
        return false
      }

      if (!disclaimerAccepted) {
        console.warn('Disclaimer not accepted')
        return false
      }

      try {
        console.log('Starting recording for station:', station.name)

        // Call audio player service to start recording
        // (main process will generate proper platform-specific path)
        const result = await window.api.audioPlayer.startRecording(station)

        if (!result.success) {
          console.error('Failed to start recording:', result.error)
          return false
        }

        startTimeRef.current = Date.now()
        setIsRecording(true)
        setCurrentRecordingStation(station)
        setRecordingDuration(0)

        console.log('Recording started via audio player service')

        // Update duration every second
        durationIntervalRef.current = setInterval(() => {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
          setRecordingDuration(elapsed)

          // Auto-stop at max duration
          if (elapsed >= MAX_RECORDING_DURATION) {
            stopRecording()
          }
        }, 1000)

        return true
      } catch (error) {
        console.error('Failed to start recording:', error)
        return false
      }
    },
    [isRecording, disclaimerAccepted, stopRecording]
  )

  const deleteRecording = useCallback((id: string) => {
    setRecordings((prev) => {
      const recording = prev.find((r) => r.id === id)
      if (recording?.blobUrl) {
        URL.revokeObjectURL(recording.blobUrl)
      }
      blobStore.delete(id)
      return prev.filter((r) => r.id !== id)
    })
  }, [])

  const downloadRecording = useCallback((recording: Recording) => {
    // Ensure we're in a browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      console.warn('Download is only available in browser environments')
      return
    }

    let blob = blobStore.get(recording.id)

    // If not in memory store, try to recreate from stored ArrayBuffer
    if (!blob && recording.blobData) {
      try {
        blob = new Blob([recording.blobData], { type: recording.mimeType })
      } catch (error) {
        console.error('Failed to recreate blob from ArrayBuffer:', error)
      }
    }

    if (!blob) {
      alert('Recording data is no longer available. Please try recording again.')
      return
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = recording.fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    // Cleanup
    URL.revokeObjectURL(url)
  }, [])

  const clearAllRecordings = useCallback(() => {
    recordings.forEach((recording) => {
      if (recording.blobUrl) {
        URL.revokeObjectURL(recording.blobUrl)
      }
      blobStore.delete(recording.id)
    })
    setRecordings([])
  }, [recordings])

  return (
    <RecordingsContext.Provider
      value={{
        recordings,
        isRecording,
        currentRecordingStation,
        recordingDuration,
        startRecording,
        stopRecording,
        deleteRecording,
        downloadRecording,
        clearAllRecordings,
        disclaimerAccepted,
        acceptDisclaimer
      }}
    >
      {children}
    </RecordingsContext.Provider>
  )
}

export const useRecordings = (): RecordingsContextType => {
  const context = useContext(RecordingsContext)
  if (!context) {
    throw new Error('useRecordings must be used within RecordingsProvider')
  }
  return context
}
