import { ElectronAPI } from '@electron-toolkit/preload'
import { AudioPlayerAPI } from '../types/audio-player'
import { RecorderAPI } from '../types/recorder'

interface WindowAPI {
  minimize: () => void
  toggleMaximize: () => void
  close: () => void
  hideOverlay: () => void
  showOverlay: () => void
  onOverlayHiding(callback: () => void): () => void
}

interface API {
  window: WindowAPI
  audioPlayer: AudioPlayerAPI
  recorder: RecorderAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
