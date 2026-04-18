import { useEffect, useState } from 'react'
import { SubsonicSong } from '../../../../types/subsonic'
import { Music } from 'lucide-react'

interface SongThumbnailGridProps {
  songs: SubsonicSong[]
  className?: string
}

export const SongThumbnailGrid: React.FC<SongThumbnailGridProps> = ({
  songs,
  className
}: SongThumbnailGridProps) => {
  const [coverUrls, setCoverUrls] = useState<Map<string, string | null>>(new Map())

  // Limit to 4 songs and fetch cover art URLs
  useEffect(() => {
    const limitedSongs = songs.slice(0, 4)
    const urls = new Map<string, string | null>()

    const fetchAllCovers = async () => {
      for (const song of limitedSongs) {
        try {
          const url = await window.api.subsonic.getCoverArtUrl(song.id)
          urls.set(song.id, url)
        } catch {
          urls.set(song.id, null)
        }
      }
      setCoverUrls(urls)
    }

    if (limitedSongs.length > 0) {
      fetchAllCovers()
    }
  }, [songs])

  const displaySongs = songs.slice(0, 4)

  return (
    <div className={`thumbnail-grid ${className || ''}`}>
      {displaySongs.map((song) => (
        <div key={song.id} className="thumbnail-grid-item">
          {coverUrls.get(song.id) ? (
            <img
              src={coverUrls.get(song.id)!}
              alt={song.title}
              className="thumbnail-grid-image"
              loading="lazy"
            />
          ) : (
            <div className="thumbnail-grid-fallback">
              <Music className="size-4 opacity-40" />
            </div>
          )}
        </div>
      ))}
      {/* Fill remaining slots with empty placeholders */}
      {displaySongs.length < 4 &&
        Array.from({ length: 4 - displaySongs.length }).map((_, idx) => (
          <div key={`empty-${idx}`} className="thumbnail-grid-item">
            <div className="thumbnail-grid-fallback">
              <Music className="size-4 opacity-20" />
            </div>
          </div>
        ))}
    </div>
  )
}
