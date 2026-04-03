import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { getItem, setItem, STORES } from '../lib/indexeddb'
import { Station } from 'radio-browser-api'
import { audioEqualizer } from '../lib/audio-eq'

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
  startRecording: (station: Station, audioElement: HTMLAudioElement) => Promise<boolean>
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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null)
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null)
  const shouldStopRef = useRef(false)
  const usingSharedContextRef = useRef(false) // Track if using equalizer's shared context

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

  const getFileExtension = (mimeType: string): string => {
    if (mimeType.includes('mp4')) return 'mp4'
    if (mimeType.includes('mpeg')) return 'mp3'
    if (mimeType.includes('wav')) return 'wav'
    if (mimeType.includes('ogg')) return 'ogg'
    return 'webm'
  }

  const acceptDisclaimer = useCallback(() => {
    setDisclaimerAccepted(true)
    setItem(STORES.SETTINGS, DISCLAIMER_KEY, true)
  }, [])

  const stopRecording = useCallback(async (): Promise<Recording | null> => {
    if (!isRecording || !mediaRecorderRef.current || !currentRecordingStation) {
      return null
    }

    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current!
      const station = currentRecordingStation!

      recorder.onstop = async () => {
        const endTime = Date.now()
        const duration = Math.floor((endTime - startTimeRef.current) / 1000)

        console.log(
          'Stop recording - chunks collected:',
          chunksRef.current.length,
          'total size:',
          chunksRef.current.reduce((acc, chunk) => acc + chunk.size, 0)
        )

        // Create blob from chunks
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType
        })

        console.log('Blob created, size:', blob.size, 'type:', blob.type)

        // Convert blob to ArrayBuffer for storage
        const arrayBuffer = await blob.arrayBuffer()
        console.log('ArrayBuffer created, byteLength:', arrayBuffer.byteLength)

        // Create object URL for playback
        const blobUrl = URL.createObjectURL(blob)
        console.log('Blob URL created:', blobUrl)

        // Generate filename
        const date = new Date(startTimeRef.current)
        const dateStr = date.toISOString().split('T')[0]
        const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-')
        const sanitizedName = station.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)
        const extension = getFileExtension(recorder.mimeType)
        const fileName = `${sanitizedName}_${dateStr}_${timeStr}.${extension}`

        const recording: Recording = {
          id: crypto.randomUUID(),
          stationName: station.name,
          stationUrl: station.url,
          stationFavicon: station.favicon,
          startTime: startTimeRef.current,
          endTime,
          duration,
          size: blob.size,
          mimeType: recorder.mimeType,
          blobUrl,
          fileName,
          blobData: arrayBuffer // Store the actual audio data
        }

        console.log('Recording object created:', {
          id: recording.id,
          size: recording.size,
          duration: recording.duration,
          mimeType: recording.mimeType
        })

        // Store blob for download/playback
        blobStore.set(recording.id, blob)
        console.log('Blob stored in memory, blobStore size:', blobStore.size)

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
        chunksRef.current = []
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current)
        }

        // Disconnect audio nodes
        try {
          sourceNodeRef.current?.disconnect()
          destinationRef.current?.disconnect()
          // Only close the audio context if we created it ourselves (not shared from equalizer)
          if (
            audioContextRef.current &&
            audioContextRef.current.state !== 'closed' &&
            !usingSharedContextRef.current
          ) {
            audioContextRef.current.close()
          }
        } catch {
          // Ignore disconnection errors
        }

        // Reset refs to null to prevent reuse
        sourceNodeRef.current = null
        destinationRef.current = null
        // Only reset audioContextRef if we're not using shared context
        if (!usingSharedContextRef.current) {
          audioContextRef.current = null
        }
        usingSharedContextRef.current = false

        setIsRecording(false)
        setCurrentRecordingStation(null)
        setRecordingDuration(0)
        shouldStopRef.current = false

        resolve(recording)
      }

      recorder.stop()
    })
  }, [isRecording, currentRecordingStation])

  const startRecording = useCallback(
    async (station: Station, audioElement: HTMLAudioElement): Promise<boolean> => {
      if (isRecording) {
        console.warn('Already recording')
        return false
      }

      if (!disclaimerAccepted) {
        console.warn('Disclaimer not accepted')
        return false
      }

      try {
        console.log('Starting recording from:', audioElement.src)

        // Cleanup any existing audio connections before starting
        if (sourceNodeRef.current) {
          try {
            sourceNodeRef.current.disconnect()
            sourceNodeRef.current = null
          } catch (error) {
            console.warn('Error disconnecting existing source node:', error)
          }
        }
        if (destinationRef.current) {
          try {
            destinationRef.current.disconnect()
            destinationRef.current = null
          } catch (error) {
            console.warn('Error disconnecting existing destination:', error)
          }
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          try {
            // Only close if we created the context ourselves (not shared from equalizer)
            if (!usingSharedContextRef.current) {
              await audioContextRef.current.close()
            }
            // Only reset the ref if we're not using shared context
            if (!usingSharedContextRef.current) {
              audioContextRef.current = null
            }
          } catch (error) {
            console.warn('Error closing existing audio context:', error)
          }
        }

        // Check if audio is playing
        if (audioElement.paused) {
          console.warn('Audio element is paused, cannot record')
          throw new Error('Audio must be playing to record')
        }

        // Ensure we're in a browser environment
        if (typeof window === 'undefined') {
          throw new Error('Recording is only available in browser environments')
        }

        // Create audio context
        const audioContextClass: typeof AudioContext =
          window.AudioContext ||
          ((window as unknown as Record<string, unknown>).webkitAudioContext as typeof AudioContext)
        audioContextRef.current = new audioContextClass()
        let audioContext = audioContextRef.current

        // Resume audio context if it's suspended
        if (audioContext.state === 'suspended') {
          console.log('Resuming audio context')
          await audioContext.resume()
        }

        console.log('Audio context created - sample rate:', audioContext.sampleRate)

        // Try to tap into existing equalizer audio chain first
        let useEqualizerChain = false
        if (audioEqualizer.getIsConnected() && audioEqualizer.getAudioContext()) {
          try {
            // Use the existing audio context from the equalizer
            audioContextRef.current = audioEqualizer.getAudioContext()
            audioContext = audioContextRef.current!
            usingSharedContextRef.current = true // Mark that we're using shared context

            console.log(
              'Using existing equalizer audio context - sample rate:',
              audioContext.sampleRate
            )

            // Get the output node from the equalizer to tap into the audio chain
            const equalizerOutput = audioEqualizer.getOutputNode()
            if (equalizerOutput) {
              // Create a gain node to split the audio signal
              const splitterGainNode = audioContext.createGain()
              splitterGainNode.gain.value = 1.0 // No gain change, just split

              // Create a destination for recording
              destinationRef.current = audioContext.createMediaStreamDestination()

              // Connect equalizer output to our splitter, then to recording destination
              // Note: We don't disconnect the equalizer's connection to speakers
              equalizerOutput.connect(splitterGainNode)
              splitterGainNode.connect(destinationRef.current)

              useEqualizerChain = true
              console.log('Successfully tapped into equalizer audio chain')
            }
          } catch (error) {
            console.warn(
              'Could not tap into equalizer chain, falling back to direct method:',
              error
            )
            useEqualizerChain = false
          }
        }

        // Fallback: Try to create a media element source directly
        if (!useEqualizerChain) {
          usingSharedContextRef.current = false // Mark that we're using our own context
          try {
            sourceNodeRef.current = audioContext.createMediaElementSource(audioElement)
            console.log('Media element source created successfully')

            // Create a gain node to control volume and split audio
            const gainNode = audioContext.createGain()
            sourceNodeRef.current.connect(gainNode)

            // Create a destination for recording
            destinationRef.current = audioContext.createMediaStreamDestination()

            // Connect gain to recording destination and speakers
            gainNode.connect(destinationRef.current)
            gainNode.connect(audioContext.destination)
          } catch (error) {
            console.warn('Could not create media element source, trying alternative method:', error)
            // If createMediaElementSource fails, we'll need to use ScriptProcessor
            // which is deprecated but works for cross-origin streams
            throw new Error(
              'Unable to capture audio from this stream. This may be a CORS restriction.'
            )
          }
        }

        console.log(
          'Audio routing complete - destination stream tracks:',
          destinationRef.current?.stream.getTracks().length || 0
        )

        // Determine supported MIME type - prioritize widely compatible formats
        let mimeType = 'audio/webm'

        // Check formats in order of compatibility
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4'
        } else if (MediaRecorder.isTypeSupported('audio/mpeg')) {
          mimeType = 'audio/mpeg'
        } else if (MediaRecorder.isTypeSupported('audio/wav')) {
          mimeType = 'audio/wav'
        } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
          mimeType = 'audio/ogg;codecs=opus'
        } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus'
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm'
        }

        console.log('Using MIME type:', mimeType)

        // Ensure we have a destination for recording
        if (!destinationRef.current) {
          throw new Error('Failed to create audio recording destination')
        }

        // Create MediaRecorder
        mediaRecorderRef.current = new MediaRecorder(destinationRef.current.stream, {
          mimeType,
          audioBitsPerSecond: 128000
        })

        chunksRef.current = []
        shouldStopRef.current = false

        mediaRecorderRef.current.onerror = (event) => {
          console.error('MediaRecorder error:', event.error)
        }

        mediaRecorderRef.current.ondataavailable = (event) => {
          console.log(
            'Data available, size:',
            event.data.size,
            'bytes, chunks count:',
            chunksRef.current.length + 1
          )
          if (event.data.size > 0) {
            chunksRef.current.push(event.data)
          }
        }

        mediaRecorderRef.current.onstart = () => {
          console.log('MediaRecorder started successfully')
        }

        mediaRecorderRef.current.onstop = () => {
          console.log(
            'MediaRecorder stopped, total chunks:',
            chunksRef.current.length,
            'total size:',
            chunksRef.current.reduce((acc, chunk) => acc + chunk.size, 0)
          )
        }

        mediaRecorderRef.current.start(1000) // Collect data every second
        startTimeRef.current = Date.now()
        setIsRecording(true)
        setCurrentRecordingStation(station)
        setRecordingDuration(0)

        console.log('Recording started for station:', station.name)

        // Update duration every second
        durationIntervalRef.current = setInterval(() => {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
          setRecordingDuration(elapsed)

          // Auto-stop at max duration - use ref flag to trigger stop
          if (elapsed >= MAX_RECORDING_DURATION) {
            shouldStopRef.current = true
          }
        }, 1000)

        return true
      } catch (error) {
        console.error('Failed to start recording:', error)
        if (error instanceof Error) {
          console.error('Error details:', error.message, error.stack)
        }
        // Cleanup on failure
        try {
          if (sourceNodeRef.current) {
            sourceNodeRef.current.disconnect()
          }
          if (destinationRef.current) {
            destinationRef.current.disconnect()
          }
          // Only close if we created the context ourselves (not shared from equalizer)
          if (
            audioContextRef.current &&
            audioContextRef.current.state !== 'closed' &&
            !usingSharedContextRef.current
          ) {
            audioContextRef.current.close()
          }
        } catch {
          // Ignore cleanup errors
        }

        // Reset refs to null to prevent reuse
        sourceNodeRef.current = null
        destinationRef.current = null
        // Only reset audioContextRef if we're not using shared context
        if (!usingSharedContextRef.current) {
          audioContextRef.current = null
        }
        usingSharedContextRef.current = false
        return false
      }
    },
    [isRecording, disclaimerAccepted]
  )

  // Effect to handle auto-stop when max duration reached
  useEffect(() => {
    if (shouldStopRef.current && isRecording) {
      stopRecording()
    }
  }, [recordingDuration, isRecording, stopRecording])

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
