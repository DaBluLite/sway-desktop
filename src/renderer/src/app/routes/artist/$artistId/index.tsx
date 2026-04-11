import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { SubsonicAlbum, SubsonicArtist, SubsonicSong } from '../../../../../../types/subsonic'
import { useAudioPlayer } from '@renderer/contexts/audio-player-context'
import { AlbumCarousel } from '@renderer/components/album-carousel'
import Icon from '@mdi/react'
import { mdiHeart, mdiHeartOutline } from '@mdi/js'
import { useLibrary } from '@renderer/contexts/library-context'

export const Route = createFileRoute('/artist/$artistId/')({
  component: ArtistPage
})

type ExtendedAlbum = SubsonicAlbum & { title: string }

function ArtistPage() {
  const { artistId } = Route.useParams()
  const [artist, setArtist] = useState<SubsonicArtist>()
  const [albums, setAlbums] = useState<ExtendedAlbum[]>([])
  const [artistCoverUrl, setArtistCoverUrl] = useState<string>()
  const { playSong } = useAudioPlayer()
  const { isStarred, star, unstar } = useLibrary()

  const handlePlayAlbum = useCallback(
    async (album: ExtendedAlbum) => {
      const result = await window.api.subsonic.getAlbum(album.id)
      if (result.success && result.data) {
        const albumData = result.data as { song: SubsonicSong[] }
        playSong(albumData.song, albumData.song[0].id)
      }
    },
    [playSong]
  )

  const fetchAlbumsForCarousel = useCallback(
    async (offset: number, limit: number) => {
      return albums.slice(offset, offset + limit)
    },
    [albums]
  )

  useEffect(() => {
    async function fetchArtistData() {
      try {
        const albumData = (await window.api.subsonic.getArtist(artistId)) as {
          success: boolean
          data?: SubsonicArtist
        }
        if (albumData.success && albumData.data) {
          setArtist(albumData.data)
          if (albumData.data.album) {
            setAlbums(
              albumData.data.album.map((album) => ({
                ...album,
                title: album.name
              }))
            )
          }
        }

        const coverUrl = await window.api.subsonic.getCoverArtUrl(artistId)
        coverUrl && setArtistCoverUrl(coverUrl)
      } catch (err) {
        console.error('Failed to fetch artist:', err)
      }
    }
    fetchArtistData()
  }, [artistId])

  return (
    <div className="flex flex-col px-12 w-full h-[calc(100vh-64px)] gap-2">
      <div className="flex gap-8 items-end mb-6">
        {artistCoverUrl ? (
          <img
            src={artistCoverUrl}
            alt={`${artist?.name} cover`}
            className="w-48 h-48 object-cover rounded-full"
          />
        ) : (
          <div className="w-48 h-48 bg-zinc-300 rounded flex items-center justify-center">
            <span className="text-zinc-500">No Cover</span>
          </div>
        )}
        <div>
          <h1 className="text-3xl font-bold">{artist?.name}</h1>
        </div>
        <div className="flex items-center gap-4 ml-auto">
          <button
            className="btn cursor-pointer use-theme-text p-3 rounded-full"
            onClick={(e) => {
              e.stopPropagation()
              if (isStarred(artistId, 'artist')) {
                unstar({ artistId })
              } else {
                star({ artistId })
              }
            }}
          >
            <Icon
              path={(() => {
                if (isStarred(artistId, 'artist')) return mdiHeart
                else return mdiHeartOutline
              })()}
              className="size-5"
            />
          </button>
        </div>
      </div>
      <div className="overflow-y-auto flex flex-col pb-35">
        {albums.length > 0 && (
          <AlbumCarousel
            key={`artist-albums-${artistId}`}
            title="Albums"
            onAlbumPlay={handlePlayAlbum}
            fetchAlbums={fetchAlbumsForCarousel}
          />
        )}
      </div>
    </div>
  )
}
