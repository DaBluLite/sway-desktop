import { useEffect, useState } from 'react'
import { Icon } from '@mdi/react'
import { mdiPlaylistPlus, mdiPlaylistMusic, mdiPlus } from '@mdi/js'
import { usePlaylists } from '../contexts/playlists-context'
import { SubsonicPlaylist, SubsonicSong } from '../../../../types/subsonic'
import { Check, X } from 'lucide-react'
import { Link } from '@tanstack/react-router'

interface AddToPlaylistModalProps {
  song: SubsonicSong
  onClose: () => void
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  song,
  onClose
}: AddToPlaylistModalProps) => {
  const { playlists, createPlaylist } = usePlaylists()

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [songArt, setSongArt] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCover() {
      try {
        const url = await window.api.subsonic.getCoverArtUrl(song.id)
        setSongArt(url)
      } catch {
        setSongArt(null)
      }
    }
    fetchCover()
  }, [song.id])

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) return

    createPlaylist(newPlaylistName.trim(), [song.id])

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
            <X className="text-white size-4" />
          </button>
        </div>

        <div className="p-4">
          {/* Station Preview */}
          <div className="flex items-center gap-3 p-2 raised-interface-lg rounded-md mb-4">
            <div className="w-12 h-12 rounded-sm raised-interface flex items-center justify-center">
              <Icon path={mdiPlaylistMusic} size={1} className="text-white" />
              <img
                src={songArt || undefined}
                alt={song.title}
                className="w-full h-full object-cover rounded-sm"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-medium truncate">{song.title}</h3>
              <p className="text-zinc-400 text-sm truncate">
                {song.artists
                  .map((artist) => (
                    <Link
                      key={artist.id}
                      to={`/artist/$artistId`}
                      params={{ artistId: artist.id }}
                      className="hover:underline"
                    >
                      {artist.name}
                    </Link>
                  ))
                  .reduce((prev, curr) => (
                    <>
                      {prev}
                      <span className="mr-1">, </span>
                      {curr}
                    </>
                  ))}
              </p>
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
              {playlists.map((playlist) => (
                <Toggle key={playlist.id} song={song} playlist={playlist} />
              ))}
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

function Toggle({ song, playlist }: { song: SubsonicSong; playlist: SubsonicPlaylist }) {
  const { isSongInPlaylist, removeSongFromPlaylist, addSongToPlaylist } = usePlaylists()
  const [isInPlaylist, setIsInPlaylist] = useState(false)

  const handleTogglePlaylist = async (playlistId: string) => {
    const isSongIn = await isSongInPlaylist(playlistId, song.id)
    if (isSongIn) {
      removeSongFromPlaylist(playlistId, song.id)
    } else {
      addSongToPlaylist(playlistId, song.id)
    }
  }

  useEffect(() => {
    async function check() {
      const isIn = await isSongInPlaylist(playlist.id, song.id)
      setIsInPlaylist(isIn)
    }
    check()
  }, [isSongInPlaylist, playlist.id, song.id])
  return (
    <button
      key={playlist.id}
      onClick={() => handleTogglePlaylist(playlist.id)}
      className={`w-full flex items-center cursor-pointer gap-3 p-2 rounded-md transition ${
        isInPlaylist ? 'raised-interface-lg' : 'raised-interface'
      }`}
    >
      <div className="flex-1 min-w-0 text-left">
        <h4 className="text-white font-medium truncate">{playlist.name}</h4>
        <p className="text-zinc-400 text-sm">
          {playlist.songCount} song
          {playlist.songCount !== 1 ? 's' : ''}
        </p>
      </div>
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center transition shadow-glass border ${
          isInPlaylist ? 'raised-interface text-white' : 'text-zinc-400 border-faint'
        }`}
      >
        {isInPlaylist && <Check className="use-theme-text size-4" />}
      </div>
    </button>
  )
}
