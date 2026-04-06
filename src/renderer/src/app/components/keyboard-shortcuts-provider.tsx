import { useCallback } from 'react'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useModal } from '../contexts/modal-context'

interface KeyboardShortcutsProviderProps {
  children: React.ReactNode
}

export const KeyboardShortcutsProvider: React.FC<KeyboardShortcutsProviderProps> = ({
  children
}: KeyboardShortcutsProviderProps) => {
  const { openSleepTimerModal, isModalOpen } = useModal()

  const handleSleepTimerToggle = useCallback(() => {
    if (isModalOpen('sleep-timer')) {
      // The modal system will handle closing via onClose
      return
    }
    openSleepTimerModal()
  }, [openSleepTimerModal, isModalOpen])

  // Initialize keyboard shortcuts
  useKeyboardShortcuts({
    enabled: true,
    onSleepTimerToggle: handleSleepTimerToggle
  })

  return <>{children}</>
}
