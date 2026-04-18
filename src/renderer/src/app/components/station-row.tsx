import { mdiHeart, mdiHeartOutline } from '@mdi/js'
import Icon from '@mdi/react'
import { EllipsisVertical, ListCheck, Play, ScanSearch, Volume2 } from 'lucide-react'
import { Station } from 'radio-browser-api'
import { useAudioPlayer } from '../contexts/audio-player-context'
import { useFavourites } from '../contexts/favourites-context'
import { useModal } from '../contexts/modal-context'
import { ContextMenuItem, useContextMenu } from '../contexts/context-menu-context'

function StationRow({
  station,
  i,
  fields = { artwork: true },
  actions = []
}: {
  actions?: ContextMenuItem[]
  station: Station
  i: number
  fields?: {
    artwork: boolean
  }
}) {
  const { openCurationModal, openSimilarStationsModal } = useModal()
  const { openContextMenu } = useContextMenu()
  const { play, currentStation } = useAudioPlayer()
  const { isFavourite, toggleFavourite } = useFavourites()

  function handleContextMenu(
    e: React.MouseEvent<HTMLButtonElement> | React.MouseEvent<HTMLDivElement>
  ) {
    e.stopPropagation()
    e.preventDefault()
    openContextMenu({
      onClose: () => {},
      x: e.clientX,
      y: e.clientY,
      items: [
        ...actions,
        {
          text: 'Add to Curartion',
          onClick: () => openCurationModal(station),
          Icon() {
            return <ListCheck className="use-theme-text size-4" />
          }
        },
        {
          text: 'Find Similar Stations',
          onClick: () => openSimilarStationsModal(station),
          Icon() {
            return <ScanSearch className="use-theme-text size-4" />
          }
        }
      ]
    })
  }

  return (
    <div
      onDoubleClick={() => {
        play(station)
      }}
      onContextMenu={handleContextMenu}
      className={
        `flex items-center h-12 shrink-0 group rounded-sm hover:bg-theme-bg/50 hover:bg-zinc-700/25! use-transition ${currentStation?.id === station.id ? 'playing' : ''} ` +
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
              if (currentStation?.id !== station.id) play(station)
            }}
          >
            {currentStation?.id === station.id ? (
              <Volume2 className="size-4" />
            ) : (
              <Play className="size-4" />
            )}
          </button>
        </div>
      </div>
      {fields.artwork && (
        <div className="basis-10.5 pr-3 h-full flex items-center">
          <img className="h-10.5 w-10.5 rounded shrink-0" src={station.favicon} />
        </div>
      )}
      <p className="text-sm text-zinc-600 dark:text-zinc-400 group-[.playing]:font-semibold group-[.playing]:text-green-500 basis-57 pr-3 flex items-center grow shrink-0">
        {station.name}
      </p>
      <span className="text-sm text-zinc-600 dark:text-zinc-400 pr-3 basis-42.5 flex items-center grow shrink text-ellipsis overflow-hidden whitespace-nowrap">
        {station.tags.join(', ')}
      </span>
      <div className="flex items-center justify-end gap-3 basis-25 pr-2.75 grow-0 shrink-0">
        <button className="cursor-pointer use-theme-text opacity-50" onClick={handleContextMenu}>
          <EllipsisVertical className="size-3.5" />
        </button>
        <button
          className="cursor-pointer use-theme-text opacity-50"
          onClick={(e) => {
            e.stopPropagation()
            toggleFavourite(station)
          }}
        >
          <Icon
            path={(() => {
              if (isFavourite(station.url)) return mdiHeart
              else return mdiHeartOutline
            })()}
            className="size-3.5"
          />
        </button>
      </div>
    </div>
  )
}

export default StationRow
