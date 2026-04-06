import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { getItem, setItem, STORES } from '../lib/indexeddb'

export interface BackgroundImage {
  id: string
  name: string
  data: string // Base64 data URL
}

interface BackgroundContextType {
  backgrounds: BackgroundImage[]
  selectedLight: string
  selectedDark: string
  setSelectedLight: (id: string) => void
  setSelectedDark: (id: string) => void
  addBackground: (file: File) => Promise<string>
  removeBackground: (id: string) => Promise<void>
}

const BackgroundContext = createContext<BackgroundContextType | undefined>(undefined)

export const BackgroundProvider: React.FC<{ children: ReactNode }> = ({
  children
}: {
  children: ReactNode
}) => {
  const [backgrounds, setBackgrounds] = useState<BackgroundImage[]>([])
  const [selectedLight, setSelectedLightState] = useState<string>('default-light')
  const [selectedDark, setSelectedDarkState] = useState<string>('default-dark')
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from DB on mount
  useEffect(() => {
    const loadBackgrounds = async () => {
      try {
        // Load selected settings
        const settings = await getItem<{ light: string; dark: string }>(
          STORES.SETTINGS,
          'background-selection'
        )
        if (settings) {
          if (settings.light) setSelectedLightState(settings.light)
          if (settings.dark) setSelectedDarkState(settings.dark)
        }

        // Load images
        const storedImages = await getItem<BackgroundImage[]>(STORES.BACKGROUNDS, 'images')
        if (storedImages) {
          setBackgrounds(storedImages)
        }
      } catch (error) {
        console.error('Failed to load backgrounds:', error)
      } finally {
        setIsLoaded(true)
      }
    }

    loadBackgrounds()
  }, [])

  const saveSettings = async (light: string, dark: string) => {
    await setItem(STORES.SETTINGS, 'background-selection', { light, dark })
  }

  const setSelectedLight = (id: string) => {
    setSelectedLightState(id)
    saveSettings(id, selectedDark)
  }

  const setSelectedDark = (id: string) => {
    setSelectedDarkState(id)
    saveSettings(selectedLight, id)
  }

  const addBackground = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const data = e.target?.result as string
          if (!data) return reject('Failed to read file')

          const id = 'bg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
          const newBg: BackgroundImage = {
            id,
            name: file.name,
            data
          }

          const updatedBackgrounds = [...backgrounds, newBg]
          setBackgrounds(updatedBackgrounds)
          await setItem(STORES.BACKGROUNDS, 'images', updatedBackgrounds)
          resolve(id)
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = () => reject('Error reading file')
      reader.readAsDataURL(file)
    })
  }

  const removeBackground = async (id: string) => {
    const updatedBackgrounds = backgrounds.filter((bg) => bg.id !== id)
    setBackgrounds(updatedBackgrounds)
    await setItem(STORES.BACKGROUNDS, 'images', updatedBackgrounds)

    if (selectedLight === id) {
      setSelectedLight('default-light')
    }
    if (selectedDark === id) {
      setSelectedDark('default-dark')
    }
  }

  // Apply backgrounds to DOM only on client side
  useEffect(() => {
    if (!isLoaded || typeof document === 'undefined') return

    const applyBackgrounds = () => {
      let lightUrl = "url('/light-1920x1080.png')"
      if (selectedLight !== 'default-light') {
        const bg = backgrounds.find((b) => b.id === selectedLight)
        if (bg) lightUrl = `url('${bg.data}')`
      }

      let darkUrl = "url('/dark-1920x1080.png')"
      if (selectedDark !== 'default-dark') {
        const bg = backgrounds.find((b) => b.id === selectedDark)
        if (bg) darkUrl = `url('${bg.data}')`
      }

      document.documentElement.style.setProperty('--bg-image-light', lightUrl)
      document.documentElement.style.setProperty('--bg-image-dark', darkUrl)
    }

    applyBackgrounds()
  }, [selectedLight, selectedDark, backgrounds, isLoaded])

  return (
    <BackgroundContext.Provider
      value={{
        backgrounds,
        selectedLight,
        selectedDark,
        setSelectedLight,
        setSelectedDark,
        addBackground,
        removeBackground
      }}
    >
      {children}
    </BackgroundContext.Provider>
  )
}

export const useBackground = () => {
  const context = useContext(BackgroundContext)
  if (context === undefined) {
    throw new Error('useBackground must be used within a BackgroundProvider')
  }
  return context
}
