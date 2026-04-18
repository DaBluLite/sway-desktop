import { useState } from 'react'
import { Icon } from '@mdi/react'
import { mdiClose, mdiPlus } from '@mdi/js'
import { CreatePlaylistModalProps } from '../types/modal'
import { usePlaylists } from '@renderer/contexts/playlists-context'

export const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({
  onClose
}: CreatePlaylistModalProps) => {
  const { createPlaylist } = usePlaylists()

  const [name, setName] = useState('')

  const handleCreate = () => {
    if (!name.trim()) return

    createPlaylist(name.trim())

    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal max-w-md!" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-white">Create Playlist</h2>
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
              placeholder="Playlist name"
              className="use-transition w-full px-3 py-2 bg-second-layer-thin border border-faint rounded-md text-white placeholder-zinc-500 focus:outline-none focus:border-subtle focus:bg-second-layer-thin-active"
              autoFocus
            />
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
