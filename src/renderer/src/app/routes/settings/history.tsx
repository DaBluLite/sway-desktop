import { mdiHistory } from '@mdi/js'
import Icon from '@mdi/react'
import { useHistory } from '../../contexts/history-context'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/settings/history')({
  component: HistorySettings
})

function HistorySettings() {
  const { history, clearHistory } = useHistory()
  return (
    <div className="settings-section flex flex-col gap-8 overflow-y-auto">
      <section className="flex flex-col gap-4 mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-2">
          History
        </h3>
        <div className="settings-item">
          <div className="flex items-center justify-between mb-4">
            <div>
              <label className="settings-label">History Entries</label>
              <p className="text-zinc-400 text-sm">{history.length} entries stored</p>
            </div>
          </div>

          {history.length > 0 && (
            <button
              onClick={() => {
                if (
                  window.confirm(
                    'Are you sure you want to clear your listening history? This cannot be undone.'
                  )
                ) {
                  clearHistory()
                }
              }}
              className="flex items-center gap-2 px-4 py-2 btn-danger rounded-md use-transition"
            >
              <Icon path={mdiHistory} size={0.9} />
              Clear All History
            </button>
          )}
        </div>

        <div className="mt-6 p-3 raised-interface rounded-md">
          <p className="text-sm text-zinc-400">
            <strong className="text-zinc-300">Note:</strong> History is stored in your browser and
            limited to the last 100 entries. It is never sent to any server.
          </p>
        </div>
      </section>
    </div>
  )
}
