import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { ipcRenderer } from 'electron'
import { Station } from 'radio-browser-api'
import {
  AudioPlayerState,
  AudioPlayerCommandResult,
  AudioPlayerStateChanged,
  RendererAudioEvent,
  AudioPlayerChannels
} from '../types/audio-player'
import {
  RecorderState,
  RecorderCommandResult,
  RecorderStateChanged,
  RecorderChannels
} from '../types/recorder'

// Custom APIs for renderer
const api = {
  window: {
    minimize: () => {
      ipcRenderer.send('win-minimize')
    },
    toggleMaximize: () => {
      ipcRenderer.send('win-toggle-maximize')
    },
    close: () => {
      ipcRenderer.send('win-close')
    },
    hideOverlay: () => {
      ipcRenderer.send('overlay-hide')
    },
    showOverlay: () => {
      ipcRenderer.send('overlay-show')
    },
    onOverlayHiding(callback: () => void): () => void {
      const listener = (_event: Electron.IpcRendererEvent) => {
        callback()
      }
      ipcRenderer.on('overlay-hiding', listener)

      // Return cleanup function
      return () => {
        ipcRenderer.removeListener('overlay-hiding', listener)
      }
    }
  },
  audioPlayer: {
    // Command methods (bidirectional IPC)
    async playStation(station: Station): Promise<AudioPlayerCommandResult> {
      return ipcRenderer.invoke(AudioPlayerChannels.PLAY_STATION, station)
    },

    async pause(): Promise<AudioPlayerCommandResult> {
      return ipcRenderer.invoke(AudioPlayerChannels.PAUSE)
    },

    async stop(): Promise<AudioPlayerCommandResult> {
      return ipcRenderer.invoke(AudioPlayerChannels.STOP)
    },

    async setVolume(volume: number): Promise<AudioPlayerCommandResult> {
      return ipcRenderer.invoke(AudioPlayerChannels.SET_VOLUME, volume)
    },

    async toggleMute(): Promise<AudioPlayerCommandResult> {
      return ipcRenderer.invoke(AudioPlayerChannels.TOGGLE_MUTE)
    },

    async getState(): Promise<AudioPlayerState | null> {
      return ipcRenderer.invoke(AudioPlayerChannels.GET_STATE)
    },

    // Event listeners
    onStateChanged(callback: (event: AudioPlayerStateChanged) => void): () => void {
      const listener = (_event: Electron.IpcRendererEvent, data: AudioPlayerStateChanged) => {
        callback(data)
      }
      ipcRenderer.on(AudioPlayerChannels.STATE_CHANGED, listener)

      // Return cleanup function
      return () => {
        ipcRenderer.removeListener(AudioPlayerChannels.STATE_CHANGED, listener)
      }
    },

    // Renderer event reporting (one-way to main process)
    // Note: This is mostly for UI feedback since MPV handles actual playback
    reportRendererEvent(event: RendererAudioEvent): void {
      ipcRenderer.send(AudioPlayerChannels.RENDERER_EVENT, event)
    },

    // Recording methods
    async startRecording(station: Station): Promise<AudioPlayerCommandResult> {
      return ipcRenderer.invoke('recording-start', station)
    },

    async stopRecording(): Promise<AudioPlayerCommandResult> {
      return ipcRenderer.invoke('recording-stop')
    }
  },
  recorder: {
    // Command methods (bidirectional IPC)
    async startRecording(station: Station, duration?: number): Promise<RecorderCommandResult> {
      return ipcRenderer.invoke(RecorderChannels.START_RECORDING, station, duration)
    },

    async stopRecording(recorderId: string): Promise<RecorderCommandResult> {
      return ipcRenderer.invoke(RecorderChannels.STOP_RECORDING, recorderId)
    },

    async stopAllRecordings(): Promise<RecorderCommandResult[]> {
      return ipcRenderer.invoke(RecorderChannels.STOP_ALL_RECORDINGS)
    },

    async getActiveRecordings(): Promise<RecorderState[]> {
      return ipcRenderer.invoke(RecorderChannels.GET_ACTIVE_RECORDINGS)
    },

    async getRecording(recorderId: string): Promise<RecorderState | null> {
      return ipcRenderer.invoke(RecorderChannels.GET_RECORDING, recorderId)
    },

    // Event listeners
    onStateChanged(callback: (event: RecorderStateChanged) => void): () => void {
      const listener = (_event: Electron.IpcRendererEvent, data: RecorderStateChanged) => {
        callback(data)
      }
      ipcRenderer.on(RecorderChannels.STATE_CHANGED, listener)

      // Return cleanup function
      return () => {
        ipcRenderer.removeListener(RecorderChannels.STATE_CHANGED, listener)
      }
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
