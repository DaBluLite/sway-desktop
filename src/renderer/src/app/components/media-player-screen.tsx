import { useAudioPlayer } from '../contexts/audio-player-context'
import { useMediaPlayerScreen } from '../contexts/media-player-screen-context'
import { useCallback, useEffect, useState } from 'react'
import { LyricsPanel } from './lyrics-panel'
import QueueItem from './queue-item'
import { SubsonicSong } from '../../../../types/subsonic'
import { Music } from 'lucide-react'

export default function MediaPlayerScreen() {
  const { currentSong: currentSubsonicSong, queue } = useAudioPlayer()
  const { isOpen, isAnimating } = useMediaPlayerScreen()
  const [songArt, setSongArt] = useState<string | null>(null)
  const [currentTab, setCurrentTab] = useState<'lyrics' | 'info' | 'queue'>('lyrics')

  const fetchArtwork = useCallback(async (song: SubsonicSong) => {
    try {
      const url = await window.api.subsonic.getCoverArtUrl(song.id)
      setSongArt(url)
    } catch (err) {
      // Only log if it's not an abort error
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Failed to fetch song artwork:', err)
      }
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    currentSubsonicSong && fetchArtwork(currentSubsonicSong as SubsonicSong)
  }, [currentSubsonicSong, fetchArtwork])

  if (!isOpen) return null

  return (
    currentSubsonicSong && (
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
                {songArt ? (
                  <img
                    src={songArt}
                    className="w-full h-full object-contain bg-white rounded-2xl"
                  />
                ) : (
                  <div className="station-card-fallback rounded-2xl">
                    <Music className="size-48" color="currentColor" />
                  </div>
                )}
              </div>
            </div>
            {/* Lyrics Panel */}
            <div className="px-8 mt-8 pb-8 w-full md:w-1/2 h-full flex flex-col justify-center">
              <div className="flex items-center p-1 gap-1 mb-3 rounded-md bg-second-layer-thin dark:bg-second-layer-thin-dark shadow-glass border border-subtle w-fit">
                <button
                  className={`${currentTab === 'lyrics' ? 'active' : ''} hover:bg-faint [.active]:bg-subtle cursor-pointer use-theme-text text-xl py-2 px-6 rounded-sm use-transition font-light`}
                  onClick={() => setCurrentTab('lyrics')}
                >
                  Lyrics
                </button>
                <button
                  className={`${currentTab === 'queue' ? 'active' : ''} hover:bg-faint [.active]:bg-subtle cursor-pointer use-theme-text text-xl py-2 px-6 rounded-sm use-transition font-light`}
                  onClick={() => setCurrentTab('queue')}
                >
                  Queue
                </button>
              </div>
              {currentTab === 'lyrics' && (
                <LyricsPanel song={currentSubsonicSong as SubsonicSong} />
              )}
              {currentTab === 'queue' && (
                <div className="raised-interface-lg rounded-lg overflow-hidden flex flex-col h-full max-h-[75vh]">
                  <div className="flex items-center justify-between py-3 px-6">
                    <h3 className="text-2xl">Play Queue</h3>
                  </div>
                  <div className="flex-1 flex flex-col min-h-0 overflow-y-auto space-y-2 p-4">
                    <span className="queue-header">Play History</span>
                    {queue.map(
                      (item, i) =>
                        queue.indexOf(currentSubsonicSong as SubsonicSong) > i && (
                          <QueueItem key={item.id} song={item} position="before" />
                        )
                    )}
                    <div className="h-6 shrink-0" />
                    <span className="queue-header">Now playing</span>
                    <QueueItem song={currentSubsonicSong} position="current" />
                    <div className="h-6 shrink-0" />
                    <span className="queue-header">Next Up</span>
                    {queue.map(
                      (item, i) =>
                        queue.indexOf(currentSubsonicSong as SubsonicSong) < i && (
                          <QueueItem key={item.id} song={item} position="after" />
                        )
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    )
  )
}
