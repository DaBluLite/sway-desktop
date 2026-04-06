import { Station } from 'radio-browser-api'

// Main Process Audio Player State
export interface AudioPlayerState {
  isPlaying: boolean
  currentStation: Station | null
  volume: number
  isMuted: boolean
  isLoading: boolean
  error: string | null
}

// IPC Command Types
export interface PlayStationCommand {
  station: Station
}

export interface SetVolumeCommand {
  volume: number
}

export interface ToggleMuteCommand {
  // No payload needed
}

export interface StopCommand {
  // No payload needed
}

export interface PauseCommand {
  // No payload needed
}

// IPC Response Types
export interface AudioPlayerCommandResult {
  success: boolean
  error?: string
  state?: AudioPlayerState
}

// State change event payload
export interface AudioPlayerStateChanged {
  state: AudioPlayerState
  source: 'command' | 'renderer-event' | 'error' | 'retry'
}

// Renderer to Main Process Events (for HTMLAudioElement event reporting)
export interface RendererAudioEvent {
  type: 'playing' | 'paused' | 'ended' | 'error' | 'loadstart' | 'canplay' | 'stalled' | 'waiting'
  error?: string
  currentTime?: number
  duration?: number
}

// Persistence State (subset of full state)
export interface PersistedAudioState {
  currentStation: Station | null
  volume: number
  isMuted: boolean
  // Note: isPlaying and isLoading are intentionally not persisted
  // They should start as false on app restart
}

// IPC Channel Names (for type safety)
export const AudioPlayerChannels = {
  // Commands (bidirectional - renderer -> main -> response)
  PLAY_STATION: 'audio-player:play-station',
  PAUSE: 'audio-player:pause',
  STOP: 'audio-player:stop',
  SET_VOLUME: 'audio-player:set-volume',
  TOGGLE_MUTE: 'audio-player:toggle-mute',
  GET_STATE: 'audio-player:get-state',

  // Events (one-way - main -> renderer)
  STATE_CHANGED: 'audio-player:state-changed',
  RETRY_PLAYBACK: 'audio-player:retry-playback',

  // Renderer Events (one-way - renderer -> main)
  RENDERER_EVENT: 'audio-player:renderer-event'
} as const

// Type for IPC channel names
export type AudioPlayerChannel = (typeof AudioPlayerChannels)[keyof typeof AudioPlayerChannels]

// Service interface (for main process)
export interface IAudioPlayerService {
  // State management
  getState(): AudioPlayerState

  // Playback controls
  playStation(station: Station): Promise<AudioPlayerCommandResult>
  pause(): Promise<AudioPlayerCommandResult>
  stop(): Promise<AudioPlayerCommandResult>
  setVolume(volume: number): Promise<AudioPlayerCommandResult>
  toggleMute(): Promise<AudioPlayerCommandResult>

  // Window management
  registerWindow(windowId: number): void
  unregisterWindow(windowId: number): void

  // Event handling
  handleRendererEvent(event: RendererAudioEvent): void

  // Recording
  startRecording(station: Station): Promise<AudioPlayerCommandResult>
  stopRecording(): Promise<AudioPlayerCommandResult>

  // Persistence
  saveState(): Promise<void>
  loadState(): Promise<void>
}

// Preload API interface (exposed to renderer)
export interface AudioPlayerAPI {
  // Commands
  playStation(station: Station): Promise<AudioPlayerCommandResult>
  pause(): Promise<AudioPlayerCommandResult>
  stop(): Promise<AudioPlayerCommandResult>
  setVolume(volume: number): Promise<AudioPlayerCommandResult>
  toggleMute(): Promise<AudioPlayerCommandResult>
  getState(): Promise<AudioPlayerState>

  // Event listeners
  onStateChanged(callback: (event: AudioPlayerStateChanged) => void): () => void

  // Renderer event reporting (mainly for UI feedback now)
  reportRendererEvent(event: RendererAudioEvent): void

  // Recording methods
  startRecording(station: Station): Promise<AudioPlayerCommandResult>
  stopRecording(): Promise<AudioPlayerCommandResult>
}

// Error types
export class AudioPlayerError extends Error {
  constructor(
    message: string,
    public code: 'NETWORK_ERROR' | 'INVALID_URL' | 'PLAYBACK_FAILED' | 'IPC_ERROR' | 'UNKNOWN',
    public station?: Station
  ) {
    super(message)
    this.name = 'AudioPlayerError'
  }
}

// Retry configuration
export interface RetryConfig {
  maxRetries: number
  baseDelay: number // milliseconds
  maxDelay: number // milliseconds
  backoffFactor: number
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2
}

// Default state
export const DEFAULT_AUDIO_STATE: AudioPlayerState = {
  isPlaying: false,
  currentStation: null,
  volume: 0.7,
  isMuted: false,
  isLoading: false,
  error: null
}
