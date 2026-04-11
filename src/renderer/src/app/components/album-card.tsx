import { useEffect, useState } from 'react'
import { SubsonicAlbum } from '../../../../types/subsonic'
import { useRouter } from '@tanstack/react-router'
import { Disc3, Play } from 'lucide-react'
import { useAudioPlayer } from '@renderer/contexts/audio-player-context'
import { useLibrary } from '@renderer/contexts/library-context'
import Icon from '@mdi/react'
import { mdiHeart, mdiHeartOutline } from '@mdi/js'

// Extending SubsonicAlbum to handle both getAlbumList and getAlbum response structures
type ExtendedAlbum = SubsonicAlbum & { title: string }

interface AlbumCardProps {
  album: ExtendedAlbum
  onPlay?: (album: ExtendedAlbum) => void
}

export const AlbumCard: React.FC<AlbumCardProps> = ({ album, onPlay }: AlbumCardProps) => {
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const { playSong } = useAudioPlayer()
  const { star, unstar, isStarred } = useLibrary()
  const router = useRouter()

  useEffect(() => {
    window.api.subsonic.getCoverArtUrl(album.id).then((url) => {
      setCoverUrl(url)
    })
  }, [album])

  const handleClick = () => {
    router.navigate({ to: '/album/$albumId', params: { albumId: album.id } })
  }

  return (
    <div className="station-card group cursor-pointer" onClick={handleClick}>
      <div className="station-card-image-container bg-theme-bg">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={album.name || album.title}
            className="station-card-image"
            loading="lazy"
          />
        ) : (
          <div className="station-card-fallback">
            <Disc3 className="opacity-20 size-5" />
          </div>
        )}
        <div className="station-card-play-overlay">
          <div
            className="station-card-play-button"
            onClick={async (e) => {
              e.stopPropagation()
              onPlay ? onPlay(album) : playSong(album.song, album.song[0].id)
            }}
          >
            <Play className="size-5" color="currentColor" />
          </div>
          <div className="flex items-end gap-1">
            <button
              className="btn rounded-full p-2 cursor-pointer backdrop-blur-normal"
              onClick={(e) => {
                e.stopPropagation()
                if (isStarred(album.id, 'album')) {
                  unstar({ albumId: album.id })
                } else {
                  star({ albumId: album.id })
                }
              }}
            >
              <Icon
                className="size-4"
                path={isStarred(album.id, 'album') ? mdiHeart : mdiHeartOutline}
              />
            </button>
          </div>
        </div>
      </div>
      <div className="station-card-info">
        <h3 className="station-card-title opacity-0">{album.title || album.name}</h3>
        <p className="station-card-tags opacity-0!">
          {album.artists.map(({ name, id }, i) => {
            return (
              <>
                <span
                  key={id}
                  className="hover:underline"
                  onClick={(e) => {
                    e.stopPropagation()
                    router.navigate({ to: '/artist/$artistId', params: { artistId: id } })
                  }}
                >
                  {name}
                </span>
                {i < album.artists.length - 1 && <span className="mr-1">, </span>}
              </>
            )
          })}
        </p>
        <div className="station-card-info-absolute">
          <h3 className="station-card-title">{album.title || album.name}</h3>
          <p className="station-card-tags">
            {album.artists.map(({ name, id }, i) => {
              return (
                <>
                  <span
                    key={id}
                    className="hover:underline"
                    onClick={(e) => {
                      e.stopPropagation()
                      router.navigate({ to: '/artist/$artistId', params: { artistId: id } })
                    }}
                  >
                    {name}
                  </span>

                  {i < album.artists.length - 1 && <span className="mr-1">, </span>}
                </>
              )
            })}
          </p>
        </div>
      </div>
    </div>
  )
}
