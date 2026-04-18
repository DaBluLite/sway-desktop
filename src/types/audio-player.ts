import { Station } from 'radio-browser-api'
import { SubsonicSong } from './subsonic'

export type RepeatMode = 'off' | 'all' | 'one'

// Main Process Audio Player State
export interface AudioPlayerState {
  isPlaying: boolean
  currentStation: Station | null
  currentSong: SubsonicSong | null
  queue: SubsonicSong[]
  queueIndex: number
  repeat: RepeatMode
  volume: number
  isMuted: boolean
  isLoading: boolean
  error: string | null
  // Progress tracking for non-radio content
  currentTime: number // in seconds
  duration: number | null // in seconds, null for live streams/radio
  isSeekable: boolean // false for live radio streams
  // Audio settings
  gaplessEnabled: boolean
  exclusiveEnabled: boolean
  bitPerfectEnabled: boolean
  audioDevice: string | null
}

export interface AudioDevice {
  name: string
  description: string
  // True if this device supports exclusive/bit-perfect audio modes
  // On Linux: ALSA hw:/plughw: devices (direct hardware access)
  // On macOS: CoreAudio devices
  // On Windows: WASAPI devices
  // False for PipeWire/PulseAudio (they apply DSP at daemon level)
  supports_exclusive_audio: boolean
}

// IPC Command Types
export interface PlayStationCommand {
  station: Station
}

export interface PlaySongCommand {
  song: SubsonicSong
  streamUrl: string
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

export interface ResumeCommand {
  // No payload needed
}

export interface SeekCommand {
  position: number // in seconds
}

export interface UpdateAudioSettingsCommand {
  gaplessEnabled?: boolean
  exclusiveEnabled?: boolean
  bitPerfectEnabled?: boolean
  audioDevice?: string | null
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
  source: 'command' | 'renderer-event' | 'error' | 'retry' | 'ended'
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
  currentSong: SubsonicSong | null
  volume: number
  isMuted: boolean
  // Note: isPlaying and isLoading are intentionally not persisted
  // They should start as false on app restart
}

// IPC Channel Names (for type safety)
export const AudioPlayerChannels = {
  // Commands (bidirectional - renderer -> main -> response)
  PLAY_STATION: 'audio-player:play-station',
  PLAY_SONG: 'audio-player:play-song',
  PLAY_SONGS: 'audio-player:play-songs',
  PAUSE: 'audio-player:pause',
  RESUME: 'audio-player:resume',
  STOP: 'audio-player:stop',
  NEXT: 'audio-player:next',
  PREVIOUS: 'audio-player:previous',
  ADD_TO_QUEUE: 'audio-player:add-to-queue',
  SET_VOLUME: 'audio-player:set-volume',
  TOGGLE_MUTE: 'audio-player:toggle-mute',
  SEEK: 'audio-player:seek',
  GET_STATE: 'audio-player:get-state',
  UPDATE_SETTINGS: 'audio-player:update-settings',
  GET_DEVICES: 'audio-player:get-devices',
  REFRESH_DEVICES: 'audio-player:refresh-devices',

  // Events (one-way - main -> renderer)
  STATE_CHANGED: 'audio-player:state-changed',
  RETRY_PLAYBACK: 'audio-player:retry-playback',
  DEVICES_CHANGED: 'audio-player:devices-changed',

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
  playSong(song: SubsonicSong, streamUrl: string): Promise<AudioPlayerCommandResult>
  playSongs(songs: SubsonicSong[], index: number): Promise<AudioPlayerCommandResult>
  pause(): Promise<AudioPlayerCommandResult>
  resume(): Promise<AudioPlayerCommandResult>
  stop(): Promise<AudioPlayerCommandResult>
  next(): Promise<AudioPlayerCommandResult>
  previous(): Promise<AudioPlayerCommandResult>
  addToQueue(songs: SubsonicSong[], position: 'next' | 'last'): Promise<AudioPlayerCommandResult>
  setVolume(volume: number): Promise<AudioPlayerCommandResult>
  toggleMute(): Promise<AudioPlayerCommandResult>
  seek(position: number): Promise<AudioPlayerCommandResult>
  updateSettings(settings: Partial<AudioPlayerState>): Promise<AudioPlayerCommandResult>
  getAudioDevices(): Promise<AudioDevice[]>
  broadcastDeviceList(): Promise<void>

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
  playSong(song: SubsonicSong, streamUrl: string): Promise<AudioPlayerCommandResult>
  playSongs(songs: SubsonicSong[], index: number): Promise<AudioPlayerCommandResult>
  pause(): Promise<AudioPlayerCommandResult>
  resume(): Promise<AudioPlayerCommandResult>
  stop(): Promise<AudioPlayerCommandResult>
  next(): Promise<AudioPlayerCommandResult>
  previous(): Promise<AudioPlayerCommandResult>
  addToQueue(songs: SubsonicSong[], position: 'next' | 'last'): Promise<AudioPlayerCommandResult>
  setVolume(volume: number): Promise<AudioPlayerCommandResult>
  toggleMute(): Promise<AudioPlayerCommandResult>
  seek(position: number): Promise<AudioPlayerCommandResult>
  updateSettings(settings: Partial<AudioPlayerState>): Promise<AudioPlayerCommandResult>
  getAudioDevices(): Promise<AudioDevice[]>
  refreshDevices(): Promise<void>
  getState(): Promise<AudioPlayerState>

  // Event listeners
  onStateChanged(callback: (event: AudioPlayerStateChanged) => void): () => void
  onDevicesChanged(callback: (devices: AudioDevice[]) => void): () => void

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
  currentSong: null,
  queue: [],
  queueIndex: -1,
  repeat: 'off',
  volume: 0.7,
  isMuted: false,
  isLoading: false,
  error: null,
  currentTime: 0,
  duration: null,
  isSeekable: false,
  gaplessEnabled: true,
  exclusiveEnabled: false,
  bitPerfectEnabled: false,
  audioDevice: null
}
