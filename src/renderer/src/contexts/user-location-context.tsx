import React, { createContext, useContext, useState, useEffect } from 'react'

interface UserLocationContextType {
  countryCode: string | null
  countryName: string | null
  city: string | null
  coordinates: { latitude: number; longitude: number } | null
  isLoading: boolean
  error: string | null
}

const UserLocationContext = createContext<UserLocationContextType>({
  countryCode: null,
  countryName: null,
  city: null,
  coordinates: null,
  isLoading: true,
  error: null
})

interface UserLocationProviderProps {
  children: React.ReactNode
}

export const UserLocationProvider: React.FC<UserLocationProviderProps> = ({ children }) => {
  const [countryCode, setCountryCode] = useState<string | null>(null)
  const [countryName, setCountryName] = useState<string | null>(null)
  const [city, setCity] = useState<string | null>(null)
  const [coordinates, setCoordinates] = useState<{
    latitude: number
    longitude: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserLocation = async () => {
      try {
        // Try ipapi.co first (free tier: 1000 requests/day)
        const response = await fetch('https://ipapi.co/json/')

        if (!response.ok) {
          throw new Error('Failed to fetch location')
        }

        const data = await response.json()

        if (data.country_code) {
          setCountryCode(data.country_code)
          setCountryName(data.country_name || null)
          setCoordinates({
            latitude: data.latitude,
            longitude: data.longitude
          })
          setCity(data.city || null)
        } else {
          throw new Error('No country data received')
        }
      } catch (err) {
        console.error('Error fetching user location:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')

        // Fallback: Try alternative service
        try {
          const fallbackResponse = await fetch('https://api.country.is/')
          const fallbackData = await fallbackResponse.json()

          if (fallbackData.country) {
            setCountryCode(fallbackData.country)
            setError(null)
          }
        } catch (fallbackErr) {
          console.error('Fallback location service also failed:', fallbackErr)
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserLocation()
  }, [])

  return (
    <UserLocationContext.Provider
      value={{
        countryCode,
        countryName,
        isLoading,
        error,
        city,
        coordinates
      }}
    >
      {children}
    </UserLocationContext.Provider>
  )
}

export const useUserLocation = (): UserLocationContextType => {
  const context = useContext(UserLocationContext)
  if (!context) {
    throw new Error('useUserLocation must be used within UserLocationProvider')
  }
  return context
}
