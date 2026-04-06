import { useModal } from '../contexts/modal-context'

// Import all modal components
import { KeyboardShortcutsModal } from './keyboard-shortcuts-modal'
import { SleepTimerModal } from './sleep-timer-modal'
import { ShareStationModal } from './share-station-modal'
import { AddToPlaylistModal } from './add-to-playlist-modal'
import { SimilarStationsModal } from './similar-stations-modal'
import { AlarmModal } from './alarm-modal'
import { Recorder } from './recorder'
import { ImportExportModal } from './import-export-modal'

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
        return (
          <AddToPlaylistModal key={modal.id} station={modal.props?.station} onClose={handleClose} />
        )

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

      case 'recorder':
        return <Recorder key={modal.id} onClose={handleClose} />

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
