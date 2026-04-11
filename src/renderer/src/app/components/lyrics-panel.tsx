import { useEffect, useState, useRef, useCallback } from 'react'
import { Icon } from '@mdi/react'
import { mdiLoading, mdiMusicNoteOff } from '@mdi/js'
import { fetchTrackDataCached, TrackInfo, LyricsResult } from '../lib/lyrics'
import { SubsonicSong } from '../../../../types/subsonic'
import { useAudioPlayer } from '../contexts/audio-player-context'

interface LyricsPanelProps {
  streamTitle: string | null
  stationFavicon?: string
  song?: SubsonicSong | null
}

export const LyricsPanel: React.FC<LyricsPanelProps> = ({
  streamTitle,
  song
}: LyricsPanelProps) => {
  const { currentTime, seek, isSeekable } = useAudioPlayer()
  const [track, setTrack] = useState<TrackInfo | null>(null)
  const [lyrics, setLyrics] = useState<LyricsResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const lastIdentifierRef = useRef<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const lyricsContainerRef = useRef<HTMLDivElement>(null)
  const activeLyricRef = useRef<HTMLDivElement>(null)

  const fetchData = useCallback(async (title: string, artist?: string) => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    try {
      const result = await fetchTrackDataCached(title, artist, title)

      // Check if this request was aborted
      if (abortControllerRef.current?.signal.aborted) return

      setTrack(result.track)
      setLyrics(result.lyrics)
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') return
      console.error('Failed to fetch track data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])
  useEffect(() => {
    const identifier = song ? `song-${song.id}` : streamTitle || null

    if (!identifier) {
      setTrack(null)
      setLyrics(null)
      setIsLoading(false)
      lastIdentifierRef.current = null
      return
    }

    if (identifier === lastIdentifierRef.current) return

    lastIdentifierRef.current = identifier
    setIsLoading(true)
    setLyrics(null)
    setTrack(null)

    if (song) {
      fetchData(song.title, song.artist)
    } else if (streamTitle) {
      fetchData(streamTitle)
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [streamTitle, song, fetchData])

  // Scroll to active lyric
  useEffect(() => {
    if (activeLyricRef.current && lyricsContainerRef.current) {
      activeLyricRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })
    }
  }, [currentTime, lyrics?.syncedLyrics])

  if (!streamTitle && !song) {
    return null
  }

  const activeLyricIndex = lyrics?.syncedLyrics
    ? lyrics.syncedLyrics.findLastIndex((line) => line.time <= currentTime)
    : -1

  return (
    <div className="raised-interface-lg rounded-lg overflow-hidden flex flex-col h-full max-h-[75vh]">
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-black/20">
        <div className="p-6 pt-4 flex-1 flex flex-col min-h-0">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <Icon path={mdiLoading} size={2} spin className="text-zinc-500" />
              <p className="text-zinc-500 text-sm animate-pulse">Searching for lyrics...</p>
            </div>
          ) : lyrics?.syncedLyrics && lyrics.syncedLyrics.length > 0 ? (
            <div
              ref={lyricsContainerRef}
              className="overflow-y-auto flex-1 flex flex-col gap-8 py-8 scrollbar-hide"
            >
              {lyrics.syncedLyrics.map((line, index) => (
                <div
                  key={`${line.time}-${index}`}
                  ref={index === activeLyricIndex ? activeLyricRef : null}
                  onClick={() => isSeekable && seek(line.time)}
                  className={`text-3xl font-black transition-all duration-500 leading-tight tracking-tight ${
                    index === activeLyricIndex
                      ? 'text-white scale-105 origin-left'
                      : index < activeLyricIndex
                        ? 'text-white/40 hover:text-white/60'
                        : 'text-white/20 hover:text-white/40'
                  } ${isSeekable ? 'cursor-pointer' : ''}`}
                >
                  {line.text}
                </div>
              ))}
              <div className="h-48 shrink-0" /> {/* Spacer at bottom for better scrolling */}
            </div>
          ) : lyrics?.lyrics ? (
            <div className="overflow-y-auto flex-1 py-4 scrollbar-hide">
              <div className="text-zinc-200 text-xl whitespace-pre-wrap font-sans font-medium leading-relaxed text-center px-4">
                {lyrics.lyrics}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4">
              <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center">
                <Icon path={mdiMusicNoteOff} size={1.5} className="opacity-50" />
              </div>
              <div className="text-center">
                <p className="font-medium text-zinc-400">
                  {!(track || song)
                    ? 'No track information found'
                    : lyrics?.error === 'Not found'
                      ? 'Lyrics not found'
                      : lyrics?.error || 'Lyrics not available'}
                </p>
                <p className="text-xs text-zinc-600 mt-1">
                  Try checking the song title or artist name
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center justify-end gap-2 mt-4 shrink-0">
            {lyrics?.source && (
              <span className="text-xs text-zinc-500 ml-auto">Source: {lyrics.source}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
