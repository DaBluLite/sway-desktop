import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { SubsonicPlaylist } from '../../../../../../../types/subsonic'
import { useAudioPlayer } from '@renderer/contexts/audio-player-context'
import { Play, Shuffle } from 'lucide-react'
import { useLibrary } from '@renderer/contexts/library-context'
import SongRow from '@renderer/components/song-row'
import SongListHeader from '@renderer/components/song-list-header'

export const Route = createFileRoute('/library/playlists/$playlistId/')({
  component: AlbumPage
})

function AlbumPage() {
  const { playlistId } = Route.useParams()
  const [playlist, setPlaylist] = useState<SubsonicPlaylist>()
  const { playSong, shufflePlay, currentSong } = useAudioPlayer()
  const { isStarred, star, unstar } = useLibrary()

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

  return (
    <div className="flex flex-col px-12 w-full h-[calc(100vh-64px)] gap-2">
      <div className="flex gap-8 items-end mb-6">
        <div className="w-48 h-48 bg-zinc-300 rounded flex items-center justify-center">
          <span className="text-zinc-500">No Cover</span>
        </div>
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
      <SongListHeader fields={{ artwork: false, album: false }} />
      <div className="overflow-y-auto flex flex-col pb-35">
        {playlist &&
          playlist.entry &&
          playlist.entry.map((song, i) => (
            <SongRow
              key={song.id}
              song={song}
              currentSong={currentSong}
              i={i}
              playlist={playlist.entry || []}
              isStarred={isStarred}
              playSong={playSong}
              star={star}
              unstar={unstar}
              fields={{
                artwork: false,
                album: false
              }}
            />
          ))}
      </div>
    </div>
  )
}
