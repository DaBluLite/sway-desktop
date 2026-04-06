import { createFileRoute } from '@tanstack/react-router'
import { mdiKeyboard, mdiDatabaseExport } from '@mdi/js'
import { Icon } from '@mdi/react'
import { useModal } from '../../contexts/modal-context'

export const Route = createFileRoute('/settings/')({
  component: SystemSettings
})

function SystemSettings() {
  const { openKeyboardShortcutsModal, openImportExportModal } = useModal()
  return (
    <>
      <div className="settings-section">
        <div className="settings-item mt-6">
          <label className="settings-label">Keyboard Shortcuts</label>
          <p className="settings-description">Use keyboard shortcuts for quick controls</p>
          <button
            onClick={() => {
              openKeyboardShortcutsModal()
            }}
            className="btn px-4 py-2 rounded-md cursor-pointer gap-2 flex items-center use-theme-text"
          >
            <Icon path={mdiKeyboard} size={0.9} />
            View Shortcuts
          </button>
        </div>

        <div className="settings-item mt-6">
          <label className="settings-label">Backup & Restore</label>
          <p className="settings-description">
            Export your data for backup or import from a previous backup
          </p>
          <button
            onClick={() => openImportExportModal()}
            className="btn px-4 py-2 rounded-md cursor-pointer gap-2 flex items-center use-theme-text"
          >
            <Icon path={mdiDatabaseExport} size={0.9} />
            Import / Export Data
          </button>
        </div>
      </div>
    </>
  )
}
