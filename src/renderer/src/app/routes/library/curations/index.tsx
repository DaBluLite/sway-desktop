import { createFileRoute } from '@tanstack/react-router'
import { useCurations } from '@renderer/contexts/curations-context'
import { CurationCard } from '@renderer/components/curation-card'
import { EllipsisVertical } from 'lucide-react'
import { useContextMenu } from '@renderer/contexts/context-menu-context'
import { useModal } from '@renderer/contexts/modal-context'

export const Route = createFileRoute('/library/curations/')({
  component: RouteComponent
})

function RouteComponent() {
  const { collections } = useCurations()
  const { openContextMenu } = useContextMenu()
  const { openCreateCurationModal } = useModal()

  return (
    <div className="flex flex-col w-full h-screen">
      <div className="station-carousel-header pl-8">
        <h2 className="station-carousel-title flex gap-1 items-center">
          Curations
          <EllipsisVertical
            className="size-4 text-zinc-400 hover:text-zinc-300 cursor-pointer"
            role="button"
            onClick={(e) => {
              openContextMenu({
                x: e.clientX,
                y: e.clientY,
                onClose: () => {},
                items: [{ text: 'Create Curation', onClick: () => openCreateCurationModal() }]
              })
            }}
          />
        </h2>
      </div>
      <div className="overflow-y-auto flex flex-wrap px-12 pt-8 pb-35 gap-x-4">
        {collections?.map((curation) => (
          <CurationCard key={curation.id} curation={curation} />
        ))}
      </div>
    </div>
  )
}
