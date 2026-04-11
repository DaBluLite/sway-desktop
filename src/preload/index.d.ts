import { ElectronAPI } from '@electron-toolkit/preload'
import { SubsonicAPI } from '../types/subsonic'
import { AudioPlayerAPI } from '../types/audio-player'

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
  subsonic: SubsonicAPI
  audioPlayer: AudioPlayerAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
