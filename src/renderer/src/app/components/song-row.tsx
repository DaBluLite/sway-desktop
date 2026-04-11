import { mdiHeart, mdiHeartOutline, mdiPlaylistMusic } from '@mdi/js'
import Icon from '@mdi/react'
import { Link } from '@tanstack/react-router'
import { EllipsisVertical, Play, Volume2 } from 'lucide-react'
import { SubsonicSong } from '../../../../types/subsonic'
import { useEffect, useState } from 'react'
import { useModal } from '@renderer/contexts/modal-context'
import { useContextMenu } from '@renderer/contexts/context-menu-context'

function SongRow({
  song,
  i,
  playlist,
  playSong,
  isStarred,
  star,
  unstar,
  currentSong,
  fields = { artwork: true, album: true }
}: {
  song: SubsonicSong
  i: number
  playlist: SubsonicSong[]
  playSong: (songs: SubsonicSong[], songId: string) => void
  isStarred: (id: string, type: 'song' | 'album') => boolean
  star: ({ id }: { id: string }) => void
  unstar: ({ id }: { id: string }) => void
  currentSong: SubsonicSong | null
  fields?: {
    artwork: boolean
    album: boolean
  }
}) {
  const [art, setArt] = useState<string>('')
  const { openPlaylistModal } = useModal()
  const { openContextMenu } = useContextMenu()

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
        playSong(playlist, song.id)
      }}
      className={
        `flex items-center h-12 shrink-0 group rounded-sm hover:bg-theme-bg/50 hover:bg-zinc-700/25! use-transition ${currentSong?.id === song.id ? 'playing' : ''} ` +
        (i % 2 === 0 ? ' bg-zinc-700/20' : '')
      }
    >
      <div className="flex relative text-zinc-600 dark:text-zinc-400 basis-10.5 shrink-0 grow-0 items-center justify-center h-full">
        <span className="group-hover:hidden group-[.playing]:hidden">{i + 1}</span>
        <div className="hidden group-hover:flex group-[.playing]:flex absolute top-0 left-0 right-0 bottom-0 justify-center items-center">
          <button
            className="cursor-pointer group-[.playing]:cursor-default use-theme-text group-[.playing]:text-green-500"
            onClick={(e) => {
              e.stopPropagation()
              if (currentSong?.id !== song.id) playSong(playlist, song.id)
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
      {fields.artwork && (
        <div className="basis-10.5 pr-3 h-full flex items-center">
          <img className="h-10.5 w-10.5 rounded shrink-0" src={art} />
        </div>
      )}
      <p className="text-sm text-zinc-600 dark:text-zinc-400 group-[.playing]:font-semibold group-[.playing]:text-green-500 basis-57 pr-3 flex items-center grow shrink-0">
        {song.title}
      </p>
      <span className="text-sm text-zinc-600 dark:text-zinc-400 pr-3 basis-42.5 flex items-center grow shrink">
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
      {fields.album && (
        <Link
          to={`/album/$albumId`}
          params={{ albumId: song.albumId }}
          className="hover:underline cursor-pointer text-sm text-zinc-600 dark:text-zinc-400 pr-3 basis-28 flex items-center grow shrink"
        >
          {song.album}
        </Link>
      )}
      <p className="text-sm text-zinc-600 dark:text-zinc-400 pr-2.75 basis-16.5 max-w-22 min-w-12 flex items-center grow shrink">
        {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
      </p>
      <div className="flex items-center justify-end gap-3 basis-25 pr-2.75 grow-0 shrink-0">
        <button
          className="cursor-pointer use-theme-text opacity-50"
          onClick={(e) => {
            e.stopPropagation()
            openContextMenu({
              onClose: () => {},
              x: e.clientX,
              y: e.clientY,
              items: [
                {
                  text: 'Add to Playlist',
                  onClick: () => openPlaylistModal(song),
                  Icon() {
                    return <Icon path={mdiPlaylistMusic} size={0.8} className="text-white" />
                  }
                }
              ]
            })
          }}
        >
          <EllipsisVertical className="size-3.5" />
        </button>
        <button
          className="cursor-pointer use-theme-text opacity-50"
          onClick={(e) => {
            e.stopPropagation()
            if (isStarred(song.id, 'song')) {
              unstar({ id: song.id })
            } else {
              star({ id: song.id })
            }
          }}
        >
          <Icon
            path={(() => {
              if (isStarred(song.id, 'song')) return mdiHeart
              else return mdiHeartOutline
            })()}
            className="size-3.5"
          />
        </button>
      </div>
    </div>
  )
}

export default SongRow
