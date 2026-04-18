import { Station } from 'radio-browser-api'
import { SubsonicSong } from '../../../../types/subsonic'

export type ModalType =
  | 'keyboard-shortcuts'
  | 'sleep-timer'
  | 'equalizer'
  | 'settings'
  | 'share-station'
  | 'add-to-playlist'
  | 'add-to-curation'
  | 'create-curation'
  | 'edit-curation'
  | 'delete-curation'
  | 'similar-stations'
  | 'alarm'
  | 'recorder'
  | 'import-export'
  | 'edit-playlist'
  | 'delete-playlist'
  | 'create-playlist'

export interface BaseModalProps {
  onClose: () => void
}

export interface ModalConfig {
  type: ModalType
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props?: Record<string, any>
  // Optional custom state that can be passed to modals
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customState?: Record<string, any>
}

export interface ModalState extends ModalConfig {
  id: string
  isOpen: boolean
}

export interface ModalContextValue {
  // Current modal states
  modals: ModalState[]

  // Actions to control modals
  openModal: (config: ModalConfig) => string
  closeModal: (id: string) => void
  closeAllModals: () => void
  isModalOpen: (type: ModalType) => boolean
  getModalById: (id: string) => ModalState | undefined

  // Specialized helper methods for common use cases
  openShareModal: (station: Station) => string
  openPlaylistModal: (song: SubsonicSong) => string
  openCurationModal: (station: Station) => string
  openCreateCurationModal: (onCreated?: (id: string) => void) => string
  openSimilarStationsModal: (station: Station) => string
  openKeyboardShortcutsModal: () => string
  openSleepTimerModal: () => string
  openAlarmModal: () => string
  openRecorderModal: () => string
  openImportExportModal: () => string
  openEditCurationModal: (collectionId: string) => string
  openDeleteCurationModal: (collectionId: string) => string
  openEditPlaylistModal: (playlistId: string) => string
  openDeletePlaylistModal: (playlistId: string) => string
  openCreatePlaylistModal: () => string
}

// Props interfaces for specific modals
export interface ShareStationModalProps extends BaseModalProps {
  station: Station
}

export interface AddToPlaylistModalProps extends BaseModalProps {
  song: SubsonicSong
}

export interface AddToCurationModalProps extends BaseModalProps {
  station: Station
}

export interface CreateCurationModalProps extends BaseModalProps {
  onCreated?: (id: string) => void
}

export interface EditCurationModalProps extends BaseModalProps {
  collectionId: string
}

export interface DeleteCurationModalProps extends BaseModalProps {
  collectionId: string
}

export interface EditPlaylistModalProps extends BaseModalProps {
  playlistId: string
}

export interface DeletePlaylistModalProps extends BaseModalProps {
  playlistId: string
}

export interface CreatePlaylistModalProps extends BaseModalProps {}

export interface SimilarStationsModalProps extends BaseModalProps {
  station: Station
}

export interface SettingsModalProps extends BaseModalProps {
  defaultScreen?: string
}

export interface KeyboardShortcutsModalProps extends BaseModalProps {}

export interface SleepTimerModalProps extends BaseModalProps {}

export interface EqualizerModalProps extends BaseModalProps {}

export interface AlarmModalProps extends BaseModalProps {}

export interface RecorderModalProps extends BaseModalProps {}

export interface ImportExportModalProps extends BaseModalProps {}
