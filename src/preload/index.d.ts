import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    sway_desktop_api: {
      close: () => void
      minimize: () => void
      toggleMaximize: () => void
    }
  }
}
