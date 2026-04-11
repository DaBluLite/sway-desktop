import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface WindowState {
  isMaximized: boolean
  isMinimized: boolean
  isFocused: boolean
}

interface WindowContextType {
  windowState: WindowState
  updateWindowState: (newState: Partial<WindowState>) => void
}

const WindowContext = createContext<WindowContextType | undefined>(undefined)

interface WindowProviderProps {
  children: ReactNode
}

export const WindowProvider = ({ children }: WindowProviderProps) => {
  const [windowState, setWindowState] = useState<WindowState>({
    isMaximized: false,
    isMinimized: false,
    isFocused: true
  })

  const updateWindowState = (newState: Partial<WindowState>) => {
    setWindowState((prev) => ({ ...prev, ...newState }))
  }

  useEffect(() => {
    // Listen for window state changes from main process
    const handleMaximizeChange = (_event: any, isMaximized: boolean) => {
      updateWindowState({ isMaximized })
    }

    const handleMinimizeChange = (_event: any, isMinimized: boolean) => {
      updateWindowState({ isMinimized })
    }

    const handleFocusChange = (_event: any, isFocused: boolean) => {
      updateWindowState({ isFocused })
    }

    // Add event listeners
    window.electron?.ipcRenderer.on('window-maximize-changed', handleMaximizeChange)
    window.electron?.ipcRenderer.on('window-minimize-changed', handleMinimizeChange)
    window.electron?.ipcRenderer.on('window-focus-changed', handleFocusChange)

    // Request initial window state
    window.electron?.ipcRenderer
      .invoke('get-window-state')
      .then((initialState: WindowState) => {
        setWindowState(initialState)
      })
      .catch(() => {
        // Fallback if get-window-state is not implemented yet
        console.log('Window state API not available yet')
      })

    // Cleanup listeners on unmount
    return () => {
      window.electron?.ipcRenderer.removeAllListeners('window-maximize-changed')
      window.electron?.ipcRenderer.removeAllListeners('window-minimize-changed')
      window.electron?.ipcRenderer.removeAllListeners('window-focus-changed')
    }
  }, [])

  // Effect to manage body classes based on window state
  useEffect(() => {
    const body = document.body

    // Add/remove maximized class
    if (windowState.isMaximized) {
      body.classList.add('maximized')
    } else {
      body.classList.remove('maximized')
    }

    // Add/remove minimized class
    if (windowState.isMinimized) {
      body.classList.add('minimized')
    } else {
      body.classList.remove('minimized')
    }

    // Add/remove focused class
    if (windowState.isFocused) {
      body.classList.add('focused')
    } else {
      body.classList.remove('focused')
    }

    // Cleanup on unmount
    return () => {
      body.classList.remove('maximized', 'minimized', 'focused')
    }
  }, [windowState.isMaximized, windowState.isMinimized, windowState.isFocused])

  return (
    <WindowContext.Provider value={{ windowState, updateWindowState }}>
      {children}
    </WindowContext.Provider>
  )
}

export const useWindow = () => {
  const context = useContext(WindowContext)
  if (context === undefined) {
    throw new Error('useWindow must be used within a WindowProvider')
  }
  return context
}
