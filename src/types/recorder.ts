import { Station } from 'radio-browser-api'
import NodeMPV from 'node-mpv'

// Recorder Instance (internal to main process)
export interface RecorderInstance {
  id: string
  station: Station
  state: RecorderStateType
  startTime: number
  endTime?: number
  outputPath: string
  mpvPlayer: typeof NodeMPV
  duration?: number
  error?: string
}

// Recorder State (exposed to renderer)
export interface RecorderState {
  id: string
  station: Station
  state: RecorderStateType
  startTime: number
  endTime?: number
  outputPath: string
  duration?: number
  elapsed: number
  error?: string
}

export type RecorderStateType = 'initializing' | 'recording' | 'stopped' | 'error'

// IPC Command Types
export interface StartRecordingCommand {
  station: Station
  duration?: number
}

export interface StopRecordingCommand {
  recorderId: string
}

// IPC Response Types
export interface RecorderCommandResult {
  success: boolean
  error?: string
  recorderId?: string
  recorder?: RecorderState
}

// State change event payload
export interface RecorderStateChanged {
  recorderId: string
  recorder: RecorderState
}

// IPC Channel Names (for type safety)
export const RecorderChannels = {
  // Commands (bidirectional - renderer -> main -> response)
  START_RECORDING: 'recorder:start-recording',
  STOP_RECORDING: 'recorder:stop-recording',
  STOP_ALL_RECORDINGS: 'recorder:stop-all-recordings',
  GET_ACTIVE_RECORDINGS: 'recorder:get-active-recordings',
  GET_RECORDING: 'recorder:get-recording',

  // Events (one-way - main -> renderer)
  STATE_CHANGED: 'recorder:state-changed'
} as const

// Type for IPC channel names
export type RecorderChannel = (typeof RecorderChannels)[keyof typeof RecorderChannels]

// Service interface (for main process)
export interface IRecorderService {
  // Recording controls
  startRecording(station: Station, duration?: number): Promise<RecorderCommandResult>
  stopRecording(recorderId: string): Promise<RecorderCommandResult>
  stopAllRecordings(): Promise<RecorderCommandResult[]>

  // State management
  getActiveRecordings(): RecorderState[]
  getRecording(recorderId: string): RecorderState | null

  // Window management
  registerWindow(windowId: number): void
  unregisterWindow(windowId: number): void

  // Cleanup
  dispose(): void
}

// Preload API interface (exposed to renderer)
export interface RecorderAPI {
  // Commands
  startRecording(station: Station, duration?: number): Promise<RecorderCommandResult>
  stopRecording(recorderId: string): Promise<RecorderCommandResult>
  stopAllRecordings(): Promise<RecorderCommandResult[]>
  getActiveRecordings(): Promise<RecorderState[]>
  getRecording(recorderId: string): Promise<RecorderState | null>

  // Event listeners
  onStateChanged(callback: (event: RecorderStateChanged) => void): () => void
}

// Error types
export class RecorderError extends Error {
  constructor(
    message: string,
    public code: 'NETWORK_ERROR' | 'INVALID_URL' | 'RECORDING_FAILED' | 'NOT_FOUND' | 'IPC_ERROR' | 'UNKNOWN',
    public station?: Station
  ) {
    super(message)
    this.name = 'RecorderError'
  }
}