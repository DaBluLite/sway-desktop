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
import { SubsonicSong } from '../../types/subsonic'
import { unlink } from 'fs/promises'

export class AudioPlayerService implements IAudioPlayerService {
  private state: AudioPlayerState = { ...DEFAULT_AUDIO_STATE }
  private registeredWindows = new Set<number>()
  private retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
  private retryTimeouts = new Map<Station | SubsonicSong, NodeJS.Timeout>()
  private retryCounters = new Map<Station | SubsonicSong, number>()
  private persistenceFilePath: string
  private mpvPlayer: NodeMPV | null = null
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
      try {
        await unlink('/tmp/sway-desktop-mpv-socket')
      } catch {
        // doesn't exist, that's fine
      }
      this.mpvPlayer = new NodeMPV({
        audio_only: true,
        socket: '/tmp/sway-desktop-mpv-socket',
        debug: false,
        time_update: 1,
        verbose: false
      })

      await this.mpvPlayer.start()

      // Set up event listeners
      this.setupMPVEventListeners()

      // Apply initial audio settings
      await this.applyAudioSettings()

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

    this.mpvPlayer.on('status', (status) => {
      if (status['duration'] !== undefined) {
        this.setState({ duration: status['duration'] }, 'renderer-event')
      }
    })

    // Progress tracking via observed properties
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.mpvPlayer.on('timeposition', (time: any) => {
      this.setState({ currentTime: time }, 'renderer-event')
    })

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
      if (this.state.currentSong) {
        this.retryCounters.delete(this.state.currentSong)
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

    // End of file reached
    this.mpvPlayer.on('ended', () => {
      console.log('MPV: Playback ended (EOF)')
      this.setState(
        {
          isPlaying: false,
          isLoading: false
        },
        'ended'
      )
    })

    // Error events
    this.mpvPlayer.on('crashed', () => {
      console.error('MPV: Player crashed')
      this.handlePlaybackError('MPV player crashed')
    })
  }

  private async applyAudioSettings(): Promise<void> {
    if (!this.mpvPlayer) return

    try {
      const { gaplessEnabled, exclusiveEnabled, bitPerfectEnabled, audioDevice } = this.state

      // 1. Gapless
      await this.mpvPlayer.setProperty('gapless-audio', gaplessEnabled ? 'yes' : 'no')

      // 2. Audio device
      if (audioDevice) {
        await this.mpvPlayer.setProperty('audio-device', audioDevice)
      }

      // 3. Exclusive output
      if (process.platform === 'win32') {
        await this.mpvPlayer.setProperty('audio-exclusive', exclusiveEnabled ? 'yes' : 'no')
      } else {
        // On Linux, exclusive access is achieved by using the hw: ALSA device directly.
        // If a specific hw: device is selected, that's already exclusive.
        // PipeWire/PulseAudio don't support audio-exclusive, it's a no-op or error.
      }

      // 4. Bit-perfect
      if (bitPerfectEnabled) {
        await this.mpvPlayer.setProperty('audio-resample', 'no')
        await this.mpvPlayer.setProperty('audio-pitch-correction', 'no')
        await this.mpvPlayer.setProperty('audio-channels', 'auto-safe')
        // Clear any audio filters that would cause resampling
        await this.mpvPlayer.setProperty('af', '')
        // Don't normalize or adjust volume at the software level
        await this.mpvPlayer.setProperty('replaygain', 'no')
      } else {
        await this.mpvPlayer.setProperty('audio-resample', 'yes')
        await this.mpvPlayer.setProperty('audio-pitch-correction', 'yes')
      }

      if (process.platform !== 'win32' && exclusiveEnabled && audioDevice) {
        // Promote plughw to hw for exclusive access
        const exclusiveDevice = audioDevice.replace('alsa/plughw:', 'alsa/hw:')
        await this.mpvPlayer.setProperty('audio-device', exclusiveDevice)
      }

      console.log('Audio settings applied:', {
        gaplessEnabled,
        exclusiveEnabled,
        bitPerfectEnabled,
        audioDevice
      })
    } catch (error) {
      console.error('Failed to apply audio settings:', error)
    }
  }

  async updateSettings(settings: Partial<AudioPlayerState>): Promise<AudioPlayerCommandResult> {
    this.setState(settings)
    await this.applyAudioSettings()
    return { success: true, state: this.getState() }
  }

