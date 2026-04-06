import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface MediaPlayerScreenContextType {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
  isAnimating: boolean
}

const MediaPlayerScreenContext = createContext<MediaPlayerScreenContextType | undefined>(undefined)

interface MediaPlayerScreenProviderProps {
  children: ReactNode
}

export const MediaPlayerScreenProvider: React.FC<MediaPlayerScreenProviderProps> = ({
  children
}: MediaPlayerScreenProviderProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => {
    setIsAnimating(true)
    setTimeout(() => {
      setIsOpen(false)
      setIsAnimating(false)
    }, 300) // Delay to allow exit animation
  }, [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  return (
    <MediaPlayerScreenContext.Provider value={{ isOpen, open, close, toggle, isAnimating }}>
      {children}
    </MediaPlayerScreenContext.Provider>
  )
}

export const useMediaPlayerScreen = (): MediaPlayerScreenContextType => {
  const context = useContext(MediaPlayerScreenContext)
  if (!context) {
    throw new Error('useMediaPlayerScreen must be used within a MediaPlayerScreenProvider')
  }
  return context
}
