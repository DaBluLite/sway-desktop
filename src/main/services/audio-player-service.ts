import { app, BrowserWindow } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import { Station } from 'radio-browser-api'
import NodeMPV from 'node-mpv'
import {
  AudioPlayerState,
  AudioPlayerCommandResult,
  PersistedAudioState,
  RendererAudioEvent,
  AudioPlayerStateChanged,
  IAudioPlayerService,
  DEFAULT_AUDIO_STATE,
  DEFAULT_RETRY_CONFIG,
  RetryConfig,
  AudioPlayerError,
  AudioPlayerChannels
} from '../../types/audio-player'

export class AudioPlayerService implements IAudioPlayerService {
  private state: AudioPlayerState = { ...DEFAULT_AUDIO_STATE }
  private registeredWindows = new Set<number>()
  private retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
  private retryTimeouts = new Map<Station, NodeJS.Timeout>()
  private retryCounters = new Map<Station, number>()
  private persistenceFilePath: string
  private mpvPlayer: typeof NodeMPV = null
  private isInitializing = false

  constructor() {
    // Initialize persistence file path
    const userDataPath = app.getPath('userData')
    this.persistenceFilePath = path.join(userDataPath, 'audio-player-state.json')

    console.log('Native audio player service initialized (node-mpv)')

    // Initialize MPV player
    this.initializeMPV()

    // Load persisted state on startup
    this.loadState().catch((error) => {
      console.error('Failed to load audio player state:', error)
    })
  }

  private async initializeMPV(): Promise<void> {
    if (this.isInitializing || this.mpvPlayer) return

    this.isInitializing = true

    try {
      console.log('Initializing node-mpv player...')

      // Create MPV instance with audio-only configuration
      this.mpvPlayer = new NodeMPV({
        audio_only: true,
        socket: '/tmp/sway-desktop-mpv-socket',
        debug: false,
        verbose: false
      })

      // Set up event listeners
      this.setupMPVEventListeners()

      console.log('Node-MPV player initialized successfully')
    } catch (error) {
      console.error('Failed to initialize node-mpv player:', error)
      this.mpvPlayer = null
    } finally {
      this.isInitializing = false
    }
  }

  private setupMPVEventListeners(): void {
    if (!this.mpvPlayer) return

    // Playback started
    this.mpvPlayer.on('started', () => {
      console.log('MPV: Playback started')
      this.setState(
        {
          isPlaying: true,
          isLoading: false,
          error: null
        },
        'renderer-event'
      )

      // Reset retry counter on successful play
      if (this.state.currentStation) {
        this.retryCounters.delete(this.state.currentStation)
      }
    })

    // Playback paused
    this.mpvPlayer.on('paused', () => {
      console.log('MPV: Playback paused')
      this.setState(
        {
          isPlaying: false,
          isLoading: false
        },
        'renderer-event'
      )
    })

    // Playback resumed
    this.mpvPlayer.on('resumed', () => {
      console.log('MPV: Playback resumed')
      this.setState(
        {
          isPlaying: true,
          isLoading: false
        },
        'renderer-event'
      )
    })

    // Playback stopped
    this.mpvPlayer.on('stopped', () => {
      console.log('MPV: Playback stopped')
      this.setState(
        {
          isPlaying: false,
          isLoading: false
        },
        'renderer-event'
      )
    })

    // Status change events
    this.mpvPlayer.on('status', (status: { pause?: boolean }) => {
      console.log('MPV status update:', status)

      // Update playing state based on pause property
      if (typeof status.pause === 'boolean') {
        this.setState(
          {
            isPlaying: !status.pause,
            isLoading: false
          },
          'renderer-event'
        )
      }
    })

    // Error events
    this.mpvPlayer.on('crashed', () => {
      console.error('MPV: Player crashed')
      this.handlePlaybackError('MPV player crashed')
    })
  }

  // State management
  getState(): AudioPlayerState {
    return { ...this.state }
  }

  private setState(
    updates: Partial<AudioPlayerState>,
    source: AudioPlayerStateChanged['source'] = 'command'
  ): void {
    const previousState = { ...this.state }
    this.state = { ...this.state, ...updates }

    // Broadcast state change to all registered windows
    this.broadcastStateChange(source)

    // Persist relevant changes
    if (this.shouldPersistStateChange(previousState, this.state)) {
      this.saveState().catch((error) => {
        console.error('Failed to persist audio player state:', error)
      })
    }
  }