  async getAudioDevices(): Promise<AudioDevice[]> {
    if (!this.mpvPlayer) return []
    try {
      const devices = await this.mpvPlayer.getProperty('audio-device-list')
      return (devices || []).map((d: any) => ({
        name: d.name,
        description: d.description
      }))
    } catch (error) {
      console.error('Failed to get audio devices:', error)
      return []
    }
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
      previous.currentSong?.id !== current.currentSong?.id ||
      previous.volume !== current.volume ||
      previous.isMuted !== current.isMuted ||
      previous.gaplessEnabled !== current.gaplessEnabled ||
      previous.exclusiveEnabled !== current.exclusiveEnabled ||
      previous.bitPerfectEnabled !== current.bitPerfectEnabled ||
      previous.audioDevice !== current.audioDevice
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
        currentSong: null,
        isLoading: true,
        isSeekable: false,
        error: null,
        currentTime: 0,
        duration: null
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

  async playSong(song: SubsonicSong, streamUrl: string): Promise<AudioPlayerCommandResult> {
    try {
      // Ensure MPV is initialized
      if (!this.mpvPlayer && !this.isInitializing) {
        await this.initializeMPV()
      }

      if (!this.mpvPlayer) {
        throw new AudioPlayerError('MPV player not available', 'PLAYBACK_FAILED')
      }

      // Clear any existing retry for previous item
      this.clearRetryTimeout()
      this.retryCounters.delete(song)

      console.log(`Playing song with MPV: ${song.title} (${streamUrl})`)

      // Update state to loading
      this.setState({
        currentSong: song,
        currentStation: null,
        isLoading: true,
        isSeekable: true,
        error: null,
        currentTime: 0,
        duration: song.duration || null
      })

      // Load the stream
      await this.mpvPlayer.load(streamUrl, 'replace')

      // Apply current volume
      const volumeLevel = this.state.isMuted ? 0 : Math.round(this.state.volume * 100)
      await this.mpvPlayer.volume(volumeLevel)

      // Start playback
      await this.mpvPlayer.play()

      return {
        success: true,
        state: this.getState()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to play song'
      this.setState(
        {
          error: errorMessage,
          isLoading: false,
          isPlaying: false
        },
        'error'
      )

      return {
        success: false,
        error: errorMessage,
        state: this.getState()
      }
    }
  }

  async resume(): Promise<AudioPlayerCommandResult> {
    try {
      if (this.mpvPlayer) {
        await this.mpvPlayer.play()
      }

      this.setState({
        isPlaying: true,
        isLoading: false
      })

      return {
        success: true,
        state: this.getState()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to resume'
      return {
        success: false,
        error: errorMessage,
        state: this.getState()
      }
    }
  }

  async seek(position: number): Promise<AudioPlayerCommandResult> {
    try {
      if (this.mpvPlayer) {
        await this.mpvPlayer.seek(position, 'absolute')
      }

      this.setState({
        currentTime: position
      })

      return {
        success: true,
        state: this.getState()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to seek'
      return {
        success: false,
        error: errorMessage,
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
        currentSong: null,
        error: null,
        currentTime: 0,
        duration: null
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
          await this.mpvPlayer.mute(true)
          console.log('MPV: Audio muted')
        } else {
          await this.mpvPlayer.mute(false)
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
      const persistedState: any = {
        currentStation: this.state.currentStation,
        currentSong: this.state.currentSong,
        volume: this.state.volume,
        isMuted: this.state.isMuted,
        gaplessEnabled: this.state.gaplessEnabled,
        exclusiveEnabled: this.state.exclusiveEnabled,
        bitPerfectEnabled: this.state.bitPerfectEnabled,
        audioDevice: this.state.audioDevice
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
      const persistedState: any = JSON.parse(data)

      // Restore persisted state, but keep dynamic state as defaults
      this.state = {
        ...DEFAULT_AUDIO_STATE,
        currentStation: persistedState.currentStation,
        currentSong: persistedState.currentSong,
        volume: persistedState.volume ?? DEFAULT_AUDIO_STATE.volume,
        isMuted: persistedState.isMuted ?? DEFAULT_AUDIO_STATE.isMuted,
        gaplessEnabled: persistedState.gaplessEnabled ?? DEFAULT_AUDIO_STATE.gaplessEnabled,
        exclusiveEnabled: persistedState.exclusiveEnabled ?? DEFAULT_AUDIO_STATE.exclusiveEnabled,
        bitPerfectEnabled:
          persistedState.bitPerfectEnabled ?? DEFAULT_AUDIO_STATE.bitPerfectEnabled,
        audioDevice: persistedState.audioDevice ?? DEFAULT_AUDIO_STATE.audioDevice
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
