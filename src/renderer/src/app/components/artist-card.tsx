import { useEffect, useState } from 'react'
import { SubsonicArtist } from '../../../../types/subsonic'
import { useRouter } from '@tanstack/react-router'
import { Disc3 } from 'lucide-react'

interface ArtistCardProps {
  artist: SubsonicArtist
  onPlay?: (artist: SubsonicArtist) => void
}

export const ArtistCard: React.FC<ArtistCardProps> = ({ artist }: ArtistCardProps) => {
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    window.api.subsonic.getCoverArtUrl(artist.id).then((url) => {
      setCoverUrl(url)
    })
  }, [artist])

  const handleClick = () => {
    router.navigate({ to: '/artist/$artistId', params: { artistId: artist.id } })
  }

  return (
    <div className="station-card group cursor-pointer" onClick={handleClick}>
      <div className="station-card-image-container bg-theme-bg rounded-full!">
        {coverUrl ? (
          <img src={coverUrl} alt={artist.name} className="station-card-image" loading="lazy" />
        ) : (
          <div className="station-card-fallback">
            <Disc3 className="opacity-20 size-5" />
          </div>
        )}
      </div>
      <div className="station-card-info">
        <h3 className="station-card-title">{artist.name}</h3>
      </div>
    </div>
  )
}
