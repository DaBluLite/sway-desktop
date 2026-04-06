import { useEffect, useState, useRef, useCallback } from 'react'
import { Icon } from '@mdi/react'
import {
  mdiMusicNote,
  mdiLoading,
  mdiChevronUp,
  mdiChevronDown,
  mdiImageOff,
  mdiMusicNoteOff
} from '@mdi/js'
import { fetchTrackDataCached, TrackInfo, LyricsResult, AlbumArtResult } from '../lib/lyrics'

interface LyricsPanelProps {
  streamTitle: string | null
  stationFavicon?: string
}

export const LyricsPanel: React.FC<LyricsPanelProps> = ({
  streamTitle,
  stationFavicon
}: LyricsPanelProps) => {
  const [track, setTrack] = useState<TrackInfo | null>(null)
  const [lyrics, setLyrics] = useState<LyricsResult | null>(null)
  const [albumArt, setAlbumArt] = useState<AlbumArtResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const lastStreamTitleRef = useRef<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async (title: string) => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    try {
      const result = await fetchTrackDataCached(title)
      // Check if this request was aborted
      if (abortControllerRef.current?.signal.aborted) return

      setTrack(result.track)
      setLyrics(result.lyrics)
      setAlbumArt(result.albumArt)
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') return
      console.error('Failed to fetch track data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!streamTitle) {
      setTrack(null)
      setLyrics(null)
      setAlbumArt(null)
      setIsLoading(false)
      lastStreamTitleRef.current = null
      return
    }

    if (streamTitle === lastStreamTitleRef.current) return

    lastStreamTitleRef.current = streamTitle
    setIsLoading(true)
    setLyrics(null)
    setAlbumArt(null)
    setTrack(null)

    fetchData(streamTitle)

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [streamTitle, fetchData])

  const currentArt = albumArt?.imageUrl || stationFavicon

  if (!streamTitle) {
    return null
  }

  return (
    <div className="raised-interface-lg rounded-lg overflow-hidden">
      {/* Header with album art preview */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-3 active:bg-second-layer-thin-active dark:active:bg-second-layer-thin-active-dark transition"
      >
        {/* Album art thumbnail */}
        <div className="w-16 h-16 rounded-md overflow-hidden raised-interface shrink-0">
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <Icon path={mdiLoading} size={1} spin className="text-zinc-400" />
            </div>
          ) : currentArt ? (
            <img src={currentArt} alt="Album art" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Icon path={mdiImageOff} size={1} className="text-zinc-500" />
            </div>
          )}
        </div>

        {/* Track info */}
        <div className="flex-1 text-left min-w-0">
          {track ? (
            <>
              <p className="text-white font-medium truncate">{track.title}</p>
              <p className="text-zinc-400 text-sm truncate">{track.artist}</p>
              {albumArt?.album && (
                <p className="text-zinc-500 text-xs truncate">{albumArt.album}</p>
              )}
            </>
          ) : streamTitle.includes(' - ') ? (
            <>
              <p className="text-white font-medium truncate">{streamTitle.split(' - ')[1]}</p>
              <p className="text-zinc-400 text-sm truncate">{streamTitle.split(' - ')[0]}</p>
            </>
          ) : (
            <p className="text-white font-medium truncate">{streamTitle}</p>
          )}
        </div>

        {/* Expand/collapse icon */}
        <Icon
          path={isExpanded ? mdiChevronUp : mdiChevronDown}
          size={1}
          className="text-zinc-400 shrink-0"
        />
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-subtle">
          {/* Large album art */}
          {currentArt && (
            <div className="p-4 flex justify-center">
              <img
                src={currentArt}
                alt="Album art"
                className="max-w-64 max-h-64 rounded-lg object-cover shadow-main"
              />
            </div>
          )}

          {/* Track details */}
          {track && (
            <div className="px-4 pb-2 text-center">
              <h3 className="text-xl font-bold text-white">{track.title}</h3>
              <p className="text-zinc-300">{track.artist}</p>
              {albumArt?.album && <p className="text-zinc-400 text-sm">{albumArt.album}</p>}
              {albumArt?.source && (
                <p className="text-zinc-400 text-xs mt-1">Album art via {albumArt.source}</p>
              )}
            </div>
          )}

          {/* Lyrics */}
          <div className="p-4 pt-2">
            <div className="flex items-center gap-2 mb-3">
              <Icon path={mdiMusicNote} size={0.8} className="text-white" />
              <span className="text-sm font-medium text-white">Lyrics</span>
              {lyrics?.source && <span className="text-xs text-zinc-400">via {lyrics.source}</span>}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Icon path={mdiLoading} size={1.5} spin className="text-zinc-400" />
              </div>
            ) : lyrics?.lyrics ? (
              <div className="raised-interface-lg rounded-lg p-4 max-h-80 overflow-y-auto">
                <pre className="text-zinc-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">
                  {lyrics.lyrics}
                </pre>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-zinc-400">
                <Icon path={mdiMusicNoteOff} size={2} className="mb-2 opacity-50" />
                <p className="text-sm">
                  {!track
                    ? 'Could not parse track information'
                    : lyrics?.error || 'Lyrics not available'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
