import { useEffect, useState } from 'react'
import { Music } from 'lucide-react'
import { Station } from 'radio-browser-api'

interface StationThumbnailGridProps {
  stations: Station[]
  className?: string
}

export const StationThumbnailGrid: React.FC<StationThumbnailGridProps> = ({
  stations,
  className
}: StationThumbnailGridProps) => {
  const [coverUrls, setCoverUrls] = useState<Map<string, string | null>>(new Map())

  // Limit to 4 stations and fetch cover art URLs
  useEffect(() => {
    const limitedStations = stations.slice(0, 4)
    const urls = new Map<string, string | null>()

    const fetchAllCovers = async () => {
      for (const station of limitedStations) {
        urls.set(station.id, station.favicon)
      }
      setCoverUrls(urls)
    }

    if (limitedStations.length > 0) {
      fetchAllCovers()
    }
  }, [stations])

  const displayStations = stations.slice(0, 4)

  return (
    <div className={`thumbnail-grid ${className || ''}`}>
      {displayStations.map((station) => (
        <div key={station.id} className="thumbnail-grid-item">
          {coverUrls.get(station.id) ? (
            <img
              src={coverUrls.get(station.id)!}
              alt={station.name}
              onError={() => {
                setCoverUrls({ ...coverUrls, [station.id]: null })
              }}
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
      {displayStations.length < 4 &&
        Array.from({ length: 4 - displayStations.length }).map((_, idx) => (
          <div key={`empty-${idx}`} className="thumbnail-grid-item">
            <div className="thumbnail-grid-fallback">
              <Music className="size-4 opacity-20" />
            </div>
          </div>
        ))}
    </div>
  )
}
