import { useState } from 'react'
import { Icon } from '@mdi/react'
import { mdiClose, mdiPlaylistPlus, mdiPlaylistMusic, mdiCheck, mdiPlus } from '@mdi/js'
import { Station } from 'radio-browser-api'
import { usePlaylists, DEFAULT_COLORS, DEFAULT_ICONS } from '../contexts/playlists-context'

interface AddToPlaylistModalProps {
  station: Station
  onClose: () => void
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  station,
  onClose
}: AddToPlaylistModalProps) => {
  const {
    playlists,
    createPlaylist,
    addStationToPlaylist,
    removeStationFromPlaylist,
    isStationInPlaylist
  } = usePlaylists()

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [selectedIcon, setSelectedIcon] = useState(DEFAULT_ICONS[0])
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLORS[0])

  const handleTogglePlaylist = (playlistId: string) => {
    if (isStationInPlaylist(playlistId, station.url)) {
      removeStationFromPlaylist(playlistId, station.url)
    } else {
      addStationToPlaylist(playlistId, station)
    }
  }

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) return

    const newPlaylist = createPlaylist(newPlaylistName.trim(), {
      icon: selectedIcon,
      color: selectedColor
    })

    // Add the station to the newly created playlist
    addStationToPlaylist(newPlaylist.id, station)

    // Reset form
    setNewPlaylistName('')
    setShowCreateForm(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal max-w-md!" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <Icon path={mdiPlaylistPlus} size={1.2} className="text-white" />
            <h2 className="text-xl font-semibold text-white">Add to Playlist</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 invis-btn rounded-md transition"
            aria-label="Close"
          >
            <Icon path={mdiClose} size={1} className="text-white" />
          </button>
        </div>

        <div className="p-4">
          {/* Station Preview */}
          <div className="flex items-center gap-3 p-2 raised-interface-lg rounded-md mb-4">
            {station.favicon && station.favicon.startsWith('https') ? (
              <img
                src={station.favicon}
                alt={station.name}
                className="w-12 h-12 rounded-sm object-contain raised-interface"
              />
            ) : (
              <div className="w-12 h-12 rounded-sm raised-interface flex items-center justify-center">
                <Icon path={mdiPlaylistMusic} size={1} className="text-white" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-medium truncate">{station.name}</h3>
              {station.country && (
                <p className="text-zinc-400 text-sm truncate">{station.country}</p>
              )}
            </div>
          </div>

          {/* Create New Playlist Section */}
          {showCreateForm ? (
            <div className="mb-4 p-4 raised-interface rounded-md border border-subtle">
              <h3 className="text-white font-medium mb-3">New Playlist</h3>

              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Playlist name"
                className="use-transition w-full px-3 py-2 bg-second-layer-thin dark:bg-second-layer-thin-dark border border-faint rounded-md text-white placeholder-zinc-400 focus:outline-none focus:border-subtle focus:bg-second-layer-thin-active dark:focus:bg-second-layer-thin-active-dark mb-3"
                autoFocus
              />

              {/* Icon Picker */}
              <div className="mb-3">
                <label className="text-sm text-zinc-400 mb-2 block">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_ICONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setSelectedIcon(icon)}
                      className={`w-10 h-10 rounded-sm btn flex items-center justify-center text-xl transition ${
                        selectedIcon === icon
                          ? 'border-subtle bg-second-layer-thin-active dark:bg-second-layer-thin-active-dark'
                          : ''
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Picker */}
              <div className="mb-4">
                <label className="text-sm text-zinc-400 mb-2 block">Color</label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`w-8 h-8 rounded-full transition ${
                        selectedColor === color
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-green-900'
                          : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 px-4 py-2 btn text-white rounded-md transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePlaylist}
                  disabled={!newPlaylistName.trim()}
                  className="flex-1 px-4 py-2 btn-accent disabled:cursor-not-allowed text-white rounded-md transition flex items-center justify-center gap-2"
                >
                  <Icon path={mdiPlus} size={0.8} />
                  Create
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full mb-4 px-4 py-3 btn text-white rounded-md transition flex items-center justify-center gap-2"
            >
              <Icon path={mdiPlus} size={1} />
              Create New Playlist
            </button>
          )}

          {/* Existing Playlists */}
          {playlists.length > 0 ? (
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
              <p className="text-sm text-zinc-400 mb-2">Your Playlists</p>
              {playlists.map((playlist) => {
                const isInPlaylist = isStationInPlaylist(playlist.id, station.url)

                return (
                  <button
                    key={playlist.id}
                    onClick={() => handleTogglePlaylist(playlist.id)}
                    className={`w-full flex items-center gap-3 p-2 rounded-md transition ${
                      isInPlaylist ? 'raised-interface-lg' : 'raised-interface'
                    }`}
                  >
                    <div
                      className="w-10 h-10 use-transition rounded-sm flex items-center border-faint shadow-glass justify-center text-lg shrink-0"
                      style={{
                        backgroundColor: `${playlist.color}${isInPlaylist ? '70' : '40'}`
                      }}
                    >
                      {playlist.icon}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <h4 className="text-white font-medium truncate">{playlist.name}</h4>
                      <p className="text-zinc-400 text-sm">
                        {playlist.stations.length} station
                        {playlist.stations.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition shadow-glass border ${
                        isInPlaylist ? 'raised-interface text-white' : 'text-zinc-400 border-faint'
                      }`}
                    >
                      {isInPlaylist && <Icon path={mdiCheck} size={0.7} />}
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            !showCreateForm && (
              <div className="text-center py-8">
                <Icon path={mdiPlaylistMusic} size={3} className="text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-400">No playlists yet</p>
                <p className="text-zinc-500 text-sm">Create your first playlist above</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
