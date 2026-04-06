import { useEffect, useCallback } from 'react'
import { useAudioPlayer } from '../contexts/audio-player-context'
import { useSleepTimer } from '../contexts/sleep-timer-context'

interface KeyboardShortcutsOptions {
  enabled?: boolean
  onSleepTimerToggle?: () => void
}

export const useKeyboardShortcuts = (options: KeyboardShortcutsOptions = {}) => {
  const { enabled = true, onSleepTimerToggle } = options

  const { isPlaying, currentStation, volume, play, pause, stop, setVolume, toggleMute } =
    useAudioPlayer()
  // Just verify the hook is available - we use it via the callback
  useSleepTimer()

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      const key = event.key.toLowerCase()
      const isCtrl = event.ctrlKey || event.metaKey
      const isShift = event.shiftKey

      // Space: Play/Pause
      if (key === ' ' && !isCtrl && !isShift) {
        event.preventDefault()
        if (isPlaying) {
          pause()
        } else if (currentStation) {
          play(currentStation)
        }
        return
      }

      // Escape: Stop playback
      if (key === 'escape' && !isCtrl && !isShift) {
        event.preventDefault()
        stop()
        return
      }

      // M: Toggle mute
      if (key === 'm' && !isCtrl && !isShift) {
        event.preventDefault()
        toggleMute()
        return
      }

      // Arrow Up: Volume up
      if (key === 'arrowup' && !isCtrl && !isShift) {
        event.preventDefault()
        const newVolume = Math.min(1, volume + 0.05)
        setVolume(newVolume)
        return
      }

      // Arrow Down: Volume down
      if (key === 'arrowdown' && !isCtrl && !isShift) {
        event.preventDefault()
        const newVolume = Math.max(0, volume - 0.05)
        setVolume(newVolume)
        return
      }

      // Shift + Arrow Up: Volume up by 10%
      if (key === 'arrowup' && isShift && !isCtrl) {
        event.preventDefault()
        const newVolume = Math.min(1, volume + 0.1)
        setVolume(newVolume)
        return
      }

      // Shift + Arrow Down: Volume down by 10%
      if (key === 'arrowdown' && isShift && !isCtrl) {
        event.preventDefault()
        const newVolume = Math.max(0, volume - 0.1)
        setVolume(newVolume)
        return
      }

      // T: Toggle sleep timer modal
      if (key === 't' && !isCtrl && !isShift) {
        event.preventDefault()
        if (onSleepTimerToggle) {
          onSleepTimerToggle()
        }
        return
      }

      // 0: Set volume to 100%
      if (key === '0' && !isCtrl && !isShift) {
        event.preventDefault()
        setVolume(1)
        return
      }

      // 9: Set volume to 90%
      if (key === '9' && !isCtrl && !isShift) {
        event.preventDefault()
        setVolume(0.9)
        return
      }

      // 8: Set volume to 80%
      if (key === '8' && !isCtrl && !isShift) {
        event.preventDefault()
        setVolume(0.8)
        return
      }

      // 7: Set volume to 70%
      if (key === '7' && !isCtrl && !isShift) {
        event.preventDefault()
        setVolume(0.7)
        return
      }
    },
    [
      isPlaying,
      currentStation,
      volume,
      play,
      pause,
      stop,
      setVolume,
      toggleMute,
      onSleepTimerToggle
    ]
  )

  useEffect(() => {
    if (!enabled) return

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, handleKeyDown])

  // Return information about available shortcuts for help display
  return {
    shortcuts: [
      { key: 'Space', description: 'Play / Pause' },
      { key: 'Escape', description: 'Stop playback' },
      { key: 'M', description: 'Toggle mute' },
      { key: '↑ / ↓', description: 'Volume up / down (5%)' },
      { key: 'Shift + ↑ / ↓', description: 'Volume up / down (10%)' },
      { key: '1-6', description: 'Play saved station from slot' },
      { key: '7-0', description: 'Set volume (70%-100%)' },
      { key: 'B', description: 'Switch station bank' },
      { key: 'T', description: 'Toggle sleep timer' }
    ]
  }
}
