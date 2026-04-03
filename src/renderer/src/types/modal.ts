import { Station } from 'radio-browser-api'

export type ModalType =
  | 'keyboard-shortcuts'
  | 'sleep-timer'
  | 'equalizer'
  | 'settings'
  | 'share-station'
  | 'add-to-playlist'
  | 'add-to-curation'
  | 'similar-stations'
  | 'alarm'
  | 'recorder'
  | 'import-export'

export interface BaseModalProps {
  onClose: () => void
}

export interface ModalConfig {
  type: ModalType
  props?: Record<string, any>
  // Optional custom state that can be passed to modals
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
  openPlaylistModal: (station: Station) => string
  openCurationModal: (station: Station) => string
  openSimilarStationsModal: (station: Station) => string
  openSettingsModal: (defaultScreen?: string) => string
  openKeyboardShortcutsModal: () => string
  openSleepTimerModal: () => string
  openEqualizerModal: () => string
  openAlarmModal: () => string
  openRecorderModal: () => string
  openImportExportModal: () => string
}

// Props interfaces for specific modals
export interface ShareStationModalProps extends BaseModalProps {
  station: Station
}

export interface AddToPlaylistModalProps extends BaseModalProps {
  station: Station
}

export interface AddToCurationModalProps extends BaseModalProps {
  station: Station
}

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
