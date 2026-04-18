import { createFileRoute } from '@tanstack/react-router'
import { useCurations } from '@renderer/contexts/curations-context'
import StationRow from '@renderer/components/station-row'
import StationListHeader from '@renderer/components/station-list-header'
import { StationThumbnailGrid } from '@renderer/components/station-thumbnail-grid'
import { EllipsisVertical, PencilLine, Trash } from 'lucide-react'
import { useModal } from '@renderer/contexts/modal-context'
import { useContextMenu } from '@renderer/contexts/context-menu-context'

export const Route = createFileRoute('/library/curations/$curationId/')({
  component: CurationDetails
})

function CurationDetails() {
  const { curationId } = Route.useParams()
  const { getCollection } = useCurations()
  const { openContextMenu } = useContextMenu()
  const { openEditCurationModal, openDeleteCurationModal } = useModal()
  const curation = getCollection(curationId)

  if (!curation) {
    return <div className="p-8 text-zinc-400">Curation not found</div>
  }

  return (
    <div className="flex flex-col px-12 w-full h-[calc(100vh-64px)] gap-2">
      <div className="flex gap-8 items-end mb-6 relative py-4">
        <StationThumbnailGrid stations={curation.stations} />
        <div>
          <h1 className="text-4xl font-bold text-white">{curation.name}</h1>
          <p className="text-zinc-400 mt-2">{curation.description}</p>
          <p className="text-zinc-500 text-sm mt-1">{curation.stations.length} stations</p>
        </div>
        <button
          className="btn p-3 rounded-full ml-auto cursor-pointer"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            openContextMenu({
              x: e.clientX,
              y: e.clientY,
              items: [
                {
                  text: 'Edit',
                  onClick: () => openEditCurationModal(curation.id),
                  Icon() {
                    return <PencilLine className="size-4" />
                  }
                },
                {
                  text: 'Delete',
                  onClick: () => openDeleteCurationModal(curation.id),
                  Icon() {
                    return <Trash className="size-4" />
                  }
                }
              ],
              onClose: () => {}
            })
          }}
        >
          <EllipsisVertical className="size-5" />
        </button>
      </div>

      <StationListHeader fields={{ artwork: true }} />
      <div className="overflow-y-auto flex flex-col pb-35">
        {curation.stations.map((station, i) => (
          <StationRow
            key={station.id}
            station={station}
            i={i}
            fields={{
              artwork: true
            }}
          />
        ))}
      </div>
    </div>
  )
}
