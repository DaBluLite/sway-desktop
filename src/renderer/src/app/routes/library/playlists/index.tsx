import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { usePlaylists, DEFAULT_COLORS, DEFAULT_ICONS } from '@renderer/contexts/playlists-context'
import { useAudioPlayer } from '@renderer/contexts/audio-player-context'
import { StationItem } from '@renderer/components/station-item'
import { Icon } from '@mdi/react'
import {
  mdiPlaylistMusic,
  mdiPlus,
  mdiPencil,
  mdiDelete,
  mdiPlay,
  mdiDotsVertical,
  mdiContentDuplicate,
  mdiChevronLeft
} from '@mdi/js'
import { Playlist } from '@renderer/contexts/playlists-context'

export const Route = createFileRoute('/library/playlists/')({
  component: PlaylistsPage,
  validateSearch: (search) => {
    const id = search['id']
    return id as string | undefined
  }
})

function PlaylistsPage() {
  const router = useRouter()
  const searchParams = Route.useSearch()
  const {
    playlists,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    removeStationFromPlaylist,
    duplicatePlaylist
  } = usePlaylists()
  const { play } = useAudioPlayer()

  // Compute initial selected playlist from URL
  const initialSelectedPlaylist = useMemo(() => {
    const playlistId = searchParams
    if (playlistId && playlists.length > 0) {
      return playlists.find((p) => p.id === playlistId) || null
    }
    return null
  }, [searchParams, playlists])

  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(initialSelectedPlaylist)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('')
  const [selectedIcon, setSelectedIcon] = useState(DEFAULT_ICONS[0])
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLORS[0])
  const [showMenu, setShowMenu] = useState<string | null>(null)

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) return

    createPlaylist(newPlaylistName.trim(), {
      description: newPlaylistDescription.trim() || undefined,
      icon: selectedIcon,
      color: selectedColor
    })

    resetForm()
  }

  const handleUpdatePlaylist = () => {
    if (!editingPlaylist || !newPlaylistName.trim()) return

    updatePlaylist(editingPlaylist.id, {
      name: newPlaylistName.trim(),
      description: newPlaylistDescription.trim() || undefined,
      icon: selectedIcon,
      color: selectedColor
    })

    resetForm()
  }

  const handleDeletePlaylist = (id: string) => {
    if (window.confirm('Are you sure you want to delete this playlist?')) {
      deletePlaylist(id)
      if (selectedPlaylist?.id === id) {
        setSelectedPlaylist(null)
      }
      setShowMenu(null)
    }
  }

  const handleDuplicatePlaylist = (id: string) => {
    duplicatePlaylist(id)
    setShowMenu(null)
  }

  const handleEditPlaylist = (playlist: Playlist) => {
    setEditingPlaylist(playlist)
    setNewPlaylistName(playlist.name)
    setNewPlaylistDescription(playlist.description || '')
    setSelectedIcon(playlist.icon || DEFAULT_ICONS[0])
    setSelectedColor(playlist.color || DEFAULT_COLORS[0])
    setShowCreateForm(true)
    setShowMenu(null)
  }

  const handlePlayAll = (playlist: Playlist) => {
    if (playlist.stations.length > 0) {
      play(playlist.stations[0])
    }
  }

  const resetForm = () => {
    setShowCreateForm(false)
    setEditingPlaylist(null)
    setNewPlaylistName('')
    setNewPlaylistDescription('')
    setSelectedIcon(DEFAULT_ICONS[0])
    setSelectedColor(DEFAULT_COLORS[0])
  }

  // Playlist Detail View
  if (selectedPlaylist) {
    const playlist = playlists.find((p) => p.id === selectedPlaylist.id)
    if (!playlist) {
      setSelectedPlaylist(null)
      return null
    }

    return (
      <div className="flex min-h-screen justify-center font-sans w-full">
        <main className="main-page">
          <button
            onClick={() => setSelectedPlaylist(null)}
            className="flex items-center gap-2 text-green-500 hover:text-green-400 mb-4 transition mr-auto"
          >
            <Icon path={mdiChevronLeft} size={1} />
            Back to Playlists
          </button>

          <div className="flex items-center gap-4 mb-6 w-full">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shrink-0"
              style={{ backgroundColor: `${playlist.color}30` }}
            >
              {playlist.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-black dark:text-white truncate">
                {playlist.name}
              </h1>
              {playlist.description && (
                <p className="text-zinc-600 dark:text-zinc-400 mt-1">{playlist.description}</p>
              )}
              <p className="text-zinc-500 dark:text-zinc-500 text-sm mt-1">
                {playlist.stations.length} station
                {playlist.stations.length !== 1 ? 's' : ''}
              </p>
            </div>
            {playlist.stations.length > 0 && (
              <button
                onClick={() => handlePlayAll(playlist)}
                className="flex items-center gap-2 px-4 py-2 btn-accent text-white rounded-md use-transition font-medium shrink-0"
              >
                <Icon path={mdiPlay} size={1} />
                Play All
              </button>
            )}
          </div>

          {playlist.stations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center w-full">
              <Icon
                path={mdiPlaylistMusic}
                size={4}
                className="text-zinc-300 dark:text-zinc-600 mb-4"
              />
              <p className="text-zinc-600 dark:text-zinc-400 text-lg mb-2">
                This playlist is empty
              </p>
              <p className="text-zinc-500 dark:text-zinc-500 text-sm">
                Add stations from the search or browse pages
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 w-full pb-24">
              {playlist.stations.map((station) => (
                <div key={station.url} className="relative group">
                  <StationItem station={station} onPlay={play} />
                  <button
                    onClick={() => removeStationFromPlaylist(playlist.id, station.url)}
                    className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
                    title="Remove from playlist"
                  >
                    <Icon path={mdiDelete} size={0.8} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    )
  }

  // Playlist List View
  return (
    <div className="flex min-h-screen justify-center font-sans w-full">
      <main className="main-page">
        <button
          onClick={() => router.history.back()}
          className="flex items-center gap-2 text-green-500 hover:text-green-400 mb-6 transition mr-auto"
        >
          <Icon path={mdiChevronLeft} size={1} />
          Back to Library
        </button>

        <div className="flex items-center justify-between w-full mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Icon path={mdiPlaylistMusic} size={1.5} className="text-black dark:text-white" />
            <h1 className="text-3xl font-bold text-black dark:text-white">Playlists</h1>
          </div>

          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 btn-accent text-white rounded-md use-transition"
          >
            <Icon path={mdiPlus} size={0.9} />
            New Playlist
          </button>
        </div>

        {/* Create/Edit Form */}
        {showCreateForm && (
          <div className="w-full mb-6 p-4 rounded-lg raised-interface-lg">
            <h3 className="text-lg font-semibold text-black dark:text-white mb-4">
              {editingPlaylist ? 'Edit Playlist' : 'Create New Playlist'}
            </h3>

            <div className="space-y-4">
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Playlist name"
                className="w-full px-4 py-3 text-input text-black dark:text-white placeholder-zinc-400"
                autoFocus
              />

              <input
                type="text"
                value={newPlaylistDescription}
                onChange={(e) => setNewPlaylistDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-full px-4 py-3 text-input text-black dark:text-white placeholder-zinc-400"
              />

              {/* Icon Picker */}
              <div>
                <label className="text-sm text-zinc-600 dark:text-zinc-400 mb-2 block">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_ICONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setSelectedIcon(icon)}
                      className={`w-12 h-12 rounded-md flex items-center justify-center text-2xl use-transition ${
                        selectedIcon === icon ? 'raised-interface-lg' : 'btn'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Picker */}
              <div>
                <label className="text-sm text-zinc-600 dark:text-zinc-400 mb-2 block">Color</label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`w-10 h-10 rounded-full transition ${
                        selectedColor === color
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-green-100 dark:ring-offset-green-900'
                          : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={resetForm}
                  className="flex-1 px-4 py-3 btn text-black dark:text-white rounded-lg use-transition"
                >
                  Cancel
                </button>
                <button
                  onClick={editingPlaylist ? handleUpdatePlaylist : handleCreatePlaylist}
                  disabled={!newPlaylistName.trim()}
                  className="flex-1 px-4 py-3 btn-accent flex items-center justify-center gap-2 rounded-lg use-transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon path={editingPlaylist ? mdiPencil : mdiPlus} size={0.9} />
                  {editingPlaylist ? 'Save Changes' : 'Create Playlist'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Playlists Grid */}
        {playlists.length === 0 && !showCreateForm ? (
          <div className="flex flex-col items-center justify-center py-16 text-center w-full">
            <Icon
              path={mdiPlaylistMusic}
              size={4}
              className="text-zinc-300 dark:text-zinc-600 mb-4"
            />
            <p className="text-zinc-600 dark:text-zinc-400 text-lg mb-2">No playlists yet</p>
            <p className="text-zinc-500 dark:text-zinc-500 text-sm mb-4">
              Create your first playlist to organize your favourite stations
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg transition"
            >
              <Icon path={mdiPlus} size={1} />
              Create Playlist
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full pb-24">
            {playlists.map((playlist) => (
              <div key={playlist.id} className="relative rounded-lg btn use-transition group">
                <button
                  onClick={() => setSelectedPlaylist(playlist)}
                  className="w-full p-3 text-left"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-16 h-16 rounded-md border border-faint shadow-glass flex items-center justify-center text-3xl shrink-0"
                      style={{ backgroundColor: `${playlist.color}24` }}
                    >
                      {playlist.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-black dark:text-white truncate">
                        {playlist.name}
                      </h3>
                      <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                        {playlist.stations.length} station
                        {playlist.stations.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  {playlist.description && (
                    <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-3 line-clamp-2">
                      {playlist.description}
                    </p>
                  )}
                </button>

                {/* Menu Button */}
                <div className="absolute top-2 right-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowMenu(showMenu === playlist.id ? null : playlist.id)
                    }}
                    className="p-2 hover:bg-green-200/50 dark:hover:bg-green-800/50 rounded-full transition opacity-0 group-hover:opacity-100"
                  >
                    <Icon
                      path={mdiDotsVertical}
                      size={0.9}
                      className="text-zinc-600 dark:text-zinc-300"
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {showMenu === playlist.id && (
                    <div className="absolute right-0 top-full mt-1 context-menu overflow-hidden z-10 min-w-40">
                      <button
                        onClick={() => handleEditPlaylist(playlist)}
                        className="context-menu-item"
                      >
                        <Icon path={mdiPencil} size={0.8} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDuplicatePlaylist(playlist.id)}
                        className="context-menu-item"
                      >
                        <Icon path={mdiContentDuplicate} size={0.8} />
                        Duplicate
                      </button>
                      <button
                        onClick={() => handleDeletePlaylist(playlist.id)}
                        className="context-menu-item danger"
                      >
                        <Icon path={mdiDelete} size={0.8} />
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {/* Play Button (shows on hover) */}
                {playlist.stations.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handlePlayAll(playlist)
                    }}
                    className="absolute bottom-4 right-4 w-12 h-12 btn-accent backdrop-blur-normal text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition transform translate-y-2 group-hover:translate-y-0"
                  >
                    <Icon path={mdiPlay} size={1.2} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
