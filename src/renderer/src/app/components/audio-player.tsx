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
  mdiPause,
  mdiArrowExpand,
  mdiSkipPrevious,
  mdiSkipNext,
  mdiShuffle
} from '@mdi/js'
import { useFavourites } from '../contexts/favourites-context'
import { useSleepTimer } from '../contexts/sleep-timer-context'
import { useModal } from '../contexts/modal-context'
import getTags from '../utils/get-tags'
import { useMediaPlayerScreen } from '../contexts/media-player-screen-context'
import { Repeat, Repeat1 } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useLibrary } from '@renderer/contexts/library-context'

export const AudioPlayer: React.FC = () => {
  const {
    isPlaying,
    currentStation,
    currentSong,
    volume,
    isMuted,
    isLoading,
    error,
    currentTime,
    duration,
    isSeekable,
    pause,
    resume,
    stop,
    setVolume,
    toggleMute,
    seek,
    shuffle,
    repeat,
    playNext,
    playPrevious,
    toggleShuffle,
    setRepeat
  } = useAudioPlayer()
  const { isFavourite, toggleFavourite } = useFavourites()
  const { isStarred, star, unstar } = useLibrary()
  const [songArt, setSongArt] = useState<string | null>(null)
  const { isActive: sleepTimerActive, formatTimeRemaining } = useSleepTimer()
  const { openSleepTimerModal } = useModal()
  const [isFetchingSong, setIsFetchingSong] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const { toggle, isOpen } = useMediaPlayerScreen()
  const handlePrevious = () => {
    if (currentTime > 3) {
      seek(0)
    } else {
      playPrevious()
    }
  }

  const toggleRepeat = () => {
    if (repeat === 'off') setRepeat('all')
    else if (repeat === 'all') setRepeat('one')
    else setRepeat('off')
  }

  useEffect(() => {
    ;(async function () {
      setIsFetchingSong(true)
      if (!currentSong?.id) return
      try {
        const url = await window.api.subsonic.getCoverArtUrl(currentSong.id)
        setSongArt(url)
      } catch (err) {
        // Only log if it's not an abort error
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Failed to fetch song artwork:', err)
        }
      } finally {
        setIsFetchingSong(false)
      }
    })()
  }, [currentSong?.id])

  // Fetch current song metadata
  useEffect(() => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller for this fetch cycle
    abortControllerRef.current = new AbortController()

    // Fetch every 10 seconds to update current song
    const interval = setInterval(() => {
      abortControllerRef.current = new AbortController()
    }, 10000)

    return () => {
      clearInterval(interval)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [isPlaying, currentStation?.url, currentStation?.urlResolved])

  if (!currentStation && !currentSong) {
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

  // Format time in MM:SS or HH:MM:SS format
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '0:00'

    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Handle seekbar change
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPosition = parseFloat(e.target.value)
    seek(newPosition)
  }

  return (
    <>
      <div className={`audio-player`}>
        <div className="audio-player-info">
          {!isOpen &&
            (currentStation && currentStation.favicon ? (
              <img
                src={currentStation.favicon}
                alt={currentStation.name}
                className="audio-player-logo"
              />
            ) : currentSong && songArt ? (
              <img src={songArt} alt={currentSong.title} className="audio-player-logo" />
            ) : (
              <div>
                <Icon
                  path={mdiSpeaker}
                  size={2}
                  color="currentColor"
                  className="audio-player-logo"
                />
              </div>
            ))}
          {currentSong && (
            <div className="audio-player-details">
              <div className="audio-player-station">
                {isFetchingSong && (
                  <Icon path={mdiLoading} size={0.5} spin className="inline mr-1" />
                )}
                {currentSong.title}
              </div>
              <div className="audio-player-song">
                <Link
                  className="hover:underline"
                  to={`/album/$albumId`}
                  params={{ albumId: currentSong.albumId }}
                >
                  {currentSong.album}
                </Link>
              </div>
              <div className="audio-player-song">
                {currentSong.artists.map((artist, i) => (
                  <>
                    <Link
                      className="hover:underline"
                      key={artist.id + '_' + i}
                      to={`/artist/$artistId`}
                      params={{ artistId: artist.id }}
                    >
                      {artist.name}
                    </Link>
                    {i < currentSong.artists.length - 1 && <span>, </span>}
                  </>
                ))}
              </div>
              {error && <div className="audio-player-error">{error}</div>}
            </div>
          )}
          {currentStation && (
            <div className="audio-player-details">
              <div className="audio-player-station">{currentStation.name}</div>
              {getTags(currentStation.tags).length > 0 && (
                <div className="audio-player-genre">
                  {getTags(currentStation.tags)
                    .map((tag) => tag.charAt(0).toUpperCase() + tag.slice(1))
                    .join(', ')}
                </div>
              )}
              {error && <div className="audio-player-error">{error}</div>}
            </div>
          )}
          <button
            onClick={() => {
              if (currentStation) toggleFavourite(currentStation)
              if (currentSong) {
                if (isStarred(currentSong.id, 'song')) {
                  unstar({ id: currentSong.id }).catch((err) => {
                    console.error('Failed to unstar song:', err)
                  })
                } else {
                  star({ id: currentSong.id }).catch((err) => {
                    console.error('Failed to star song:', err)
                  })
                }
              }
            }}
            className="audio-player-btn"
          >
            <Icon
              path={(() => {
                if (currentStation) {
                  if (isFavourite(currentStation.url)) return mdiHeart
                  else return mdiHeartOutline
                } else if (currentSong) {
                  if (isStarred(currentSong.id, 'song')) return mdiHeart
                  else return mdiHeartOutline
                }
                return mdiHeartOutline
              })()}
              size={1}
            />
          </button>
        </div>

        <div className="flex flex-col items-center">
          <div className="audio-player-controls">
            {currentSong && (
              <button
                onClick={toggleShuffle}
                className={`audio-player-btn ${shuffle ? 'shadow-glass bg-white/30' : ''}`}
                aria-label="Shuffle"
                title="Shuffle"
              >
                <Icon path={mdiShuffle} size={0.8} />
              </button>
            )}

            {currentSong && (
              <button onClick={handlePrevious} className="audio-player-btn" aria-label="Previous">
                <Icon path={mdiSkipPrevious} size={1} />
              </button>
            )}

            {!currentSong && (
              <button
                onClick={() => (currentStation || currentSong) && stop()}
                className="audio-player-btn"
                aria-label={'Stop'}
              >
                <Icon path={mdiStop} size={1} />
              </button>
            )}

            <button
              onClick={isPlaying ? pause : resume}
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

            {currentSong && (
              <button onClick={playNext} className="audio-player-btn" aria-label="Next">
                <Icon path={mdiSkipNext} size={1} />
              </button>
            )}

            {currentSong && (
              <button
                onClick={toggleRepeat}
                className={`audio-player-btn p-2! ${repeat !== 'off' ? 'shadow-glass bg-white/30' : ''}`}
                aria-label="Repeat"
                title={`Repeat: ${repeat}`}
              >
                {repeat === 'one' ? <Repeat1 className="size-4" /> : <Repeat className="size-4" />}
              </button>
            )}
          </div>{' '}
          {/* Seekbar for non-radio content */}
          {isSeekable && (
            <div className="audio-player-seekbar flex items-center gap-2 px-4 pt-2">
              <span className="text-sm use-theme-text min-w-11.25 text-right">
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min="0"
                max={duration}
                step="0.1"
                value={currentTime}
                onChange={handleSeekChange}
                className="w-100 flex-1 h-1 bg-black/40 dark:bg-white/40 rounded-full appearance-none outline-none cursor-pointer [&::-webkit-slider-thumb]:opacity-0! [&::-moz-range-thumb]:opacity-0!"
                aria-label="Seek"
                style={{
                  background: `linear-gradient(to right, var(--range-bg) 0%, var(--range-bg) ${(currentTime / duration) * 100}%, var(--range-bg-opacity) ${(currentTime / duration) * 100}%, var(--range-bg-opacity) 100%)`
                }}
              />
              <span className="text-sm use-theme-text min-w-11.25">{formatTime(duration)}</span>
            </div>
          )}
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
            className="w-24 h-1 bg-black/40 dark:bg-white/40 rounded-full appearance-none outline-none cursor-pointer [&::-webkit-slider-thumb]:opacity-0! [&::-moz-range-thumb]:opacity-0!"
            aria-label="Seek"
            style={{
              background: `linear-gradient(to right, var(--range-bg) 0%, var(--range-bg) ${volume * 100}%, var(--range-bg-opacity) ${volume * 100}%, var(--range-bg-opacity) 100%)`
            }}
          />
          <button
            onClick={() => openSleepTimerModal()}
            className={`audio-player-btn relative ${sleepTimerActive ? 'text-green-400' : ''}`}
            aria-label="Sleep timer"
            title={sleepTimerActive ? `Sleep timer: ${formatTimeRemaining()}` : 'Set sleep timer'}
          >
            <Icon path={mdiTimerOutline} size={1} />
            {sleepTimerActive && (
              <span className="absolute -top-1 -right-1 text-[10px] font-bold bg-green-500 text-white rounded-full px-1 min-w-4.5 text-center">
                {formatTimeRemaining().split(':')[0]}
              </span>
            )}
          </button>
          <button
            onClick={toggle}
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
