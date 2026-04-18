import { useState } from 'react'
import { Icon } from '@mdi/react'
import { mdiHeart, mdiHeartOutline } from '@mdi/js'
import { useFavourites } from '../contexts/favourites-context'
import { useModal } from '../contexts/modal-context'
import { Station } from 'radio-browser-api'
import getTags from '../utils/get-tags'
import { Heart, ListCheck, Play, Radio, Share2 } from 'lucide-react'
import { useAudioPlayer } from '../contexts/audio-player-context'
import { useContextMenu } from '../contexts/context-menu-context'

interface StationCardProps {
  station: Station
}

export const StationCard: React.FC<StationCardProps> = ({ station }: StationCardProps) => {
  const { isFavourite, toggleFavourite } = useFavourites()
  const { openShareModal, openSimilarStationsModal, openCurationModal } = useModal()
  const { play } = useAudioPlayer()
  const { openContextMenu } = useContextMenu()
  const [iconHasError, setIconHasError] = useState(false)

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>): void => {
    e.preventDefault()
    openContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          text: isFavourite(station.url) ? 'Remove from favourites' : 'Add to favourites',
          onClick: () => toggleFavourite(station),
          Icon() {
            return (
              <Heart
                className={`size-4 ${isFavourite(station.url) ? 'text-red-500 fill-red-500' : ''}`}
              />
            )
          }
        },
        {
          text: 'Find similar Stations',
          onClick: () => openSimilarStationsModal(station),
          Icon() {
            return <Radio className="size-4" />
          }
        },
        {
          text: 'Add to Curation',
          onClick: () => openCurationModal(station),
          Icon() {
            return <ListCheck className="size-4" />
          }
        },
        {
          text: 'Share Station',
          onClick: () => openShareModal(station),
          Icon() {
            return <Share2 className="size-4" />
          }
        }
      ],
      onClose: () => {}
    })
  }

  return (
    <>
      <div
        className="station-card"
        onClick={() => play(station)}
        role="button"
        onContextMenu={handleContextMenu}
      >
        <div className="station-card-image-container">
          {station.favicon && station.favicon.startsWith('https') && !iconHasError ? (
            <img
              src={station.favicon}
              alt={station.name}
              className="station-card-image"
              onError={() => {
                setIconHasError(true)
              }}
            />
          ) : (
            <div className="station-card-fallback">
              <Radio className="size-5" color="currentColor" />
            </div>
          )}
          <div className="station-card-play-overlay">
            <div className="station-card-play-button">
              <Play className="size-5" color="currentColor" />
            </div>
            <div className="flex items-end gap-1">
              <button
                className="btn rounded-full p-2 cursor-pointer backdrop-blur-normal"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleFavourite(station)
                }}
              >
                <Icon
                  className="size-4"
                  path={isFavourite(station.url) ? mdiHeart : mdiHeartOutline}
                />
              </button>
            </div>
          </div>
        </div>
        <div className="station-card-info">
          <h3 className="station-card-title opacity-0">{station.name}</h3>
          {getTags(station.tags).length > 0 && (
            <p className="station-card-tags opacity-0!">
              {getTags(station.tags)
                .map((tag) => tag.trim().charAt(0).toUpperCase() + tag.trim().slice(1))
                .join(' • ')}
            </p>
          )}
          <div className="station-card-info-absolute">
            <h3 className="station-card-title">{station.name}</h3>
            {getTags(station.tags).length > 0 && (
              <p className="station-card-tags">
                {getTags(station.tags)
                  .map((tag) => tag.trim().charAt(0).toUpperCase() + tag.trim().slice(1))
                  .join(' • ')}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
