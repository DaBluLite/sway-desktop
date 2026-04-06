import Icon from '@mdi/react'
import {
  mdiCastAudio,
  mdiHeart,
  mdiHeartOutline,
  mdiPause,
  mdiPlay,
  mdiSpeaker,
  mdiTuneVertical,
  mdiRecord,
  mdiAlarm,
  mdiRecordCircle,
  mdiStop,
  mdiClose
} from '@mdi/js'
import { useFavourites } from '../contexts/favourites-context'
import { useAudioPlayer } from '../contexts/audio-player-context'
import { useMediaPlayerScreen } from '../contexts/media-player-screen-context'
import { useCastContext } from '../contexts/cast-context'
import { useEqualizer } from '../contexts/equalizer-context'
import { useRecordings } from '../contexts/recordings-context'
import { useAlarm } from '../contexts/alarm-context'
import { useModal } from '../contexts/modal-context'
import { useEffect, useState } from 'react'
import { LyricsPanel } from './lyrics-panel'

export default function MediaPlayerScreen() {
  const { isPlaying, currentStation, play, pause, stop, isMuted, volume, setVolume, audioElement } =
    useAudioPlayer()
  const { isFavourite, toggleFavourite } = useFavourites()
  const { isOpen, close, isAnimating } = useMediaPlayerScreen()
  const { chromecast } = useCastContext()
  const { enabled: eqEnabled, connectToAudio } = useEqualizer()
  const { isRecording } = useRecordings()
  const { alarms } = useAlarm()

  const [castAvailable, setCastAvailable] = useState(chromecast.available)
  const [castConnected, setCastConnected] = useState(chromecast.connected)
  const { openRecorderModal, openAlarmModal } = useModal()
  const [currentSong, setCurrentSong] = useState<string | null>(null)

  // Count active alarms
  const activeAlarmsCount = alarms.filter((a) => a.enabled).length

  useEffect(() => {
    if (audioElement) {
      connectToAudio(audioElement)
    }
  }, [audioElement, connectToAudio])

  useEffect(() => {
    chromecast.on('available', () => {
      console.log('change', chromecast.available)
      setCastAvailable(chromecast.available)
    })

    chromecast.on('connect', () => {
      setCastConnected(chromecast.connected)
      pause()
    })

    // remove event-listeners when component is unmounted
    return function cleanup() {
      chromecast.off()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch current song metadata
  useEffect(() => {
    if (!isPlaying || !currentStation?.url) {
      setCurrentSong(null)
      return
    }

    const fetchSongMetadata = async () => {
      try {
        const response = await fetch(
          `https://sway.dablulite.dev/api/radio/get-song?url=${encodeURIComponent(currentStation.urlResolved || currentStation.url)}`
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
        console.error('Failed to fetch song metadata:', err)
        setCurrentSong(null)
      }
    }

    // Fetch immediately
    fetchSongMetadata()

    // Fetch every 10 seconds to update current song
    const interval = setInterval(fetchSongMetadata, 10000)

    return () => clearInterval(interval)
  }, [isPlaying, currentStation?.url, currentStation?.urlResolved])

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value))
  }

  if (!isOpen) return null

  return (
    <>
      <div
        className={
          'fixed inset-0 z-1001 raised-interface-lg shadow-none border-0 backdrop-blur-2xl backdrop-brightness-25 to-white dark:to-zinc-950 text-white animate-slide-up overflow-y-auto' +
          (isAnimating ? ' animate-slide-out' : '')
        }
      >
        {/* Header controls */}
        <div className="flex items-center gap-2 p-3 w-full justify-center overflow-hidden">
          <button
            className="btn p-1 cursor-pointer flex items-center gap-1 justify-center rounded-full shrink min-w-0 w-full md:w-fit md:mr-auto"
            onClick={close}
          >
            <Icon path={mdiClose} size={1} color="currentColor" className="m-2 shrink-0" />
            <div className="flex flex-col gap-1 mr-3 max-w-[calc(100%-0.75rem)] w-[calc(100%-0.75rem)] shrink justify-center items-start overflow-hidden">
              <span className="text-xs text-white/80 whitespace-nowrap">Now Playing</span>
              <span className="text-sm font-medium text-white/90 overflow-hidden whitespace-nowrap text-ellipsis max-w-full w-min">
                {currentStation ? currentStation.name : 'Nothing Playing'}
              </span>
            </div>
          </button>

          {/* Phase 3 controls */}
          <button
            onClick={() => {}}
            className={`p-2 btn rounded-full use-transition shrink-0 ${eqEnabled ? 'text-green-400' : ''}`}
            title="Equalizer"
          >
            <Icon path={mdiTuneVertical} size={1} color="currentColor" />
          </button>
          <button
            onClick={() => openAlarmModal()}
            className={`p-2 btn rounded-full use-transition relative shrink-0 ${activeAlarmsCount > 0 ? 'text-yellow-400' : ''}`}
            title="Alarms"
          >
            <Icon path={mdiAlarm} size={1} color="currentColor" />
            {activeAlarmsCount > 0 && (
              <span className="absolute -top-1 -right-1 text-[10px] font-bold bg-yellow-500 text-black rounded-full px-1 min-w-[18px] text-center">
                {activeAlarmsCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex flex-col md:flex-row w-full items-start md:h-[calc(100%-74px)]">
          <div className="flex flex-col justify-center w-full md:w-1/3 md:mr-auto md:mt-auto">
            {/* Album art / Station image */}
            <div className="flex justify-center md:justify-start px-8 mt-8 mb-8">
              <div className="station-item-image-container min-w-80 min-h-80 max-w-80 max-h-80 md:min-w-64 md:min-h-64 md:max-w-64 md:max-h-64 rounded-2xl shadow-2xl">
                {currentStation &&
                currentStation.favicon &&
                currentStation.favicon.startsWith('https') ? (
                  <img
                    src={currentStation.favicon}
                    alt={currentStation.name}
                    className="w-full h-full object-contain bg-white"
                  />
                ) : (
                  <div className="station-card-fallback">
                    <Icon path={mdiSpeaker} size={8} color="currentColor" />
                  </div>
                )}
              </div>
            </div>

            {/* Station name and now playing */}
            <div className="px-8 mb-8 items-center text-center">
              <h1 className="text-3xl font-bold mb-3 truncate drop-shadow-md">
                {currentStation ? currentStation.name : 'Nothing Playing'}
              </h1>
              {currentSong && (
                <p className="text-white/80 text-base font-medium truncate drop-shadow-sm">
                  {currentSong}
                </p>
              )}
            </div>

            {/* Playback controls */}
            <div className="flex items-center justify-center px-8 mb-10 gap-3">
              <button
                disabled={!currentStation}
                onClick={() => currentStation && toggleFavourite(currentStation)}
                className="p-3 invis-btn rounded-full use-transition hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon
                  path={
                    currentStation && isFavourite(currentStation.url) ? mdiHeart : mdiHeartOutline
                  }
                  size={1}
                  color={currentStation && isFavourite(currentStation.url) ? 'red' : 'white'}
                />
              </button>

              <button
                disabled={!currentStation}
                onClick={() => currentStation && stop()}
                className="p-3 invis-btn rounded-full use-transition hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon path={mdiStop} size={1} color={'white'} />
              </button>

              <button
                onClick={() => currentStation && (isPlaying ? pause() : play(currentStation))}
                disabled={!currentStation}
                className="bg-white text-black p-4 rounded-full transition hover:scale-105 active:scale-95 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPlaying ? (
                  <Icon path={mdiPause} size={1.2} color="currentColor" />
                ) : (
                  <Icon path={mdiPlay} size={1.2} color="currentColor" />
                )}
              </button>

              <button
                disabled={!castAvailable || !currentStation}
                className="p-3 invis-btn rounded-full use-transition hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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
              <button
                disabled={!currentStation || eqEnabled}
                onClick={() => openRecorderModal()}
                className={`p-3 invis-btn rounded-full use-transition hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${isRecording ? 'text-red-400!' : ''}`}
                title="Recording"
              >
                <Icon
                  path={isRecording ? mdiRecordCircle : mdiRecord}
                  size={1}
                  color="currentColor"
                />
                {isRecording && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>
            </div>

            {/* Volume slider */}
            <div className="px-8 mb-6">
              <div className="relative">
                {/* Progress background */}
                <div className="absolute inset-0 h-1 bg-white/10 rounded-full" />
                {/* Active progress */}
                <div
                  className="absolute inset-y-0 left-0 h-1 bg-linear-to-r from-green-400 to-green-500 rounded-full transition-all duration-150"
                  style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                />
                {/* Slider input */}
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="relative w-full h-1 bg-transparent appearance-none cursor-pointer z-10 -top-3.5
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-5
                    [&::-webkit-slider-thumb]:h-5
                    [&::-webkit-slider-thumb]:bg-white
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:shadow-lg
                    [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-webkit-slider-thumb]:transition-all
                    [&::-webkit-slider-thumb]:duration-150
                    hover:[&::-webkit-slider-thumb]:scale-110
                    active:[&::-webkit-slider-thumb]:scale-95
                    [&::-moz-range-thumb]:w-5
                    [&::-moz-range-thumb]:h-5
                    [&::-moz-range-thumb]:bg-white
                    [&::-moz-range-thumb]:rounded-full
                    [&::-moz-range-thumb]:border-none
                    [&::-moz-range-thumb]:shadow-lg
                    [&::-moz-range-thumb]:cursor-pointer
                    [&::-moz-range-thumb]:transition-all
                    hover:[&::-moz-range-thumb]:scale-110
                    active:[&::-moz-range-thumb]:scale-95"
                  aria-label="Volume"
                />
              </div>
            </div>
          </div>
          {/* Lyrics Panel */}
          <div className="px-4 mt-8 pb-8 w-full md:w-2/3">
            <LyricsPanel streamTitle={currentSong} stationFavicon={currentStation?.favicon} />
          </div>
        </div>
      </div>
    </>
  )
}
