import Icon from '@mdi/react'
import { mdiSpeaker, mdiLoading } from '@mdi/js'
import { useAudioPlayer } from '../contexts/audio-player-context'
import { useMediaPlayerScreen } from '../contexts/media-player-screen-context'
import { useEffect, useState } from 'react'
import { LyricsPanel } from './lyrics-panel'
import QueueItem from './queue-item'
import { SubsonicSong } from '../../../../types/subsonic'

export default function MediaPlayerScreen() {
  const { isPlaying, currentStation, currentSong: currentSubsonicSong, queue } = useAudioPlayer()
  const { isOpen, isAnimating } = useMediaPlayerScreen()
  const [currentSong, setCurrentSong] = useState<string | null>(null)
  const [songArt, setSongArt] = useState<string | null>(null)
  const [isFetchingSong, setIsFetchingSong] = useState(false)
  const [currentTab, setCurrentTab] = useState<'lyrics' | 'info' | 'queue'>('lyrics')

  // Fetch current song metadata
  useEffect(() => {
    if (!isPlaying || !currentStation?.url) {
      setCurrentSong(null)
      return
    }

    const fetchSongMetadata = async () => {
      setIsFetchingSong(true)
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
      } finally {
        setIsFetchingSong(false)
      }
    }

    // Fetch immediately
    fetchSongMetadata()

    // Fetch every 10 seconds to update current song
    const interval = setInterval(fetchSongMetadata, 10000)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, currentStation?.url, currentStation?.urlResolved])

  useEffect(() => {
    ;(async function () {
      setIsFetchingSong(true)
      if (!currentSubsonicSong) return
      try {
        const url = await window.api.subsonic.getCoverArtUrl(currentSubsonicSong.id)
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
  }, [currentSubsonicSong])

  if (!isOpen) return null

  return (
    <>
      <div
        className={
          'fixed inset-0 z-99 raised-interface-lg shadow-none border-0 backdrop-blur-2xl backdrop-brightness-25 to-white dark:to-zinc-950 text-white animate-slide-up overflow-y-auto' +
          (isAnimating ? ' animate-slide-out' : '')
        }
      >
        <div className="flex flex-row w-full items-center h-full pb-32">
          {/* Album art / Station image */}
          <div className="flex justify-center px-8 mt-8 mb-8 flex-1">
            <div className="station-item-image-container min-w-80 min-h-80 md:min-w-124 md:min-h-124 max-w-124 max-h-124 rounded-2xl shadow-2xl">
              {!isFetchingSong &&
              ((currentStation &&
                currentStation.favicon &&
                currentStation.favicon.startsWith('https')) ||
                currentSubsonicSong) ? (
                <img
                  src={songArt || currentStation?.favicon}
                  className="w-full h-full object-contain bg-white rounded-2xl"
                />
              ) : (
                <div className="station-card-fallback rounded-2xl">
                  <Icon
                    path={isFetchingSong ? mdiLoading : mdiSpeaker}
                    size={8}
                    color="currentColor"
                  />
                </div>
              )}
            </div>
          </div>
          {/* Lyrics Panel */}
          <div className="px-8 mt-8 pb-8 w-full md:w-1/2 h-full flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-3">
              <button
                className={`${currentTab === 'lyrics' ? 'active' : ''} border-b-2 border-transparent hover:border-subtle [.active]:border-white cursor-pointer use-theme-text text-xl py-2 px-6`}
                onClick={() => setCurrentTab('lyrics')}
              >
                Lyrics
              </button>
              <button
                className={`${currentTab === 'queue' ? 'active' : ''} border-b-2 border-transparent hover:border-subtle [.active]:border-white cursor-pointer use-theme-text text-xl py-2 px-6`}
                onClick={() => setCurrentTab('queue')}
              >
                Queue
              </button>
            </div>
            {currentTab === 'lyrics' && (
              <LyricsPanel
                streamTitle={currentSong}
                stationFavicon={currentStation?.favicon}
                song={currentSubsonicSong}
              />
            )}
            {currentTab === 'queue' && (
              <div className="raised-interface-lg rounded-lg overflow-hidden flex flex-col h-full max-h-[75vh]">
                <div className="flex items-center justify-between py-3 px-6">
                  <h3 className="text-2xl">Play Queue</h3>
                </div>
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-black/20 space-y-2 p-4">
                  {queue.map((item, i) => (
                    <QueueItem
                      key={item.id}
                      song={item}
                      position={(function () {
                        if (item.id === currentSubsonicSong?.id) return 'current'
                        if (queue.indexOf(currentSubsonicSong as SubsonicSong) > i) {
                          return 'before'
                        }
                        return 'after'
                      })()}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