  private shouldPersistStateChange(previous: AudioPlayerState, current: AudioPlayerState): boolean {
    return (
      previous.currentStation?.id !== current.currentStation?.id ||
      previous.volume !== current.volume ||
      previous.isMuted !== current.isMuted
    )
  }

  private broadcastStateChange(source: AudioPlayerStateChanged['source']): void {
    const event: AudioPlayerStateChanged = {
      state: this.getState(),
      source
    }

    this.registeredWindows.forEach((windowId) => {
      const window = BrowserWindow.fromId(windowId)
      if (window && !window.isDestroyed()) {
        window.webContents.send(AudioPlayerChannels.STATE_CHANGED, event)
      } else {
        // Clean up destroyed windows
        this.registeredWindows.delete(windowId)
      }
    })
  }

  // Playback controls using node-mpv with full volume and equalizer support
  async playStation(station: Station): Promise<AudioPlayerCommandResult> {
    try {
      // Ensure MPV is initialized
      if (!this.mpvPlayer && !this.isInitializing) {
        await this.initializeMPV()
      }

      if (!this.mpvPlayer) {
        throw new AudioPlayerError('MPV player not available', 'PLAYBACK_FAILED', station)
      }

      // Clear any existing retry for previous station
      this.clearRetryTimeout()
      this.retryCounters.delete(station)

      // Validate station
      if (!station.urlResolved && !station.url) {
        throw new AudioPlayerError('Station has no playable URL', 'INVALID_URL', station)
      }

      const streamUrl = station.urlResolved || station.url

      console.log(`Playing station with MPV: ${station.name} (${streamUrl})`)

      // Update state to loading
      this.setState({
        currentStation: station,
        isLoading: true,
        error: null
      })

      // Load the stream using load for URLs
      await this.mpvPlayer.load(streamUrl, 'replace')

      // Apply current volume
      const volumeLevel = this.state.isMuted ? 0 : Math.round(this.state.volume * 100)
      await this.mpvPlayer.volume(volumeLevel)

      // Start playback
      await this.mpvPlayer.play()

      console.log(`MPV: Stream loaded, volume set to ${volumeLevel}%, playback started`)

      return {
        success: true,
        state: this.getState()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to play station'
      const audioError =
        error instanceof AudioPlayerError
          ? error
          : new AudioPlayerError(errorMessage, 'PLAYBACK_FAILED', station)

      this.setState(
        {
          error: audioError.message,
          isLoading: false,
          isPlaying: false
        },
        'error'
      )

      return {
        success: false,
        error: audioError.message,
        state: this.getState()
      }
    }
  }

  async pause(): Promise<AudioPlayerCommandResult> {
    try {
      if (this.mpvPlayer) {
        await this.mpvPlayer.pause()
      }

      this.setState({
        isPlaying: false,
        isLoading: false
      })

      return {
        success: true,
        state: this.getState()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to pause'
      return {
        success: false,
        error: errorMessage,
        state: this.getState()
      }
    }
  }

  async stop(): Promise<AudioPlayerCommandResult> {
    try {
      // Clear any pending retries
      this.clearRetryTimeout()

      if (this.mpvPlayer) {
        await this.mpvPlayer.stop()
      }

      this.setState({
        isPlaying: false,
        isLoading: false,
        currentStation: null,
        error: null
      })

      return {
        success: true,
        state: this.getState()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to stop'
      return {
        success: false,
        error: errorMessage,
        state: this.getState()
      }
    }
  }

  async setVolume(volume: number): Promise<AudioPlayerCommandResult> {
    try {
      // Validate volume range
      const clampedVolume = Math.max(0, Math.min(1, volume))
      const volumeLevel = Math.round(clampedVolume * 100)

      // Apply volume to MPV player
      if (this.mpvPlayer) {
        await this.mpvPlayer.volume(volumeLevel)
        console.log(`MPV: Volume set to ${volumeLevel}%`)
      }

      this.setState({
        volume: clampedVolume,
        isMuted: clampedVolume === 0 ? true : this.state.isMuted
      })

      return {
        success: true,
        state: this.getState()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to set volume'
      return {
        success: false,
        error: errorMessage,
        state: this.getState()
      }
    }
  }

  async toggleMute(): Promise<AudioPlayerCommandResult> {
    try {
      const newMutedState = !this.state.isMuted

      // Apply mute to MPV player
      if (this.mpvPlayer) {
        if (newMutedState) {
          await this.mpvPlayer.mute()
          console.log('MPV: Audio muted')
        } else {
          await this.mpvPlayer.unmute()
          console.log('MPV: Audio unmuted')
        }
      }

      this.setState({
        isMuted: newMutedState
      })

      return {
        success: true,
        state: this.getState()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to toggle mute'
      return {
        success: false,
        error: errorMessage,
        state: this.getState()
      }
    }
  }

  // Equalizer support - can be called from renderer via IPC if needed
  async setEqualizer(frequencies: { [freq: string]: number }): Promise<void> {
    try {
      if (!this.mpvPlayer) return

      // Build equalizer filter string for MPV
      // Example: equalizer=f=60:t=o:w=2:g=4
      const eqFilters: string[] = []

      for (const [freq, gain] of Object.entries(frequencies)) {
        if (gain !== 0) {
          eqFilters.push(`equalizer=f=${freq}:t=o:w=2:g=${gain}`)
        }
      }

      if (eqFilters.length > 0) {
        const filterChain = `lavfi=[${eqFilters.join(',')}]`
        await this.mpvPlayer.setProperty('af', filterChain)
        console.log(`MPV: Equalizer applied: ${filterChain}`)
      } else {
        // Clear equalizer
        await this.mpvPlayer.setProperty('af', '')
        console.log('MPV: Equalizer cleared')
      }
    } catch (error) {
      console.error('Failed to set equalizer:', error)
    }
  }

  // Recording support
  private getRecordingOutputPath(station: Station): string {
    const recordingsDir = path.join(os.homedir(), 'Sway Recordings')
    const sanitizedName = station.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
    const fileName = `${sanitizedName}.mp3`
    return path.join(recordingsDir, fileName)
  }

  async startRecording(station: Station): Promise<AudioPlayerCommandResult> {
    try {
      if (!this.mpvPlayer) {
        throw new Error('MPV player not available')
      }

      if (!this.state.isPlaying) {
        throw new Error('Cannot start recording - nothing is playing')
      }

      // Generate output path based on platform and station
      const outputPath = this.getRecordingOutputPath(station)
      const recordingsDir = path.dirname(outputPath)

      // Ensure recordings directory exists
      try {
        await fs.mkdir(recordingsDir, { recursive: true })
      } catch (error) {
        console.warn('Failed to create recordings directory:', error)
      }

      await this.mpvPlayer.setProperty('stream-record', outputPath)
      console.log(`MPV: Recording started to ${outputPath}`)

      return {
        success: true,
        state: this.getState()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording'
      return {
        success: false,
        error: errorMessage,
        state: this.getState()
      }
    }
  }

  async stopRecording(): Promise<AudioPlayerCommandResult> {
    try {
      if (!this.mpvPlayer) {
        throw new Error('MPV player not available')
      }

      await this.mpvPlayer.setProperty('stream-record', '')
      console.log('MPV: Recording stopped')

      return {
        success: true,
        state: this.getState()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to stop recording'
      return {
        success: false,
        error: errorMessage,
        state: this.getState()
      }
    }
  }

  // Window management
  registerWindow(windowId: number): void {
    this.registeredWindows.add(windowId)
    console.log(
      `Audio player: Registered window ${windowId}. Total windows: ${this.registeredWindows.size}`
    )
  }

  unregisterWindow(windowId: number): void {
    this.registeredWindows.delete(windowId)
    console.log(
      `Audio player: Unregistered window ${windowId}. Total windows: ${this.registeredWindows.size}`
    )
  }

  // Event handling from renderer (now mostly for UI feedback)
  handleRendererEvent(event: RendererAudioEvent): void {
    try {
      // With MPV handling audio, renderer events are mainly for UI feedback
      // Most playback events are now handled by MPV event listeners
      switch (event.type) {
        case 'error':
          // Renderer-side errors (like network issues during UI operations)
          console.warn('Renderer reported error:', event.error)
          if (this.state.currentStation) {
            this.handlePlaybackError(event.error || 'Renderer error occurred')
          }
          break

        default:
          console.log(`Audio player: Renderer event: ${event.type} (handled by MPV)`)
      }
    } catch (error) {
      console.error('Failed to handle renderer event:', error)
    }
  }

  private handlePlaybackError(errorMessage: string): void {
    const currentStation = this.state.currentStation
    if (!currentStation) {
      this.setState(
        {
          error: errorMessage,
          isPlaying: false,
          isLoading: false
        },
        'error'
      )
      return
    }

    // Check if we should retry
    const retryCount = this.retryCounters.get(currentStation) || 0
    if (retryCount < this.retryConfig.maxRetries) {
      this.scheduleRetry(currentStation, retryCount + 1, errorMessage)
    } else {
      // Max retries reached
      this.setState(
        {
          error: `Failed to play station after ${this.retryConfig.maxRetries} attempts: ${errorMessage}`,
          isPlaying: false,
          isLoading: false
        },
        'error'
      )
      this.retryCounters.delete(currentStation)
    }
  }

  private scheduleRetry(station: Station, attemptNumber: number, lastError: string): void {
    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, attemptNumber - 1),
      this.retryConfig.maxDelay
    )

    console.log(
      `Audio player: Scheduling retry ${attemptNumber}/${this.retryConfig.maxRetries} for station "${station.name}" in ${delay}ms`
    )

    // Update state to show we're retrying
    this.setState(
      {
        error: `Retrying... (attempt ${attemptNumber}/${this.retryConfig.maxRetries}): ${lastError}`,
        isLoading: true
      },
      'retry'
    )

    // Store retry count
    this.retryCounters.set(station, attemptNumber)

    // Clear any existing timeout
    this.clearRetryTimeout()

    // Schedule the retry
    const timeout = setTimeout(async () => {
      try {
        console.log(`Retrying playback for station: ${station.name}`)
        await this.playStation(station)
      } catch (error) {
        console.error('Retry attempt failed:', error)
        this.handlePlaybackError(
          'Retry attempt failed: ' + (error instanceof Error ? error.message : 'Unknown error')
        )
      }
    }, delay)

    this.retryTimeouts.set(station, timeout)
  }

  private clearRetryTimeout(): void {
    this.retryTimeouts.forEach((timeout) => {
      clearTimeout(timeout)
    })
    this.retryTimeouts.clear()
  }

  // Persistence
  async saveState(): Promise<void> {
    try {
      const persistedState: PersistedAudioState = {
        currentStation: this.state.currentStation,
        volume: this.state.volume,
        isMuted: this.state.isMuted
      }

      await fs.writeFile(this.persistenceFilePath, JSON.stringify(persistedState, null, 2), 'utf-8')
    } catch (error) {
      console.error('Failed to save audio player state:', error)
      throw error
    }
  }

  async loadState(): Promise<void> {
    try {
      const data = await fs.readFile(this.persistenceFilePath, 'utf-8')
      const persistedState: PersistedAudioState = JSON.parse(data)

      // Restore persisted state, but keep dynamic state as defaults
      this.state = {
        ...DEFAULT_AUDIO_STATE,
        currentStation: persistedState.currentStation,
        volume: persistedState.volume ?? DEFAULT_AUDIO_STATE.volume,
        isMuted: persistedState.isMuted ?? DEFAULT_AUDIO_STATE.isMuted
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist yet, use defaults
        console.log('No persisted audio player state found, using defaults')
      } else {
        console.error('Failed to load audio player state:', error)
        // Don't throw, just use defaults
      }
    }
  }

  // Cleanup method
  dispose(): void {
    console.log('Disposing native audio player service...')

    // Clear timeouts and counters
    this.clearRetryTimeout()
    this.registeredWindows.clear()
    this.retryCounters.clear()

    // Stop and quit MPV player
    if (this.mpvPlayer) {
      try {
        this.mpvPlayer.quit()
        console.log('Node-MPV player terminated')
      } catch (error) {
        console.error('Error terminating node-mpv player:', error)
      } finally {
        this.mpvPlayer = null
      }
    }
  }
}
