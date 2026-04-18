import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { SubsonicPlaylist, SubsonicSong } from '../../../../../../../types/subsonic'
import { useAudioPlayer } from '@renderer/contexts/audio-player-context'
import { ListX, Play, Shuffle } from 'lucide-react'
import SongRow from '@renderer/components/song-row'
import SongListHeader from '@renderer/components/song-list-header'
import { SongThumbnailGrid } from '@renderer/components/song-thumbnail-grid'
import { usePlaylists } from '@renderer/contexts/playlists-context'

export const Route = createFileRoute('/library/playlists/$playlistId/')({
  component: AlbumPage
})

function AlbumPage() {
  const { playlistId } = Route.useParams()
  const [playlist, setPlaylist] = useState<SubsonicPlaylist>()
  const { playSong, shufflePlay } = useAudioPlayer()
  const { removeSongFromPlaylist } = usePlaylists()
  const [selectedSongs, setSelectedSongs] = useState<string[]>([])

  useEffect(() => {
    async function fetchAlbum() {
      try {
        const albumData = (await window.api.subsonic.getPlaylist(playlistId)) as {
          success: boolean
          data?: SubsonicPlaylist
        }
        if (albumData.success && albumData.data) {
          setPlaylist(albumData.data)
        }
      } catch (err) {
        console.error('Failed to fetch album:', err)
      }
    }
    fetchAlbum()
  }, [playlistId])

  useEffect(() => {
    function handleClickOutside() {
      setSelectedSongs([])
    }
    window.addEventListener('click', handleClickOutside)
    return () => {
      window.removeEventListener('click', handleClickOutside)
    }
  }, [])

  return (
    <div className="flex flex-col px-12 w-full h-[calc(100vh-64px)] gap-2">
      <div className="flex gap-8 items-end mb-6">
        <SongThumbnailGrid
          songs={(playlist || { entry: [] as SubsonicSong[] }).entry as SubsonicSong[]}
        />
        <div>
          <h1 className="text-3xl font-bold">{playlist?.name}</h1>
          <p className="text-sm text-zinc-700 dark:text-zinc-500">{playlist?.songCount} songs</p>
        </div>
        <div className="flex items-center gap-4 ml-auto">
          <button
            className="btn-accent use-theme-text flex items-center gap-2 rounded-full cursor-pointer px-8 py-2"
            onClick={() => {
              playlist && playlist.entry && playSong(playlist.entry, playlist.entry[0].id)
            }}
          >
            <Play className="size-4" />
            Play
          </button>
          <button
            className="btn flex items-center gap-2 rounded-full cursor-pointer px-6 py-2"
            onClick={() => playlist && playlist.entry && shufflePlay(playlist.entry)}
          >
            <Shuffle className="size-4" />
            Shuffle
          </button>
        </div>
      </div>
      <SongListHeader />
      <div className="overflow-y-auto flex flex-col pb-35">
        {playlist &&
          playlist.entry &&
          playlist.entry.map((song, i) => (
            <SongRow
              onSelect={(e) => {
                e.stopPropagation()
                if (e.ctrlKey || e.metaKey) {
                  // Toggle selection
                  setSelectedSongs((prev) =>
                    prev.includes(song.id)
                      ? prev.filter((id) => id !== song.id)
                      : [...prev, song.id]
                  )
                } else {
                  setSelectedSongs([song.id])
                }
              }}
              selected={selectedSongs.includes(song.id)}
              key={song.id}
              song={song}
              i={i}
              playlist={playlist.entry || []}
              actions={[
                {
                  text: 'Remove from Playlist',
                  onClick: () => removeSongFromPlaylist(playlistId, song.id),
                  Icon() {
                    return <ListX className="size-4" />
                  }
                }
              ]}
            />
          ))}
      </div>
    </div>
  )
}
