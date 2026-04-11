import React, { useState } from 'react'
import { Icon } from '@mdi/react'
import { mdiHeart, mdiHeartOutline, mdiShareVariant, mdiRadio } from '@mdi/js'
import { useFavourites } from '../contexts/favourites-context'
import { useModal } from '../contexts/modal-context'
import { Station } from 'radio-browser-api'
import getTags from '../utils/get-tags'
import { Play, Radio } from 'lucide-react'

interface StationCardProps {
  station: Station
  onPlay: (station: Station) => void
}

export const StationCard: React.FC<StationCardProps> = ({ station, onPlay }) => {
  const { isFavourite, toggleFavourite } = useFavourites()
  const { openShareModal, openSimilarStationsModal } = useModal()
  const [iconHasError, setIconHasError] = useState(false)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
  } | null>(null)

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>): void => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const handleCloseContextMenu = (): void => {
    setContextMenu(null)
  }

  const handleToggleFavourite = (): void => {
    toggleFavourite(station)
    handleCloseContextMenu()
  }

  const handleShare = (): void => {
    openShareModal(station)
    handleCloseContextMenu()
  }

  const handleFindSimilar = (): void => {
    openSimilarStationsModal(station)
    handleCloseContextMenu()
  }

  React.useEffect(() => {
    if (!contextMenu) return

    document.addEventListener('click', handleCloseContextMenu)
    return () => document.removeEventListener('click', handleCloseContextMenu)
  }, [contextMenu])

  return (
    <>
      <div
        className="station-card"
        onClick={() => onPlay(station)}
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

      {contextMenu && (
        <div
          className="context-menu"
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 1000
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="context-menu-item" onClick={handleToggleFavourite}>
            <Icon
              path={isFavourite(station.url) ? mdiHeart : mdiHeartOutline}
              size={0.7}
              color={isFavourite(station.url) ? 'red' : 'currentColor'}
            />
            <span>{isFavourite(station.url) ? 'Remove from favourites' : 'Add to favourites'}</span>
          </button>
          <button className="context-menu-item" onClick={handleFindSimilar}>
            <Icon path={mdiRadio} size={0.7} color="currentColor" />
            <span>Find similar stations</span>
          </button>
          <button className="context-menu-item" onClick={handleShare}>
            <Icon path={mdiShareVariant} size={0.7} color="currentColor" />
            <span>Share station</span>
          </button>
        </div>
      )}
    </>
  )
}
