import { useLibrary } from '@renderer/contexts/library-context'
import { createFileRoute } from '@tanstack/react-router'
import SongRow from '@renderer/components/song-row'

export const Route = createFileRoute('/library/songs/')({
  component: RouteComponent
})

function RouteComponent() {
  const { starred } = useLibrary()
  const starredSongs = starred?.song || []
  return (
    <div className="flex flex-col px-12 w-full h-screen gap-2">
      <div className="station-carousel-header">
        <h2 className="station-carousel-title">Tracks</h2>
      </div>
      <div className="flex items-center h-9 w-full">
        <span className="flex basis-10.5 shrink-0 grow-0 items-center justify-center h-full text-xs">
          #
        </span>
        <span className="flex grow shrink-0 text-left basis-70.5 h-full pr-4 items-center text-xs">
          TRACK
        </span>
        <span className="flex grow shrink-0 text-left basis-42.5 h-full pr-4 items-center text-xs">
          ARTIST
        </span>
        <span className="flex grow shrink-0 text-left basis-28 h-full pr-4 items-center text-xs">
          ALBUM
        </span>
        <span className="flex grow shrink-0 text-left basis-16.5 max-w-22 h-full pr-2.75 items-center min-w-12 text-xs">
          TIME
        </span>
        <div className="basis-25 grow-0 shrink-0" />
      </div>
      <div className="overflow-y-auto flex flex-col pb-35">
        {starredSongs?.map((song, i) => (
          <SongRow song={song} i={i} key={song.id} playlist={starredSongs} />
        ))}
      </div>
    </div>
  )
}
