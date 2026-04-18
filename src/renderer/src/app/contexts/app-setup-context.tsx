import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getItem, setItem, STORES } from '../lib/indexeddb'

interface AppSetupContextType {
  setupCompleted: boolean
  completeSetup: () => void
  isInitialized: boolean
  selectedCountry: string | null
  setSelectedCountry: (country: string) => void
}

const AppSetupContext = createContext<AppSetupContextType | undefined>(undefined)

const SETUP_COMPLETED_KEY = 'app-setup-completed'
const SELECTED_COUNTRY_KEY = 'selected-country'

export const AppSetupProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [setupCompleted, setSetupCompletedState] = useState<boolean>(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [selectedCountry, setSelectedCountryState] = useState<string | null>(null)

  useEffect(() => {
    const loadSetupStatus = async () => {
      const stored = await getItem<boolean>(STORES.SETTINGS, SETUP_COMPLETED_KEY)
      if (stored !== null) {
        setSetupCompletedState(stored)
      }

      const storedCountry = await getItem<string>(STORES.SETTINGS, SELECTED_COUNTRY_KEY)
      if (storedCountry !== null) {
        setSelectedCountryState(storedCountry)
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

  const setSelectedCountry = useCallback((country: string) => {
    setSelectedCountryState(country)
    setItem(STORES.SETTINGS, SELECTED_COUNTRY_KEY, country).catch((error) => {
      console.error('Failed to save selected country:', error)
    })
  }, [])

  return (
    <AppSetupContext.Provider
      value={{ setupCompleted, completeSetup, isInitialized, selectedCountry, setSelectedCountry }}
    >
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
