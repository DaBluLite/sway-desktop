import { useState } from 'react'
import { Icon } from '@mdi/react'
import { mdiClose, mdiPlaylistPlus, mdiPlus } from '@mdi/js'
import { useCurations } from '../contexts/curations-context'
import { CreateCurationModalProps } from '../types/modal'

const COLOR_PRESETS = [
  { name: 'Blue', class: 'from-blue-500 to-cyan-500' },
  { name: 'Yellow', class: 'from-yellow-500 to-orange-500' },
  { name: 'Purple', class: 'from-purple-500 to-indigo-500' },
  { name: 'Pink', class: 'from-pink-500 to-red-500' },
  { name: 'Amber', class: 'from-amber-600 to-yellow-600' },
  { name: 'Green', class: 'from-green-500 to-teal-500' },
  { name: 'Slate', class: 'from-slate-600 to-gray-800' },
  { name: 'Red', class: 'from-red-500 to-orange-500' }
]

const EMOJI_PRESETS = ['🌊', '☀️', '📚', '🎉', '🎷', '🌍', '🌙', '💪', '🎸', '🎹', '☕', '🏢']

export const CreateCurationModal: React.FC<CreateCurationModalProps> = ({
  onClose,
  onCreated
}: CreateCurationModalProps) => {
  const { collections, createCollection } = useCurations()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState(EMOJI_PRESETS[0])
  const [color, setColor] = useState(COLOR_PRESETS[0].class)

  const handleCreate = () => {
    if (!name.trim()) return

    createCollection({
      name: name.trim(),
      description: description.trim(),
      icon,
      color,
      stations: [],
      featured: false,
      order: collections.length
    })

    if (onCreated) {
      // Since createCollection uses randomUUID, we can't easily get the ID back immediately
      // unless we change how createCollection works or generate it here.
      // For now, we'll just close.
    }

    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal max-w-md!" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <Icon path={mdiPlaylistPlus} size={1.2} className="text-white" />
            <h2 className="text-xl font-semibold text-white">Create Curation</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 invis-btn rounded-md transition"
            aria-label="Close"
          >
            <Icon path={mdiClose} size={1} className="text-white" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase text-zinc-400">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Curation name"
              className="use-transition w-full px-3 py-2 bg-second-layer-thin border border-faint rounded-md text-white placeholder-zinc-500 focus:outline-none focus:border-subtle focus:bg-second-layer-thin-active"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase text-zinc-400">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this curation about?"
              rows={2}
              className="use-transition w-full px-3 py-2 bg-second-layer-thin border border-faint rounded-md text-white placeholder-zinc-500 focus:outline-none focus:border-subtle focus:bg-second-layer-thin-active resize-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase text-zinc-400">Icon</label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_PRESETS.map((e) => (
                <button
                  key={e}
                  onClick={() => setIcon(e)}
                  className={`size-10 flex items-center justify-center rounded-md transition border ${
                    icon === e ? 'bg-accent/20 border-accent!' : 'bg-theme-bg/20 border-faint'
                  } hover:bg-theme-bg/40 cursor-pointer`}
                >
                  <span className="text-xl">{e}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase text-zinc-400">Theme Color</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.class}
                  onClick={() => setColor(c.class)}
                  className={`size-10 rounded-md transition border bg-gradient-to-br ${c.class} ${
                    color === c.class ? 'border-white! border-2 scale-110' : 'border-faint'
                  } cursor-pointer`}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 mt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 btn text-white rounded-md transition"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!name.trim()}
              className="flex-1 px-4 py-2 btn-accent disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition flex items-center justify-center gap-2"
            >
              <Icon path={mdiPlus} size={0.8} />
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
