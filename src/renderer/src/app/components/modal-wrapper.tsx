import { useModal } from '../contexts/modal-context'

// Import all modal components
import { KeyboardShortcutsModal } from './keyboard-shortcuts-modal'
import { SleepTimerModal } from './sleep-timer-modal'
import { ShareStationModal } from './share-station-modal'
import { AddToPlaylistModal } from './add-to-playlist-modal'
import { AddToCurationModal } from './add-to-curation-modal'
import { CreateCurationModal } from './create-curation-modal'
import { SimilarStationsModal } from './similar-stations-modal'
import { AlarmModal } from './alarm-modal'
import { ImportExportModal } from './import-export-modal'
import { DeleteCurationModal } from './delete-curation-modal'
import { EditCurationModal } from './edit-curation-modal'
import { EditPlaylistModal } from './edit-playlist-modal'
import { DeletePlaylistModal } from './delete-playlist-modal'
import { CreatePlaylistModal } from './create-playlist-modal'

const ModalWrapper: React.FC = () => {
  const { modals, closeModal } = useModal()

  // Filter only open modals
  const openModals = modals.filter((modal) => modal.isOpen)

  if (openModals.length === 0) {
    return null
  }

  const renderModal = (modal: (typeof openModals)[0]) => {
    const handleClose = () => closeModal(modal.id)

    switch (modal.type) {
      case 'keyboard-shortcuts':
        return <KeyboardShortcutsModal key={modal.id} onClose={handleClose} />

      case 'sleep-timer':
        return <SleepTimerModal key={modal.id} onClose={handleClose} />
      case 'share-station':
        return (
          <ShareStationModal key={modal.id} station={modal.props?.station} onClose={handleClose} />
        )

      case 'add-to-playlist':
        return <AddToPlaylistModal key={modal.id} song={modal.props?.song} onClose={handleClose} />

      case 'add-to-curation':
        return (
          <AddToCurationModal key={modal.id} station={modal.props?.station} onClose={handleClose} />
        )

      case 'create-curation':
        return (
          <CreateCurationModal
            key={modal.id}
            onClose={handleClose}
            onCreated={modal.props?.onCreated}
          />
        )

      case 'edit-curation':
        return (
          <EditCurationModal
            key={modal.id}
            collectionId={modal.props?.collectionId}
            onClose={handleClose}
          />
        )

      case 'delete-curation':
        return (
          <DeleteCurationModal
            key={modal.id}
            collectionId={modal.props?.collectionId}
            onClose={handleClose}
          />
        )

      case 'edit-playlist':
        return (
          <EditPlaylistModal
            key={modal.id}
            playlistId={modal.props?.playlistId}
            onClose={handleClose}
          />
        )

      case 'delete-playlist':
        return (
          <DeletePlaylistModal
            key={modal.id}
            playlistId={modal.props?.playlistId}
            onClose={handleClose}
          />
        )

      case 'create-playlist':
        return <CreatePlaylistModal key={modal.id} onClose={handleClose} />

      case 'similar-stations':
        return (
          <SimilarStationsModal
            key={modal.id}
            station={modal.props?.station}
            onClose={handleClose}
          />
        )

      case 'alarm':
        return <AlarmModal key={modal.id} onClose={handleClose} />
      case 'import-export':
        return <ImportExportModal key={modal.id} onClose={handleClose} />

      default:
        console.warn(`Unknown modal type: ${modal.type}`)
        return null
    }
  }

  return <>{openModals.map(renderModal)}</>
}

export default ModalWrapper
