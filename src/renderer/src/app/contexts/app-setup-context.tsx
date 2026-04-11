import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getItem, setItem, STORES } from '../lib/indexeddb'

interface AppSetupContextType {
  setupCompleted: boolean
  completeSetup: () => void
  isInitialized: boolean
}

const AppSetupContext = createContext<AppSetupContextType | undefined>(undefined)

const SETUP_COMPLETED_KEY = 'app-setup-completed'

export const AppSetupProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [setupCompleted, setSetupCompletedState] = useState<boolean>(false)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const loadSetupStatus = async () => {
      const stored = await getItem<boolean>(STORES.SETTINGS, SETUP_COMPLETED_KEY)
      if (stored !== null) {
        setSetupCompletedState(stored)
      }
      setIsInitialized(true)
    }
    loadSetupStatus()
  }, [])

  const completeSetup = useCallback(() => {
    setSetupCompletedState(true)
    setItem(STORES.SETTINGS, SETUP_COMPLETED_KEY, true).catch((error) => {
      console.error('Failed to save setup status:', error)
    })
  }, [])

  return (
    <AppSetupContext.Provider value={{ setupCompleted, completeSetup, isInitialized }}>
      {children}
    </AppSetupContext.Provider>
  )
}

export const useAppSetup = () => {
  const context = useContext(AppSetupContext)
  if (context === undefined) {
    throw new Error('useAppSetup must be used within an AppSetupProvider')
  }
  return context
}
