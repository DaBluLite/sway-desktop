import { Icon } from '@mdi/react'
import { mdiClose } from '@mdi/js'
import { useCurations } from '../contexts/curations-context'
import { Trash } from 'lucide-react'
import { DeleteCurationModalProps } from '../types/modal'

export const DeleteCurationModal: React.FC<DeleteCurationModalProps> = ({
  onClose,
  collectionId
}: DeleteCurationModalProps) => {
  const { deleteCollection } = useCurations()

  const handleDelete = () => {
    deleteCollection(collectionId)

    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal max-w-md!" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-white">Delete Curation?</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 invis-btn rounded-md transition"
            aria-label="Close"
          >
            <Icon path={mdiClose} size={1} className="text-white" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          <p className="text-white">
            Are you sure you want to delete this curation? This action cannot be undone.
          </p>
        </div>
        <div className="flex gap-2 mt-auto p-4 border-t border-subtle">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 btn text-white rounded-md transition"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="flex-1 px-4 py-2 btn-danger disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition flex items-center justify-center gap-2"
          >
            <Trash className="size-4" />
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
