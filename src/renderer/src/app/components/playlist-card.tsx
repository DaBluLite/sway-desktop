import { SubsonicPlaylist } from '../../../../types/subsonic'
import { useRouter } from '@tanstack/react-router'
import { Disc3, Play } from 'lucide-react'

interface PlaylistCardProps {
  playlist: SubsonicPlaylist
  onPlay: (playlist: SubsonicPlaylist) => void
}

export const PlaylistCard: React.FC<PlaylistCardProps> = ({
  playlist,
  onPlay
}: PlaylistCardProps) => {
  const router = useRouter()

  const handleClick = () => {
    router.navigate({ to: '/library/playlists/$playlistId', params: { playlistId: playlist.id } })
  }

  return (
    <div className="station-card group cursor-pointer" onClick={handleClick}>
      <div className="station-card-image-container bg-theme-bg">
        <div className="station-card-fallback">
          <Disc3 className="opacity-20 size-5" />
        </div>
        <div className="station-card-play-overlay">
          <div
            className="station-card-play-button"
            onClick={async (e) => {
              e.stopPropagation()
              onPlay(playlist)
            }}
          >
            <Play className="size-5" color="currentColor" />
          </div>
        </div>
      </div>
      <div className="station-card-info">
        <h3 className="station-card-title opacity-0">{playlist.name}</h3>
        <p className="station-card-tags opacity-0!">
          {playlist.songCount} {playlist.songCount === 1 ? 'song' : 'songs'}
        </p>
        <div className="station-card-info-absolute">
          <h3 className="station-card-title">{playlist.name}</h3>
          <p className="station-card-tags">
            {playlist.songCount} {playlist.songCount === 1 ? 'song' : 'songs'}
          </p>
        </div>
      </div>
    </div>
  )
}
