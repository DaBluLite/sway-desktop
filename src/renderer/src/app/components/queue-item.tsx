import { Link } from '@tanstack/react-router'
import { Play, Volume2 } from 'lucide-react'
import { SubsonicSong } from '../../../../types/subsonic'
import { useEffect, useState } from 'react'
import { useAudioPlayer } from '@renderer/contexts/audio-player-context'

function QueueItem({
  song,
  position
}: {
  song: SubsonicSong
  position: 'before' | 'after' | 'current'
}) {
  const [art, setArt] = useState<string>('')
  const { playFromQueue, currentSong } = useAudioPlayer()

  useEffect(() => {
    let isMounted = true
    ;(async () => {
      try {
        const url = await window.api.subsonic.getCoverArtUrl(song.id)
        if (isMounted) setArt(url as string)
      } catch (err) {
        console.error('Failed to fetch song artwork:', err)
      }
    })()
    return () => {
      isMounted = false
    }
  }, [song.id])

  return (
    <div
      onDoubleClick={() => {
        playFromQueue(song.id)
      }}
      className={`grid gap-3 grid-cols-[auto_1fr_auto] grid-flow-col items-center h-11 shrink-0 grow-0 group ${currentSong?.id === song.id ? 'playing' : ''} ${position === 'before' ? 'opacity-50' : ''} `}
    >
      <div className="flex relative text-zinc-600 dark:text-zinc-400 w-11 h-11 shrink-0 grow-0 items-center justify-center">
        <img className="h-11 w-11 rounded shrink-0" src={art} />
        <div className="hidden group-hover:flex group-[.playing]:flex absolute top-0 left-0 right-0 bottom-0 justify-center items-center">
          <button
            className="cursor-pointer group-[.playing]:cursor-default use-theme-text group-[.playing]:text-green-500"
            onClick={(e) => {
              e.stopPropagation()
              if (currentSong?.id !== song.id) playFromQueue(song.id)
            }}
          >
            {currentSong?.id === song.id ? (
              <Volume2 className="size-4" />
            ) : (
              <Play className="size-4" />
            )}
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="text-sm use-theme-text group-[.playing]:font-semibold group-[.playing]:text-green-500 flex items-center grow-0 shrink-0">
          {song.title}
        </p>
        <span className="text-sm text-zinc-600 dark:text-zinc-400 items-center">
          {song.artists.map(({ name, id }, i) => (
            <>
              <Link
                key={id}
                to={`/artist/$artistId`}
                params={{ artistId: id }}
                className="hover:underline cursor-pointer"
              >
                {name}
              </Link>
              {i < song.artists.length - 1 && <span className="mr-1">, </span>}
            </>
          ))}
        </span>
      </div>
    </div>
  )
}

export default QueueItem
