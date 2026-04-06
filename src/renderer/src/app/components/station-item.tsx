import { Icon } from '@mdi/react'
import {
  mdiSpeaker,
  mdiPlay,
  mdiHeart,
  mdiHeartOutline,
  mdiShareVariant,
  mdiPlaylistPlus,
  mdiRadio
} from '@mdi/js'
import { useFavourites } from '../contexts/favourites-context'
import { useModal } from '../contexts/modal-context'
import { Station } from 'radio-browser-api'
import getTags from '../utils/get-tags'

interface StationCardProps {
  station: Station
  onPlay: (station: Station) => void
}

export const StationItem: React.FC<StationCardProps> = ({ station, onPlay }: StationCardProps) => {
  const { isFavourite, toggleFavourite } = useFavourites()
  const { openShareModal, openPlaylistModal, openSimilarStationsModal } = useModal()

  return (
    <>
      <div className="station-item">
        <div className="station-item-image-container" onClick={() => onPlay(station)}>
          {station.favicon ? (
            <img
              src={station.favicon}
              alt={station.name}
              className="station-card-image"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const parent = target.parentElement
                if (parent) {
                  const icon = document.createElement('div')
                  icon.className = 'station-card-fallback-icon'
                  parent.appendChild(icon)
                }
              }}
            />
          ) : (
            <div className="station-card-fallback">
              <Icon path={mdiSpeaker} size={3} color="currentColor" />
            </div>
          )}
          <div className="station-card-play-overlay">
            <div className="station-card-play-button">
              <Icon path={mdiPlay} size={1.5} color="black" />
            </div>
          </div>
        </div>
        <div className="station-card-info">
          <h3 className="station-card-title">{station.name}</h3>
          {getTags(station.tags).length > 0 && (
            <p className="station-card-tags">
              {getTags(station.tags)
                .map((tag) => tag.trim().charAt(0).toUpperCase() + tag.trim().slice(1))
                .join(' • ')}
            </p>
          )}
          <div className="station-card-actions static! mt-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                openPlaylistModal(station)
              }}
              className="station-card-action-button"
              aria-label="Add to playlist"
              title="Add to playlist"
            >
              <Icon path={mdiPlaylistPlus} size={0.7} color="currentColor" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleFavourite(station)
              }}
              className="station-card-action-button"
              aria-label={isFavourite(station.url) ? 'Remove from favourites' : 'Add to favourites'}
              title={isFavourite(station.url) ? 'Remove from favourites' : 'Add to favourites'}
            >
              <Icon
                path={isFavourite(station.url) ? mdiHeart : mdiHeartOutline}
                size={0.7}
                color={isFavourite(station.url) ? 'red' : 'currentColor'}
              />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                openSimilarStationsModal(station)
              }}
              className="station-card-action-button"
              aria-label="Find similar stations"
              title="Find similar stations"
            >
              <Icon path={mdiRadio} size={0.7} color="currentColor" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                openShareModal(station)
              }}
              className="station-card-action-button"
              aria-label="Share station"
              title="Share station"
            >
              <Icon path={mdiShareVariant} size={0.7} color="currentColor" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
