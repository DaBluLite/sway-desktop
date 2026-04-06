import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { getItem, setItem, STORES } from '../lib/indexeddb'
import { audioEqualizer, EQ_FREQUENCIES, EQ_PRESETS, EQPreset } from '../lib/audio-eq'

interface EQSettings {
  enabled: boolean
  bands: number[]
  preamp: number
  currentPreset: string | null
}

interface EqualizerContextType {
  enabled: boolean
  bands: number[]
  preamp: number
  currentPreset: string | null
  presets: EQPreset[]
  frequencies: number[]
  toggleEQ: () => void
  setBandGain: (index: number, gain: number) => void
  setPreamp: (gain: number) => void
  applyPreset: (presetName: string) => void
  resetEQ: () => void
  connectToAudio: (audioElement: HTMLAudioElement) => void
}

const EqualizerContext = createContext<EqualizerContextType | undefined>(undefined)

const EQ_KEY = 'eq-settings'
const DEFAULT_BANDS = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

export const EqualizerProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}: {
  children: React.ReactNode
}) => {
  const [enabled, setEnabled] = useState(false)
  const [bands, setBands] = useState<number[]>(DEFAULT_BANDS)
  const [preamp, setPreampState] = useState(0)
  const [currentPreset, setCurrentPreset] = useState<string | null>('Flat')
  const [isLoaded, setIsLoaded] = useState(false)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)

  // Load settings from IndexedDB
  useEffect(() => {
    const loadSettings = async () => {
      const stored = await getItem<EQSettings>(STORES.EQUALIZER, EQ_KEY)
      if (stored) {
        setEnabled(stored.enabled)
        setBands(stored.bands)
        setPreampState(stored.preamp)
        setCurrentPreset(stored.currentPreset)
      }
      setIsLoaded(true)
    }
    loadSettings()
  }, [])

  // Persist settings
  useEffect(() => {
    if (isLoaded) {
      const settings: EQSettings = { enabled, bands, preamp, currentPreset }
      setItem(STORES.EQUALIZER, EQ_KEY, settings)
    }
  }, [enabled, bands, preamp, currentPreset, isLoaded])

  // Apply EQ when settings change
  useEffect(() => {
    if (audioEqualizer.isActive) {
      if (enabled) {
        audioEqualizer.setAllBands(bands)
        audioEqualizer.setPreamp(preamp)
      } else {
        audioEqualizer.setAllBands(DEFAULT_BANDS)
        audioEqualizer.setPreamp(0)
      }
    }
  }, [enabled, bands, preamp])

  const connectToAudio = useCallback(
    (audioElement: HTMLAudioElement) => {
      audioElementRef.current = audioElement
      audioEqualizer.connect(audioElement)
      if (enabled) {
        audioEqualizer.setAllBands(bands)
        audioEqualizer.setPreamp(preamp)
      } else {
        audioEqualizer.setAllBands(DEFAULT_BANDS)
        audioEqualizer.setPreamp(0)
      }
    },
    [enabled, bands, preamp]
  )

  const toggleEQ = useCallback(() => {
    setEnabled((prev) => !prev)
  }, [])

  const setBandGain = useCallback(
    (index: number, gain: number) => {
      setBands((prev) => {
        const newBands = [...prev]
        newBands[index] = gain
        return newBands
      })
      setCurrentPreset(null) // Custom setting
      if (enabled && audioEqualizer.isActive) {
        audioEqualizer.setBandGain(index, gain)
      }
    },
    [enabled]
  )

  const setPreamp = useCallback(
    (gain: number) => {
      setPreampState(gain)
      if (enabled && audioEqualizer.isActive) {
        audioEqualizer.setPreamp(gain)
      }
    },
    [enabled]
  )

  const applyPreset = useCallback(
    (presetName: string) => {
      const preset = EQ_PRESETS.find((p) => p.name === presetName)
      if (preset) {
        setBands(preset.bands)
        setCurrentPreset(presetName)
        if (enabled && audioEqualizer.isActive) {
          audioEqualizer.applyPreset(preset)
        }
      }
    },
    [enabled]
  )

  const resetEQ = useCallback(() => {
    setBands(DEFAULT_BANDS)
    setPreampState(0)
    setCurrentPreset('Flat')
    if (enabled && audioEqualizer.isActive) {
      audioEqualizer.setAllBands(DEFAULT_BANDS)
      audioEqualizer.setPreamp(0)
    }
  }, [enabled])

  return (
    <EqualizerContext.Provider
      value={{
        enabled,
        bands,
        preamp,
        currentPreset,
        presets: EQ_PRESETS,
        frequencies: EQ_FREQUENCIES,
        toggleEQ,
        setBandGain,
        setPreamp,
        applyPreset,
        resetEQ,
        connectToAudio
      }}
    >
      {children}
    </EqualizerContext.Provider>
  )
}

export const useEqualizer = (): EqualizerContextType => {
  const context = useContext(EqualizerContext)
  if (!context) {
    throw new Error('useEqualizer must be used within EqualizerProvider')
  }
  return context
}
