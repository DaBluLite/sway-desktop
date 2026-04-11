import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getItem, setItem, STORES } from '../lib/indexeddb'

interface SubsonicContextType {
  subsonicEnabled: boolean
  setSubsonicEnabled: (enabled: boolean) => void
  isInitialized: boolean
}

const SubsonicContext = createContext<SubsonicContextType | undefined>(undefined)

const SUBSONIC_ENABLED_KEY = 'subsonic-enabled-preference'

export const SubsonicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [subsonicEnabled, setSubsonicEnabledState] = useState<boolean>(true)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const loadPreference = async () => {
      const stored = await getItem<boolean>(STORES.SETTINGS, SUBSONIC_ENABLED_KEY)
      if (stored !== null) {
        setSubsonicEnabledState(stored)
      }
      setIsInitialized(true)
    }
    loadPreference()
  }, [])

  const setSubsonicEnabled = useCallback((enabled: boolean) => {
    setSubsonicEnabledState(enabled)
    setItem(STORES.SETTINGS, SUBSONIC_ENABLED_KEY, enabled).catch((error) => {
      console.error('Failed to save subsonic preference:', error)
    })
  }, [])

  return (
    <SubsonicContext.Provider value={{ subsonicEnabled, setSubsonicEnabled, isInitialized }}>
      {children}
    </SubsonicContext.Provider>
  )
}

export const useSubsonic = () => {
  const context = useContext(SubsonicContext)
  if (context === undefined) {
    throw new Error('useSubsonic must be used within a SubsonicProvider')
  }
  return context
}
