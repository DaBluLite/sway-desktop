import { useEffect, useState, useRef } from 'react'
import { useAudioPlayer } from '../contexts/audio-player-context'
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
  mdiTimerOutline,
  mdiRecord,
  mdiPause,
  mdiArrowExpand
} from '@mdi/js'
import { useFavourites } from '../contexts/favourites-context'
import { useSleepTimer } from '../contexts/sleep-timer-context'
import { useRecordings } from '../contexts/recordings-context'
import { useModal } from '../contexts/modal-context'
import getTags from '../utils/get-tags'
import { useMediaPlayerScreen } from '../contexts/media-player-screen-context'

export const AudioPlayer: React.FC = () => {
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
    setVolume,
    toggleMute
  } = useAudioPlayer()
  const { isFavourite, toggleFavourite } = useFavourites()
  const [currentSong, setCurrentSong] = useState<string | null>(null)
  const [isFetchingSong, setIsFetchingSong] = useState(false)
  const { isActive: sleepTimerActive, formatTimeRemaining } = useSleepTimer()
  const { isRecording } = useRecordings()
  const { openSleepTimerModal, openRecorderModal } = useModal()
  const abortControllerRef = useRef<AbortController | null>(null)
  const { open } = useMediaPlayerScreen()

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
          `https://sway.dablulite.dev/api/radio/get-song?url=${encodeURIComponent(currentStation.urlResolved || currentStation.url)}`,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, currentStation?.url, currentStation?.urlResolved])

  if (!currentStation) {
    return null
  }

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return mdiVolumeOff
    if (volume < 0.3) return mdiVolumeLow
    if (volume < 0.7) return mdiVolumeMedium
    return mdiVolumeHigh
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value))
  }

  return (
    <>
      <div className={`audio-player`}>
        <div className="audio-player-info">
          {currentStation.favicon ? (
            <img
              src={currentStation.favicon}
              alt={currentStation.name}
              className="audio-player-logo"
            />
          ) : (
            <div>
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
                  {currentSong ? <>{currentSong}</> : currentStation.name}
                </div>
                <div className="audio-player-song">{currentStation.name}</div>
              </>
            ) : (
              <>
                <div className="audio-player-station">{currentStation.name}</div>
                {getTags(currentStation.tags).length > 0 && (
                  <div className="audio-player-genre">
                    {getTags(currentStation.tags)
                      .map((tag) => tag.charAt(0).toUpperCase() + tag.slice(1))
                      .join(', ')}
                  </div>
                )}
              </>
            )}
            {error && <div className="audio-player-error">{error}</div>}
          </div>
          <button
            onClick={() => toggleFavourite(currentStation)}
            className="audio-player-btn"
            aria-label={
              isFavourite(currentStation.url) ? 'Remove from favourites' : 'Add to favourites'
            }
          >
            <Icon path={isFavourite(currentStation.url) ? mdiHeart : mdiHeartOutline} size={1} />
          </button>
        </div>

        <div className="audio-player-controls">
          <button
            onClick={() => currentStation && stop()}
            className="audio-player-btn"
            aria-label={'Stop'}
          >
            <Icon path={mdiStop} size={1} />
          </button>
          <button
            onClick={isPlaying ? pause : () => play(currentStation)}
            disabled={isLoading}
            className="audio-player-btn audio-player-btn_playpause"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isLoading ? (
              <Icon path={mdiLoading} size={1} spin />
            ) : (
              <Icon path={isPlaying ? mdiPause : mdiPlay} size={1} />
            )}
          </button>
        </div>
        <div className="audio-player-right">
          <button
            onClick={toggleMute}
            className="audio-player-btn"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            <Icon path={getVolumeIcon()} size={0.8} />
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-24 h-1 bg-green-700/40 rounded-full appearance-none outline-none cursor-pointer origin-center [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-green-400 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 hover:[&::-webkit-slider-thumb]:bg-green-300 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:bg-green-400 [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:rounded-full hover:[&::-moz-range-thumb]:scale-125 hover:[&::-moz-range-thumb]:bg-green-300 [&::-webkit-slider-thumb]:transition-all [&::-moz-range-thumb]:transition-all"
            aria-label="Volume"
          />
          <button
            onClick={() => openRecorderModal()}
            className={`audio-player-btn relative ${isRecording ? 'text-red-400' : ''}`}
            aria-label="Recording"
            title="Recording"
          >
            <Icon path={mdiRecord} size={1} />
          </button>
          <button
            onClick={() => openSleepTimerModal()}
            className={`audio-player-btn relative ${sleepTimerActive ? 'text-green-400' : ''}`}
            aria-label="Sleep timer"
            title={sleepTimerActive ? `Sleep timer: ${formatTimeRemaining()}` : 'Set sleep timer'}
          >
            <Icon path={mdiTimerOutline} size={1} />
            {sleepTimerActive && (
              <span className="absolute -top-1 -right-1 text-[10px] font-bold bg-green-500 text-white rounded-full px-1 min-w-[18px] text-center">
                {formatTimeRemaining().split(':')[0]}
              </span>
            )}
          </button>
          <button
            onClick={open}
            className={`audio-player-btn`}
            aria-label="Open Media Screen"
            title={'Open Media Screen'}
          >
            <Icon path={mdiArrowExpand} size={1} />
          </button>
        </div>
      </div>
    </>
  )
}
