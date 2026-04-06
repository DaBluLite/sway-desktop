import { createContext, useContext, useState, useCallback } from 'react'
import { Station } from 'radio-browser-api'
import { ModalContextValue, ModalConfig, ModalState, ModalType } from '../types/modal'

const ModalContext = createContext<ModalContextValue | undefined>(undefined)

interface ModalProviderProps {
  children: React.ReactNode
}

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }: ModalProviderProps) => {
  const [modals, setModals] = useState<ModalState[]>([])

  // Generate unique modal ID
  const generateModalId = useCallback((): string => {
    return `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }, [])

  // Core modal actions
  const openModal = useCallback(
    (config: ModalConfig): string => {
      const id = generateModalId()
      const modalState: ModalState = {
        ...config,
        id,
        isOpen: true
      }

      setModals((prevModals) => {
        // Check if modal of this type is already open
        const existingModal = prevModals.find((modal) => modal.type === config.type && modal.isOpen)

        if (existingModal) {
          // Update existing modal instead of creating a new one
          return prevModals.map((modal) =>
            modal.id === existingModal.id ? { ...modal, ...config, isOpen: true } : modal
          )
        }

        // Add new modal
        return [...prevModals, modalState]
      })

      return id
    },
    [generateModalId]
  )

  const closeModal = useCallback((id: string) => {
    setModals((prevModals) =>
      prevModals.map((modal) => (modal.id === id ? { ...modal, isOpen: false } : modal))
    )

    // Remove modal after animation (if any)
    setTimeout(() => {
      setModals((prevModals) => prevModals.filter((modal) => modal.id !== id))
    }, 300) // Adjust based on your modal animation duration
  }, [])

  const closeAllModals = useCallback(() => {
    setModals((prevModals) => prevModals.map((modal) => ({ ...modal, isOpen: false })))

    // Remove all modals after animation
    setTimeout(() => {
      setModals([])
    }, 300)
  }, [])

  const isModalOpen = useCallback(
    (type: ModalType): boolean => {
      return modals.some((modal) => modal.type === type && modal.isOpen)
    },
    [modals]
  )

  const getModalById = useCallback(
    (id: string): ModalState | undefined => {
      return modals.find((modal) => modal.id === id)
    },
    [modals]
  )

  // Specialized helper methods
  const openShareModal = useCallback(
    (station: Station): string => {
      return openModal({
        type: 'share-station',
        props: { station }
      })
    },
    [openModal]
  )

  const openPlaylistModal = useCallback(
    (station: Station): string => {
      return openModal({
        type: 'add-to-playlist',
        props: { station }
      })
    },
    [openModal]
  )

  const openSimilarStationsModal = useCallback(
    (station: Station): string => {
      return openModal({
        type: 'similar-stations',
        props: { station }
      })
    },
    [openModal]
  )

  const openKeyboardShortcutsModal = useCallback((): string => {
    return openModal({
      type: 'keyboard-shortcuts'
    })
  }, [openModal])

  const openSleepTimerModal = useCallback((): string => {
    return openModal({
      type: 'sleep-timer'
    })
  }, [openModal])

  const openAlarmModal = useCallback((): string => {
    return openModal({
      type: 'alarm'
    })
  }, [openModal])

  const openRecorderModal = useCallback((): string => {
    return openModal({
      type: 'recorder'
    })
  }, [openModal])

  const openImportExportModal = useCallback((): string => {
    return openModal({
      type: 'import-export'
    })
  }, [openModal])

  const contextValue: ModalContextValue = {
    modals,
    openModal,
    closeModal,
    closeAllModals,
    isModalOpen,
    getModalById,
    openShareModal,
    openPlaylistModal,
    openSimilarStationsModal,
    openKeyboardShortcutsModal,
    openSleepTimerModal,
    openAlarmModal,
    openRecorderModal,
    openImportExportModal
  }

  return <ModalContext.Provider value={contextValue}>{children}</ModalContext.Provider>
}

export const useModal = (): ModalContextValue => {
  const context = useContext(ModalContext)
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider')
  }
  return context
}
