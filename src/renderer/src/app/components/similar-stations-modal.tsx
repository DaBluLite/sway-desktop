import { useState, useEffect, useCallback } from 'react'
import { Icon } from '@mdi/react'
import {
  mdiClose,
  mdiRadio,
  mdiRefresh,
  mdiPlay,
  mdiHeart,
  mdiHeartOutline,
  mdiPlaylistPlus,
  mdiLoading,
  mdiAlertCircle,
  mdiMapMarker,
  mdiTagMultiple
} from '@mdi/js'
import { Station } from 'radio-browser-api'
import { useFavourites } from '../contexts/favourites-context'
import { useAudioPlayer } from '../contexts/audio-player-context'
import {
  buildSimilarStationsSearchParams,
  rankSimilarStations,
  getSimilarityReasons,
  getPrimaryGenre
} from '../utils/similar-stations'
import { AddToPlaylistModal } from './add-to-playlist-modal'

interface SimilarStationsModalProps {
  station: Station
  onClose: () => void
}

export const SimilarStationsModal: React.FC<SimilarStationsModalProps> = ({
  station,
  onClose
}: SimilarStationsModalProps) => {
  const [similarStations, setSimilarStations] = useState<Station[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [playlistModalStation, setPlaylistModalStation] = useState<Station | null>(null)

  const { isFavourite, toggleFavourite } = useFavourites()
  const { play, currentStation, isPlaying } = useAudioPlayer()

  const fetchSimilarStations = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Build search params based on the station's characteristics
      const params = buildSimilarStationsSearchParams(station, {
        maxResults: 15,
        minTagOverlap: 1,
        includeCountryMatch: true
      })

      // First, try searching by primary tag with country
      let response = await fetch(`https://sway.dablulite.dev/api/radio/search?${params.toString()}`)
      let data: Station[] = await response.json()

      // If not enough results, try without country filter
      if (data.length < 5 && station.countryCode) {
        params.delete('countrycode')
        response = await fetch(`https://sway.dablulite.dev/api/radio/search?${params.toString()}`)
        const moreData: Station[] = await response.json()
        data = [...data, ...moreData]
      }

      // If still not enough and we have multiple tags, try secondary tag
      let tags: string[] = []
      if (Array.isArray(station.tags)) {
        tags = station.tags
      } else if (typeof station.tags === 'string') {
        tags = (station.tags as string).split(',').map((t: string) => t.trim())
      }
      if (data.length < 5 && tags.length > 1) {
        params.set('tag', tags[1])
        response = await fetch(`https://sway.dablulite.dev/api/radio/search?${params.toString()}`)
        const tagData: Station[] = await response.json()
        data = [...data, ...tagData]
      }

      // Rank and deduplicate the results
      const rankedStations = rankSimilarStations(station, data, {
        maxResults: 12,
        minTagOverlap: 0 // Allow looser matching for the ranking phase
      })

      setSimilarStations(rankedStations)

      if (rankedStations.length === 0) {
        setError('No similar stations found. Try a station with more tags.')
      }
    } catch (err) {
      console.error('Failed to fetch similar stations:', err)
      setError('Failed to load similar stations. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [station])

  useEffect(() => {
    fetchSimilarStations()
  }, [fetchSimilarStations])

  const handlePlay = (stationToPlay: Station) => {
    play(stationToPlay)
  }

  const isCurrentlyPlaying = (s: Station) => {
    return isPlaying && currentStation?.url === s.url
  }

  const primaryGenre = getPrimaryGenre(station)

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal max-w-2xl! max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="modal-header">
            <div className="flex items-center gap-3 min-w-0">
              <Icon path={mdiRadio} size={1.2} className="text-white shrink-0" />
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-white truncate">
                  Similar to {station.name}
                </h2>
                {primaryGenre && (
                  <p className="text-sm text-zinc-400">
                    Finding stations like this {primaryGenre.toLowerCase()} station
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={fetchSimilarStations}
                disabled={isLoading}
                className="p-2 hover:bg-green-400/20 rounded-full transition"
                aria-label="Refresh"
                title="Refresh results"
              >
                <Icon
                  path={isLoading ? mdiLoading : mdiRefresh}
                  size={1}
                  className={`text-white ${isLoading ? 'animate-spin' : ''}`}
                />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-green-400/20 rounded-full transition"
                aria-label="Close"
              >
                <Icon path={mdiClose} size={1} className="text-white" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Icon path={mdiLoading} size={2} className="text-white animate-spin" />
                <p className="text-zinc-400">Finding similar stations...</p>
              </div>
            )}

            {error && !isLoading && (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Icon path={mdiAlertCircle} size={2} className="text-yellow-500" />
                <p className="text-zinc-400 text-center">{error}</p>
                <button
                  onClick={fetchSimilarStations}
                  className="px-4 py-2 btn text-white rounded-md use-transition"
                >
                  Try Again
                </button>
              </div>
            )}

            {!isLoading && !error && similarStations.length > 0 && (
              <div className="flex flex-col gap-2">
                {similarStations.map((similarStation) => {
                  const reasons = getSimilarityReasons(station, similarStation)
                  const playing = isCurrentlyPlaying(similarStation)

                  return (
                    <div
                      key={similarStation.id || similarStation.url}
                      className={`flex items-center gap-3 p-2 rounded-md use-transition cursor-pointer group ${
                        playing ? 'raised-interface-lg' : 'raised-interface'
                      }`}
                      onClick={() => handlePlay(similarStation)}
                    >
                      {/* Station Image */}
                      <div className="w-12 h-12 rounded-sm raised-interface flex items-center justify-center shrink-0 overflow-hidden">
                        {similarStation.favicon && similarStation.favicon.startsWith('http') ? (
                          <img
                            src={similarStation.favicon}
                            alt={similarStation.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                            }}
                          />
                        ) : (
                          <Icon path={mdiRadio} size={1.2} className="text-white" />
                        )}
                      </div>

                      {/* Station Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-medium truncate">{similarStation.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                          {reasons.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Icon path={mdiTagMultiple} size={0.5} />
                              {reasons.join(' • ')}
                            </span>
                          )}
                          {similarStation.country && reasons.length === 0 && (
                            <span className="flex items-center gap-1">
                              <Icon path={mdiMapMarker} size={0.5} />
                              {similarStation.country}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setPlaylistModalStation(similarStation)
                          }}
                          className="p-2 invis-btn rounded-full use-transition"
                          aria-label="Add to playlist"
                          title="Add to playlist"
                        >
                          <Icon path={mdiPlaylistPlus} size={0.9} className="text-white" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFavourite(similarStation)
                          }}
                          className="p-2 invis-btn rounded-full use-transition"
                          aria-label={
                            isFavourite(similarStation.url)
                              ? 'Remove from favourites'
                              : 'Add to favourites'
                          }
                          title={
                            isFavourite(similarStation.url)
                              ? 'Remove from favourites'
                              : 'Add to favourites'
                          }
                        >
                          <Icon
                            path={isFavourite(similarStation.url) ? mdiHeart : mdiHeartOutline}
                            size={0.9}
                            className={
                              isFavourite(similarStation.url) ? 'text-red-500' : 'text-white'
                            }
                          />
                        </button>
                      </div>

                      {/* Play indicator */}
                      <div className="shrink-0">
                        {playing ? (
                          <div className="flex items-center gap-0.5">
                            <span className="w-1 h-4 bg-white rounded-full animate-pulse" />
                            <span
                              className="w-1 h-6 bg-white rounded-full animate-pulse"
                              style={{ animationDelay: '0.2s' }}
                            />
                            <span
                              className="w-1 h-3 bg-white rounded-full animate-pulse"
                              style={{ animationDelay: '0.4s' }}
                            />
                          </div>
                        ) : (
                          <Icon
                            path={mdiPlay}
                            size={1}
                            className="text-white md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {!isLoading && similarStations.length > 0 && (
            <div className="p-4 border-t border-subtle shrink-0">
              <p className="text-center text-sm text-zinc-500">
                Found {similarStations.length} similar station
                {similarStations.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add to Playlist Modal */}
      {playlistModalStation && (
        <AddToPlaylistModal
          station={playlistModalStation}
          onClose={() => setPlaylistModalStation(null)}
        />
      )}
    </>
  )
}
