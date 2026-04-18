import { CuratedCollection } from '../contexts/curations-context'
import { StationThumbnailGrid } from './station-thumbnail-grid'
import { PencilLine, Trash } from 'lucide-react'
import { useModal } from '../contexts/modal-context'
import { useContextMenu } from '../contexts/context-menu-context'
import { useRouter } from '@tanstack/react-router'

interface CurationCardProps {
  curation: CuratedCollection
}

export const CurationCard: React.FC<CurationCardProps> = ({ curation }: CurationCardProps) => {
  const router = useRouter()
  const { openDeleteCurationModal, openEditCurationModal } = useModal()
  const { openContextMenu } = useContextMenu()

  const handleClick = () => {
    router.navigate({
      to: '/library/curations/$curationId',
      params: { curationId: curation.id }
    })
  }

  return (
    <div
      className="station-card group cursor-pointer"
      onClick={handleClick}
      onContextMenu={(e) => {
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
      <div className="station-card-image-container">
        <StationThumbnailGrid stations={curation.stations} />
      </div>
      <div className="station-card-info">
        <h3 className="station-card-title opacity-0">{curation.name}</h3>
        <p className="station-card-tags opacity-0!">
          {curation.stations.length} {curation.stations.length === 1 ? 'station' : 'stations'}
        </p>
        <div className="station-card-info-absolute">
          <h3 className="station-card-title">{curation.name}</h3>
          <p className="station-card-tags">
            {curation.stations.length} {curation.stations.length === 1 ? 'station' : 'stations'}
          </p>
        </div>
      </div>
    </div>
  )
}
