import { createFileRoute } from '@tanstack/react-router'
import { useModal } from '../../contexts/modal-context'
import { useTheme } from '@renderer/contexts/theme-context'
import { History, Keyboard } from 'lucide-react'

export const Route = createFileRoute('/settings/')({
  component: SystemSettings
})

function SystemSettings() {
  const { openKeyboardShortcutsModal, openImportExportModal } = useModal()
  const { theme, setTheme } = useTheme()
  return (
    <>
      <div className="settings-section flex flex-col gap-8 overflow-y-auto">
        <section className="flex flex-col gap-4 mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-2">
            Appearance
          </h3>
          <div className="flex justify-center p-4 gap-4 raised-interface rounded-xl flex-col">
            <div className="flex flex-col gap-0.5">
              <span className="use-theme-text font-medium">Theme</span>
              <span className="text-xs text-zinc-500">Choose how you want the app to look</span>
            </div>
            <div className="flex gap-2 items-center">
              <button
                className={
                  'settings-theme-option' +
                  (theme === 'light' ? ' settings-theme-option-active' : '')
                }
                onClick={() => setTheme('light')}
              >
                Light
              </button>
              <button
                className={
                  'settings-theme-option' +
                  (theme === 'dark' ? ' settings-theme-option-active' : '')
                }
                onClick={() => setTheme('dark')}
              >
                Dark
              </button>
              <button
                className={
                  'settings-theme-option' +
                  (theme === 'system' ? ' settings-theme-option-active' : '')
                }
                onClick={() => setTheme('system')}
              >
                System Default
              </button>
            </div>
          </div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-2">
            System
          </h3>
          <div className="flex items-center justify-between p-4 raised-interface rounded-xl">
            <div className="flex flex-col gap-0.5">
              <span className="use-theme-text font-medium">Keyboard Shortcuts</span>
              <span className="text-xs text-zinc-500">
                Use keyboard shortcuts for quick controls
              </span>
            </div>
            <button
              onClick={() => {
                openKeyboardShortcutsModal()
              }}
              className="btn px-4 py-2 rounded-md cursor-pointer gap-2 flex items-center use-theme-text"
            >
              <Keyboard className="size-4" />
              View Shortcuts
            </button>
          </div>
          <div className="flex items-center justify-between p-4 raised-interface rounded-xl">
            <div className="flex flex-col gap-0.5">
              <span className="use-theme-text font-medium">Backup & Restore</span>
              <span className="text-xs text-zinc-500">
                Export your data for backup or import from a previous backup
              </span>
            </div>
            <button
              onClick={() => {
                openImportExportModal()
              }}
              className="btn px-4 py-2 rounded-md cursor-pointer gap-2 flex items-center use-theme-text"
            >
              <History className="size-4" />
              Import / Export
            </button>
          </div>
        </section>
      </div>
    </>
  )
}
