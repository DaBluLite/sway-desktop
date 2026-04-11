import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { SubsonicAlbum } from '../../../../../../types/subsonic'
import { useAudioPlayer } from '@renderer/contexts/audio-player-context'
import { Play, Shuffle } from 'lucide-react'
import Icon from '@mdi/react'
import { mdiHeart, mdiHeartOutline } from '@mdi/js'
import { useLibrary } from '@renderer/contexts/library-context'
import SongRow from '@renderer/components/song-row'
import SongListHeader from '@renderer/components/song-list-header'

export const Route = createFileRoute('/album/$albumId/')({
  component: AlbumPage
})

function AlbumPage() {
  const { albumId } = Route.useParams()
  const [album, setAlbum] = useState<SubsonicAlbum>()
  const [albumCoverUrl, setAlbumCoverUrl] = useState<string>()
  const { playSong, shufflePlay, currentSong } = useAudioPlayer()
  const { isStarred, star, unstar } = useLibrary()

  useEffect(() => {
    async function fetchAlbum() {
      try {
        const albumData = (await window.api.subsonic.getAlbum(albumId)) as {
          success: boolean
          data?: SubsonicAlbum
        }
        if (albumData.success && albumData.data) {
          setAlbum(albumData.data)
        }

        const coverUrl = await window.api.subsonic.getCoverArtUrl(albumId)
        coverUrl && setAlbumCoverUrl(coverUrl)
      } catch (err) {
        console.error('Failed to fetch album:', err)
      }
    }
    fetchAlbum()
  }, [albumId])

  return (
    <div className="flex flex-col px-12 w-full h-[calc(100vh-64px)] gap-2">
      <div className="flex gap-8 items-end mb-6">
        {albumCoverUrl ? (
          <img
            src={albumCoverUrl}
            alt={`${album?.name} cover`}
            className="w-48 h-48 object-cover rounded"
          />
        ) : (
          <div className="w-48 h-48 bg-zinc-300 rounded flex items-center justify-center">
            <span className="text-zinc-500">No Cover</span>
          </div>
        )}
        <div>
          <h1 className="text-3xl font-bold">{album?.name}</h1>
          <Link
            to={`/artist/$artistId`}
            params={{ artistId: album?.artistId || '' }}
            className="text-lg use-theme-text hover:underline cursor-pointer"
          >
            {album?.artist}
          </Link>
          <p className="text-sm text-zinc-700 dark:text-zinc-500">{album?.songCount} songs</p>
        </div>
        <div className="flex items-center gap-4 ml-auto">
          <button
            className="btn-accent use-theme-text flex items-center gap-2 rounded-full cursor-pointer px-8 py-2"
            onClick={() => {
              album && playSong(album.song, album.song[0].id)
            }}
          >
            <Play className="size-4" />
            Play
          </button>
          <button
            className="btn flex items-center gap-2 rounded-full cursor-pointer px-6 py-2"
            onClick={() => album && shufflePlay(album.song)}
          >
            <Shuffle className="size-4" />
            Shuffle
          </button>
          <button
            className="btn cursor-pointer use-theme-text p-3 rounded-full"
            onClick={(e) => {
              e.stopPropagation()
              if (isStarred(albumId, 'album')) {
                unstar({ albumId })
              } else {
                star({ albumId })
              }
            }}
          >
            <Icon
              path={(() => {
                if (isStarred(albumId, 'album')) return mdiHeart
                else return mdiHeartOutline
              })()}
              className="size-5"
            />
          </button>
        </div>
      </div>
      <SongListHeader fields={{ artwork: false, album: false }} />
      <div className="overflow-y-auto flex flex-col pb-35">
        {album?.song?.map((song, i) => (
          <SongRow
            key={song.id}
            song={song}
            currentSong={currentSong}
            i={i}
            playlist={album.song || []}
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
