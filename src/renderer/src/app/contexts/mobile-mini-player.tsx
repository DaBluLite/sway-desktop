import { useEffect, useState, useRef } from 'react'
import { useAudioPlayer } from '@renderer/contexts/audio-player-context'
import { Icon } from '@mdi/react'
import {
  mdiPlay,
  mdiStop,
  mdiVolumeHigh,
  mdiVolumeMedium,
  mdiVolumeLow,
  mdiVolumeOff,
  mdiLoading,
  mdiSpeaker,
  mdiHeart,
  mdiHeartOutline,
  mdiPause,
  mdiCastAudio
} from '@mdi/js'
import { useFavourites } from '@renderer/contexts/favourites-context'
import { useMediaPlayerScreen } from '@renderer/contexts/media-player-screen-context'
import getTags from '@renderer/utils/get-tags'
import { useCastContext } from '@renderer/contexts/cast-context'

export const MobileMiniPlayer: React.FC = () => {
  const {
    isPlaying,
    currentStation,
    volume,
    isMuted,
    isLoading,
    error,
    play,
    pause,
    stop,
    toggleMute
  } = useAudioPlayer()
  const { isFavourite, toggleFavourite } = useFavourites()
  const [currentSong, setCurrentSong] = useState<string | null>(null)
  const [isFetchingSong, setIsFetchingSong] = useState(false)
  const { open } = useMediaPlayerScreen()
  const { castAvailable, castConnected, chromecast } = useCastContext()
  const abortControllerRef = useRef<AbortController | null>(null)

  // Fetch current song metadata
  useEffect(() => {
    if (!isPlaying || !currentStation?.url) {
      setCurrentSong(null)
      return
    }

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const fetchSongMetadata = async (signal: AbortSignal) => {
      setIsFetchingSong(true)
      try {
        const response = await fetch(
          `/api/radio/get-song?url=${encodeURIComponent(currentStation.urlResolved || currentStation.url)}`,
          { signal }
        )
        const data = await response.json()

        if (!data.error && data.StreamTitle) {
          setCurrentSong(data.StreamTitle)
        } else {
          setCurrentSong(null)
          // If the station doesn't support metadata, we can reduce polling frequency
          if (data.error === 'No metadata available') {
            console.log(`Station ${currentStation.name} does not support song metadata`)
          }
        }
      } catch (err) {
        // Only log if it's not an abort error
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Failed to fetch song metadata:', err)
          setCurrentSong(null)
        }
      } finally {
        setIsFetchingSong(false)
      }
    }

    // Create new abort controller for this fetch cycle
    abortControllerRef.current = new AbortController()

    // Fetch immediately
    fetchSongMetadata(abortControllerRef.current.signal)

    // Fetch every 10 seconds to update current song
    const interval = setInterval(() => {
      abortControllerRef.current = new AbortController()
      fetchSongMetadata(abortControllerRef.current.signal)
    }, 10000)

    return () => {
      clearInterval(interval)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [isPlaying, currentStation?.url, currentStation?.urlResolved])

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return mdiVolumeOff
    if (volume < 0.3) return mdiVolumeLow
    if (volume < 0.7) return mdiVolumeMedium
    return mdiVolumeHigh
  }

  return (
    <>
      <div className={`flex flex-col justify-center items-center gap-1 p-2 w-full`}>
        <div className="audio-player-info">
          {currentStation && currentStation.favicon ? (
            <img
              onClick={open}
              src={currentStation.favicon}
              alt={currentStation.name}
              className="audio-player-logo"
            />
          ) : (
            <div onClick={open}>
              <Icon path={mdiSpeaker} size={2} color="currentColor" className="audio-player-logo" />
            </div>
          )}
          <div className="audio-player-details">
            {currentSong ? (
              <>
                <div className="audio-player-station">
                  {isFetchingSong && (
                    <Icon path={mdiLoading} size={0.5} spin className="inline mr-1" />
                  )}
                  {currentSong ? (
                    <>{currentSong}</>
                  ) : currentStation ? (
                    currentStation.name
                  ) : (
                    'Nothing Playing'
                  )}
                </div>
                {currentSong && currentStation && (
                  <div className="audio-player-song">{currentStation.name}</div>
                )}
              </>
            ) : (
              <>
                <div className="audio-player-station">
                  {currentStation ? currentStation.name : 'Nothing Playing'}
                </div>
                {getTags(currentStation ? currentStation.tags : []).length > 0 && (
                  <div className="audio-player-genre">
                    {getTags(currentStation ? currentStation.tags : [])
                      .map((tag) => tag.charAt(0).toUpperCase() + tag.slice(1))
                      .join(', ')}
                  </div>
                )}
              </>
            )}
            {error && <div className="audio-player-error">{error}</div>}
          </div>
        </div>

        <div className="audio-player-controls">
          <button
            onClick={() => currentStation && toggleFavourite(currentStation)}
            disabled={!currentStation}
            className={
              'audio-player-btn' +
              (currentStation && isFavourite(currentStation.url) ? ' text-red-500!' : '')
            }
            aria-label={
              currentStation && isFavourite(currentStation.url)
                ? 'Remove from favourites'
                : 'Add to favourites'
            }
          >
            <Icon
              path={currentStation && isFavourite(currentStation.url) ? mdiHeart : mdiHeartOutline}
              size={1}
            />
          </button>
          <button
            disabled={!currentStation}
            onClick={() => stop()}
            className="audio-player-btn"
            aria-label={'Stop'}
          >
            <Icon path={mdiStop} size={1} />
          </button>
          <button
            onClick={isPlaying ? pause : () => currentStation && play(currentStation)}
            disabled={isLoading || !currentStation}
            className="audio-player-btn audio-player-btn_playpause"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isLoading ? (
              <Icon path={mdiLoading} size={1} spin />
            ) : (
              <Icon path={isPlaying ? mdiPause : mdiPlay} size={1} />
            )}
          </button>
          <button
            onClick={toggleMute}
            className="audio-player-btn"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            <Icon path={getVolumeIcon()} size={1} />
          </button>
          <button
            disabled={!castAvailable || !currentStation}
            className="audio-player-btn disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={async () => {
              if (castAvailable && currentStation) {
                try {
                  await chromecast.cast(currentStation.urlResolved || currentStation.url, {})
                } catch (error) {
                  console.log(error)
                }
              }
            }}
          >
            <Icon path={mdiCastAudio} size={1} color={castConnected ? 'red' : 'white'} />
          </button>
        </div>
      </div>
    </>
  )
}
