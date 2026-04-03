import { createContext, useContext, useState, useEffect } from 'react'

const VersionContext = createContext<{ isStale: boolean } | null>(null)

export function VersionProvider({ children }: { children: React.ReactNode }) {
  const [isStale, setIsStale] = useState(false)

  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return

    const handler = () => setIsStale(true)
    window.addEventListener('version-mismatch', handler)
    return () => window.removeEventListener('version-mismatch', handler)
  }, [])

  return <VersionContext.Provider value={{ isStale }}>{children}</VersionContext.Provider>
}

export function useVersion() {
  const ctx = useContext(VersionContext)
  if (!ctx) throw new Error('useVersion must be used within a VersionProvider')
  return ctx
}
