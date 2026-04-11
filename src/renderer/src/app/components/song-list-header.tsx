function SongListHeader({
  fields = {
    artwork: true,
    album: true
  }
}: {
  fields?: {
    artwork: boolean
    album: boolean
  }
}) {
  return (
    <div className="flex items-center h-9 w-full shrink-0">
      <span className="flex basis-10.5 shrink-0 grow-0 items-center justify-center h-full text-xs">
        #
      </span>
      <span
        className={`flex grow shrink-0 text-left h-full pr-4 items-center text-xs ${fields.artwork ? 'basis-70.5' : 'basis-57'}`}
      >
        TRACK
      </span>
      <span className="flex grow shrink-0 text-left basis-42.5 h-full pr-4 items-center text-xs">
        ARTIST
      </span>
      {fields.album && (
        <span className="flex grow shrink-0 text-left basis-28 h-full pr-4 items-center text-xs">
          ALBUM
        </span>
      )}
      <span className="flex grow shrink-0 text-left basis-16.5 max-w-22 h-full pr-2.75 items-center min-w-12 text-xs">
        TIME
      </span>
      <div className="basis-25 grow-0 shrink-0" />
    </div>
  )
}

export default SongListHeader
