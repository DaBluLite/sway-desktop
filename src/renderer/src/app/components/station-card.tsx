import React, { useState } from 'react'
import { Icon } from '@mdi/react'
import {
  mdiSpeaker,
  mdiPlay,
  mdiHeart,
  mdiHeartOutline,
  mdiShareVariant,
  mdiPlaylistPlus,
  mdiRadio,
  mdiRecord,
  mdiChevronRight
} from '@mdi/js'
import { useFavourites } from '../contexts/favourites-context'
import { useModal } from '../contexts/modal-context'
import { Station } from 'radio-browser-api'
import getTags from '../utils/get-tags'

interface StationCardProps {
  station: Station
  onPlay: (station: Station) => void
}

export const StationCard: React.FC<StationCardProps> = ({ station, onPlay }) => {
  const { isFavourite, toggleFavourite } = useFavourites()
  const { openShareModal, openPlaylistModal, openSimilarStationsModal } = useModal()
  const [iconHasError, setIconHasError] = useState(false)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
  } | null>(null)
  const [recordSubmenu, setRecordSubmenu] = useState<{
    x: number
    y: number
  } | null>(null)
  const [customRecordModal, setCustomRecordModal] = useState(false)

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>): void => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const handleCloseContextMenu = (): void => {
    setContextMenu(null)
    setRecordSubmenu(null)
  }

  const handleToggleFavourite = (): void => {
    toggleFavourite(station)
    handleCloseContextMenu()
  }

  const handleShare = (): void => {
    openShareModal(station)
    handleCloseContextMenu()
  }

  const handleAddToPlaylist = (): void => {
    openPlaylistModal(station)
    handleCloseContextMenu()
  }

  const handleFindSimilar = (): void => {
    openSimilarStationsModal(station)
    handleCloseContextMenu()
  }

  const handleShowRecordSubmenu = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setRecordSubmenu({
      x: rect.right + 5,
      y: rect.top
    })
  }

  const handleStartRecording = async (durationMs?: number): Promise<void> => {
    try {
      const result = await window.api.recorder.startRecording(station, durationMs)

      if (result.success) {
        const durationText = durationMs
          ? `for ${Math.round(durationMs / (1000 * 60 * 60))} hour(s)`
          : 'until stopped manually'

        // You could show a toast notification here instead of alert
        console.log(`Recording started for "${station.name}" ${durationText}`)
      } else {
        alert(`Failed to start recording: ${result.error}`)
      }
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Failed to start recording')
    }

    handleCloseContextMenu()
  }

  const handleCustomRecordingSubmit = (hours: number): void => {
    const durationMs = hours * 60 * 60 * 1000
    handleStartRecording(durationMs)
    setCustomRecordModal(false)
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
              <Icon path={mdiSpeaker} size={3} color="currentColor" />
            </div>
          )}
          <div className="station-card-play-overlay">
            <div className="station-card-play-button">
              <Icon path={mdiPlay} size={1.5} color="currentColor" />
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
          <button className="context-menu-item" onClick={handleAddToPlaylist}>
            <Icon path={mdiPlaylistPlus} size={0.7} color="currentColor" />
            <span>Add to playlist</span>
          </button>
          <button className="context-menu-item" onClick={handleFindSimilar}>
            <Icon path={mdiRadio} size={0.7} color="currentColor" />
            <span>Find similar stations</span>
          </button>
          <button
            className="context-menu-item context-menu-item-with-submenu"
            onClick={handleShowRecordSubmenu}
            onMouseEnter={handleShowRecordSubmenu}
          >
            <Icon path={mdiRecord} size={0.7} color="currentColor" />
            <span>Record...</span>
            <Icon path={mdiChevronRight} size={0.6} color="currentColor" />
          </button>
          <button className="context-menu-item" onClick={handleShare}>
            <Icon path={mdiShareVariant} size={0.7} color="currentColor" />
            <span>Share station</span>
          </button>
        </div>
      )}

      {/* Record Submenu */}
      {recordSubmenu && (
        <div
          className="context-menu"
          style={{
            position: 'fixed',
            top: recordSubmenu.y,
            left: recordSubmenu.x,
            zIndex: 1001
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="context-menu-item"
            onClick={() => handleStartRecording(1 * 60 * 60 * 1000)}
          >
            <Icon path={mdiRecord} size={0.7} color="currentColor" />
            <span>For 1 hour</span>
          </button>
          <button
            className="context-menu-item"
            onClick={() => handleStartRecording(2 * 60 * 60 * 1000)}
          >
            <Icon path={mdiRecord} size={0.7} color="currentColor" />
            <span>For 2 hours</span>
          </button>
          <button
            className="context-menu-item"
            onClick={() => handleStartRecording(3 * 60 * 60 * 1000)}
          >
            <Icon path={mdiRecord} size={0.7} color="currentColor" />
            <span>For 3 hours</span>
          </button>
          <button
            className="context-menu-item"
            onClick={() => handleStartRecording()}
          >
            <Icon path={mdiRecord} size={0.7} color="currentColor" />
            <span>Until I stop it</span>
          </button>
          <button
            className="context-menu-item"
            onClick={() => {
              setCustomRecordModal(true)
              handleCloseContextMenu()
            }}
          >
            <Icon path={mdiRecord} size={0.7} color="currentColor" />
            <span>For...</span>
          </button>
        </div>
      )}

      {/* Custom Recording Modal */}
      {customRecordModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setCustomRecordModal(false)}
        >
          <div
            className="bg-zinc-800 rounded-lg p-6 w-80 max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-medium text-white mb-4">Custom Recording Duration</h3>
            <p className="text-zinc-400 text-sm mb-4">
              Record "{station.name}" for a custom duration
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                const hours = parseFloat(formData.get('hours') as string)

                if (isNaN(hours) || hours <= 0) {
                  alert('Please enter a valid number of hours')
                  return
                }

                if (hours > 24) {
                  alert('Maximum recording duration is 24 hours')
                  return
                }

                handleCustomRecordingSubmit(hours)
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="hours" className="block text-sm font-medium text-zinc-300 mb-2">
                  Duration (hours)
                </label>
                <input
                  type="number"
                  id="hours"
                  name="hours"
                  step="0.5"
                  min="0.1"
                  max="24"
                  defaultValue="1"
                  className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Enter hours (e.g., 1.5 for 1 hour 30 minutes)
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  Start Recording
                </button>
                <button
                  type="button"
                  onClick={() => setCustomRecordModal(false)}
                  className="flex-1 bg-zinc-600 hover:bg-zinc-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
