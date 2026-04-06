import { Icon } from '@mdi/react'
import { mdiClose, mdiKeyboard } from '@mdi/js'
import { Fragment } from 'react'

interface KeyboardShortcutsModalProps {
  onClose: () => void
}

interface ShortcutItem {
  keys: string[]
  description: string
}

interface ShortcutSection {
  title: string
  shortcuts: ShortcutItem[]
}

const SHORTCUT_SECTIONS: ShortcutSection[] = [
  {
    title: 'Playback',
    shortcuts: [
      { keys: ['Space'], description: 'Play / Pause' },
      { keys: ['Escape'], description: 'Stop playback' },
      { keys: ['M'], description: 'Toggle mute' }
    ]
  },
  {
    title: 'Volume',
    shortcuts: [
      { keys: ['↑'], description: 'Volume up (5%)' },
      { keys: ['↓'], description: 'Volume down (5%)' },
      { keys: ['Shift', '↑'], description: 'Volume up (10%)' },
      { keys: ['Shift', '↓'], description: 'Volume down (10%)' },
      { keys: ['7'], description: 'Set volume to 70%' },
      { keys: ['8'], description: 'Set volume to 80%' },
      { keys: ['9'], description: 'Set volume to 90%' },
      { keys: ['0'], description: 'Set volume to 100%' }
    ]
  },
  {
    title: 'Quick Access',
    shortcuts: [
      { keys: ['1', '-', '6'], description: 'Play saved station from slot' },
      { keys: ['B'], description: 'Switch station bank' }
    ]
  },
  {
    title: 'Features',
    shortcuts: [{ keys: ['T'], description: 'Toggle sleep timer' }]
  }
]

const KeyBadge: React.FC<{ children: React.ReactNode }> = ({
  children
}: {
  children: React.ReactNode
}) => (
  <kbd className="inline-flex items-center justify-center min-w-7 h-7 px-2 bg-zinc-700/50 border border-zinc-600 rounded-sm text-sm font-mono text-zinc-200 shadow-sm">
    {children}
  </kbd>
)

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  onClose
}: KeyboardShortcutsModalProps) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal max-w-lg!" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <Icon path={mdiKeyboard} size={1.2} className="text-white" />
            <h2 className="text-xl font-semibold text-white">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 invis-btn rounded-full use-transition"
            aria-label="Close"
          >
            <Icon path={mdiClose} size={1} className="text-white" />
          </button>
        </div>

        <div className="modal-content p-4 max-h-[70vh] overflow-y-auto">
          <div className="flex flex-col gap-6">
            {SHORTCUT_SECTIONS.map((section) => (
              <div key={section.title}>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
                  {section.title}
                </h3>
                <div className="raised-interface-lg rounded-lg">
                  {section.shortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 not-last:border-b border-subtle"
                    >
                      <span className="text-zinc-200 text-sm">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <Fragment key={keyIndex}>
                            {key === '-' || key === '+' ? (
                              <span className="text-zinc-400 text-sm mx-1">
                                {key === '-' ? 'to' : '+'}
                              </span>
                            ) : (
                              <KeyBadge>{key}</KeyBadge>
                            )}
                          </Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-3 bg-green-900/30 rounded-lg border border-green-700/12 shadow-glass">
            <p className="text-sm text-green-200/80">
              <strong className="text-green-300">Tip:</strong> Keyboard shortcuts are disabled when
              typing in input fields.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
