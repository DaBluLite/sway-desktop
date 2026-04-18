import { app, BrowserWindow } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import { Station } from 'radio-browser-api'
import { StatusObject } from 'node-mpv'
import NodeMPV from '../../common/node-mpv'
import {
  AudioPlayerState,
  AudioPlayerCommandResult,
  RendererAudioEvent,
  AudioPlayerStateChanged,
  IAudioPlayerService,
  DEFAULT_AUDIO_STATE,
  DEFAULT_RETRY_CONFIG,
  RetryConfig,
  AudioPlayerError,
  AudioPlayerChannels,
  AudioDevice
} from '../../types/audio-player'
import { SubsonicSong, ISubsonicService } from '../../types/subsonic'
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
  private subsonicService: ISubsonicService | null = null
  // Scrobbling state
  private isFirstSongAfterAppStart = true
  private previousScrobbledSong: SubsonicSong | null = null

  constructor(subsonicService?: ISubsonicService) {
    this.subsonicService = subsonicService || null
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

    this.mpvPlayer.observeProperty('audio-device-list')
    this.mpvPlayer.observeProperty('playlist-pos')

    this.mpvPlayer.on('status', (status) => {
      if (status.property === ('audio-device-list' as StatusObject['property'])) {
        this.broadcastDeviceList()
      }
      if (status.property === 'playlist-pos') {
        const index = Number(status.value)
        if (this.state.queue && this.state.queue[index]) {
          const newSong = this.state.queue[index]
          const songChanged = this.state.currentSong?.id !== newSong.id

          this.setState(
            {
              queueIndex: index,
              currentSong: newSong,
              currentTime: 0
            },
            'renderer-event'
          )

          // Handle scrobbling when songs change in queue (next/previous/manual skip)
          if (songChanged) {
            this.handleSongScrobbling(newSong).catch((error) => {
              console.error('Failed to scrobble during queue change:', error)
            })
          }
        }
      }
    })

    this.mpvPlayer.onDurationChange((duration) => {
      this.setState({ duration }, 'renderer-event')
    })

    // Progress tracking via observed properties
    this.mpvPlayer.onTimePositionChange((time) => {
      this.setState({ currentTime: time }, 'renderer-event')
    })

    // Playback started
    this.mpvPlayer.on('started', () => {
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

    // Error events
    this.mpvPlayer.on('crashed', () => {
      console.error('MPV: Player crashed')
      this.handlePlaybackError('MPV player crashed')
    })
  }

  private async resetAudioSettings(): Promise<void> {
    if (!this.mpvPlayer) return

    // Always reset everything to safe defaults before applying new settings.
    // This ensures toggling things OFF actually removes the previous settings.
    // Wrap all property setters in try-catch since not all properties exist on all MPV builds
    try {
      await this.mpvPlayer.setProperty('audio-exclusive', 'no')
    } catch {
      // Not supported on this platform/driver — ignore
    }

    try {
      await this.mpvPlayer.setProperty('audio-resample', 'yes')
    } catch {
      // Not supported on this MPV build
    }

    try {
      await this.mpvPlayer.setProperty('audio-pitch-correction', 'yes')
    } catch {
      // Not supported on this MPV build
    }

    try {
      await this.mpvPlayer.setProperty('replaygain', 'no')
    } catch {
      // Not supported on this MPV build
    }

    try {
      await this.mpvPlayer.setProperty('audio-channels', 'auto-safe')
    } catch {
      // Not supported on this MPV build
    }

    try {
      await this.mpvPlayer.setProperty('af', '')
    } catch {
      // Not supported on this MPV build
    }

    // If the stored device has been promoted to hw: for exclusive access,
    // restore the plughw: version on reset.
    const { audioDevice } = this.state
    if (audioDevice?.startsWith('alsa/hw:')) {
      const softDevice = audioDevice.replace('alsa/hw:', 'alsa/plughw:')
      try {
        await this.mpvPlayer.setProperty('audio-device', softDevice)
        // Also update the stored state so it reflects the unpromoted device
        this.state.audioDevice = softDevice
      } catch {
        // Failed to set audio device
      }
    }
  }

  private async applyAudioSettings(): Promise<void> {
    if (!this.mpvPlayer) return

    const { gaplessEnabled, exclusiveEnabled, bitPerfectEnabled, audioDevice, repeat } = this.state

    // 1. Always reset to defaults first so toggling OFF is clean
    await this.resetAudioSettings()

    // 2. Gapless (platform-agnostic)
    try {
      await this.mpvPlayer.setProperty('gapless-audio', gaplessEnabled ? 'yes' : 'no')
    } catch {
      // Not supported on this MPV build
    }

    // 3. Repeat mode (CRITICAL - must always apply)
    try {
      if (repeat === 'one') {
        console.log('Applying repeat ONE: loop-file=inf, loop-playlist=no')
        await this.mpvPlayer.setProperty('loop-file', 'inf')
        await this.mpvPlayer.setProperty('loop-playlist', 'no')
      } else if (repeat === 'all') {
        console.log('Applying repeat ALL: loop-file=no, loop-playlist=inf')
        await this.mpvPlayer.setProperty('loop-playlist', 'inf')
        await this.mpvPlayer.setProperty('loop-file', 'no')
      } else {
        console.log('Applying repeat OFF: loop-file=no, loop-playlist=no')
        await this.mpvPlayer.setProperty('loop-file', 'no')
        await this.mpvPlayer.setProperty('loop-playlist', 'no')
      }
    } catch (error) {
      console.error('Failed to set repeat mode:', error)
    }

    // 4. Audio device (apply base device before any exclusive promotion)
    if (audioDevice) {
      try {
        await this.mpvPlayer.setProperty('audio-device', audioDevice)
      } catch {
        // Not supported on this MPV build or device doesn't exist
      }
    }

    // 5. Exclusive output — each OS has its own mechanism
    if (exclusiveEnabled) {
      if (process.platform === 'win32') {
        // WASAPI exclusive mode: bypasses the Windows audio mixer entirely
        try {
          await this.mpvPlayer.setProperty('audio-exclusive', 'yes')
        } catch {
          // Not supported
        }
      } else if (process.platform === 'linux') {
        // ALSA: promote plughw: → hw: for direct/exclusive access.
        // hw: devices don't support format conversion so mpv talks to the
        // hardware directly — no kernel mixer in the path.
        // PipeWire/PulseAudio don't support audio-exclusive; skip it there.
        if (audioDevice?.startsWith('alsa/plughw:')) {
          const hwDevice = audioDevice.replace('alsa/plughw:', 'alsa/hw:')
          try {
            await this.mpvPlayer.setProperty('audio-device', hwDevice)
            this.state.audioDevice = hwDevice
          } catch {
            // Failed to promote device
          }
        } else if (audioDevice?.startsWith('alsa/hw:')) {
          // Already a hw: device, nothing to promote
        }
        // PipeWire / PulseAudio devices: no-op, exclusive is handled at daemon level
      } else if (process.platform === 'darwin') {
        // CoreAudio: audio-exclusive requests integer mode (bypasses macOS mixer)
        try {
          await this.mpvPlayer.setProperty('audio-exclusive', 'yes')
        } catch {
          // Not supported
        }
      }
    }

    // 6. Bit-perfect — disable all DSP/resampling that would alter the signal
    if (bitPerfectEnabled) {
      // No resampling — output at the source sample rate exactly
      try {
        await this.mpvPlayer.setProperty('audio-resample', 'no')
      } catch {
        // Not supported on this MPV build
      }

      // No pitch correction (which implies resampling under the hood)
      try {
        await this.mpvPlayer.setProperty('audio-pitch-correction', 'no')
      } catch {
        // Not supported on this MPV build
      }

      // Let mpv pass through the channel layout as-is
      try {
        await this.mpvPlayer.setProperty('audio-channels', 'auto-safe')
      } catch {
        // Not supported on this MPV build
      }

      // Clear any audio filter chain that could resample or process audio
      try {
        await this.mpvPlayer.setProperty('af', '')
      } catch {
        // Not supported on this MPV build
      }

      // Disable ReplayGain volume adjustment (alters signal level)
      try {
        await this.mpvPlayer.setProperty('replaygain', 'no')
      } catch {
        // Not supported on this MPV build
      }

      if (process.platform === 'darwin') {
        // On macOS, request integer output format for true bit-perfect passthrough
        // (requires hardware support; mpv falls back silently if unsupported)
        try {
          await this.mpvPlayer.setProperty('coreaudio-exclusive', 'yes')
        } catch {
          // Older mpv builds may not have this property
        }
      }
    } else {
      // Restore normal DSP when bit-perfect is off
      try {
        await this.mpvPlayer.setProperty('audio-resample', 'yes')
      } catch {
        // Not supported on this MPV build
      }

      try {
        await this.mpvPlayer.setProperty('audio-pitch-correction', 'yes')
      } catch {
        // Not supported on this MPV build
      }

      if (process.platform === 'darwin') {
        try {
          await this.mpvPlayer.setProperty('coreaudio-exclusive', 'no')
        } catch {
          // Not supported
        }
      }
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
      const devices = (await this.mpvPlayer.getProperty('audio-device-list')) as unknown as {
        name: string
        description: string
      }[]
      return (devices || []).map((d) => ({
        name: d.name,
        description: d.description,
        // Devices that support exclusive/bit-perfect audio:
        // - ALSA hw: (direct hardware) — bit-perfect capable
        // - ALSA plughw: (can be promoted to hw:) — bit-perfect capable when promoted
        // - CoreAudio (macOS) — bit-perfect capable
        // - WASAPI (Windows) — bit-perfect capable
        // - PipeWire/PulseAudio — not supported (apply DSP/resampling at daemon level)
        supports_exclusive_audio:
          d.name.startsWith('alsa/hw:') ||
          d.name.startsWith('alsa/plughw:') ||
          d.name.startsWith('coreaudio/') ||
          d.name.startsWith('wasapi/')
      }))
    } catch (error) {
      console.error('Failed to get audio devices:', error)
      return []
    }
  }

  async broadcastDeviceList(): Promise<void> {
    const devices = await this.getAudioDevices()

    this.registeredWindows.forEach((windowId) => {
      const window = BrowserWindow.fromId(windowId)
      if (window && !window.isDestroyed()) {
        window.webContents.send(AudioPlayerChannels.DEVICES_CHANGED, devices)
      }
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

  // Scrobbling - track song playback
  private async handleSongScrobbling(newSong: SubsonicSong): Promise<void> {
    if (!this.subsonicService) return

    try {
      if (this.isFirstSongAfterAppStart) {
        // First song after app start: just notify "now playing"
        console.log(`Scrobbling now playing: ${newSong.title} (submission: false)`)
        await this.subsonicService.scrobble(newSong.id, false)
        this.isFirstSongAfterAppStart = false
        this.previousScrobbledSong = newSong
      } else {
        // Not the first song: finalize previous track, then notify new track
        if (this.previousScrobbledSong) {
          console.log(
            `Scrobbling completed: ${this.previousScrobbledSong.title} (submission: true)`
          )
          await this.subsonicService.scrobble(this.previousScrobbledSong.id, true)
        }

        // Now notify the new track
        console.log(`Scrobbling now playing: ${newSong.title} (submission: false)`)
        await this.subsonicService.scrobble(newSong.id, false)
        this.previousScrobbledSong = newSong
      }
    } catch (error) {
      console.error('Failed to scrobble song:', error)
      // Don't throw - scrobbling failure shouldn't affect playback
    }
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

      // Apply loop settings for this playback session
      await this.applyAudioSettings()

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

      // Update state to loading
      this.setState({
        currentSong: song,
        currentStation: null,
        queue: [song],
        queueIndex: 0,
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

      // Apply loop settings for this playback session
      await this.applyAudioSettings()

      // Handle scrobbling for this song
      await this.handleSongScrobbling(song)

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

  async playSongs(songs: SubsonicSong[], startIndex: number): Promise<AudioPlayerCommandResult> {
    try {
      if (!this.mpvPlayer && !this.isInitializing) {
        await this.initializeMPV()
      }

      if (!this.mpvPlayer) {
        throw new AudioPlayerError('MPV player not available', 'PLAYBACK_FAILED')
      }

      this.clearRetryTimeout()

      console.log(`Playing playlist with MPV, starting at index ${startIndex}`)

      this.setState({
        queue: songs,
        queueIndex: startIndex,
        currentSong: songs[startIndex],
        currentStation: null,
        isLoading: true,
        isSeekable: true,
        error: null,
        currentTime: 0,
        duration: songs[startIndex].duration || null
      })

      // Stop current playback to clear things out
      await this.mpvPlayer.stop()

      // We load all songs into the MPV playlist
      // This is more robust for gapless playback
      for (let i = 0; i < songs.length; i++) {
        const streamUrl = this.subsonicService?.generateStreamUrl(songs[i].id)
        if (streamUrl) {
          await this.mpvPlayer.load(streamUrl, i === 0 ? 'replace' : 'append')
        }
      }

      // Go to the desired starting song if it's not the first one
      if (startIndex > 0) {
        await this.mpvPlayer.command('playlist-play-index', [startIndex.toString()])
      }

      // Apply volume
      const volumeLevel = this.state.isMuted ? 0 : Math.round(this.state.volume * 100)
      await this.mpvPlayer.volume(volumeLevel)

      await this.mpvPlayer.play()

      // Apply loop settings for this playback session
      await this.applyAudioSettings()

      // Handle scrobbling for the starting song
      await this.handleSongScrobbling(songs[startIndex])

      return { success: true, state: this.getState() }
    } catch (error) {
      console.log(error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to play songs'
      this.setState({ error: errorMessage, isLoading: false, isPlaying: false }, 'error')
      return { success: false, error: errorMessage, state: this.getState() }
    }
  }

  async next(): Promise<AudioPlayerCommandResult> {
    try {
      if (this.mpvPlayer) {
        const hasQueue = Array.isArray(this.state.queue) && this.state.queue.length > 0
        const isLastSong = hasQueue && this.state.queueIndex === this.state.queue.length - 1

        if (isLastSong && this.state.repeat === 'all') {
          await this.mpvPlayer.command('playlist-play-index', ['0'])
        } else {
          await this.mpvPlayer.next()
        }
      }
      return { success: true, state: this.getState() }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  async previous(): Promise<AudioPlayerCommandResult> {
    try {
      if (this.mpvPlayer) {
        const isFirstSong = this.state.queueIndex === 0

        if (isFirstSong && this.state.repeat === 'all' && this.state.queue) {
          await this.mpvPlayer.command('playlist-play-index', [
            (this.state.queue.length - 1).toString()
          ])
        } else {
          await this.mpvPlayer.prev()
        }
      }
      return { success: true, state: this.getState() }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  async addToQueue(
    songs: SubsonicSong[],
    position: 'next' | 'last'
  ): Promise<AudioPlayerCommandResult> {
    try {
      if (!songs || songs.length === 0) {
        return {
          success: false,
          error: 'No songs provided to add to queue',
          state: this.getState()
        }
      }

      const currentQueue = this.state.queue || []
      let updatedQueue: SubsonicSong[]

      if (position === 'next') {
        // Insert after current song (at queueIndex + 1)
        const insertIndex = this.state.queueIndex + 1
        updatedQueue = [
          ...currentQueue.slice(0, insertIndex),
          ...songs,
          ...currentQueue.slice(insertIndex)
        ]
        console.log(
          `Adding ${songs.length} song(s) to queue at position "next" (after current song)`
        )
      } else {
        // Append to the end
        updatedQueue = [...currentQueue, ...songs]
        console.log(`Adding ${songs.length} song(s) to queue at position "last"`)
      }

      // Update app state with new queue
      this.setState({
        queue: updatedQueue
      })

      // Load new songs into MPV playlist
      if (this.mpvPlayer) {
        for (const song of songs) {
          const streamUrl = this.subsonicService?.generateStreamUrl(song.id)
          if (streamUrl) {
            // Append songs to MPV playlist
            // Note: For 'next' position, songs are appended to the end of MPV's playlist
            // The app state controls the logical order; MPV just plays them sequentially
            await this.mpvPlayer.load(streamUrl, 'append')
          }
        }
      }

      return {
        success: true,
        state: this.getState()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add to queue'
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
        } else {
          await this.mpvPlayer.mute(false)
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
      } else {
        // Clear equalizer
        await this.mpvPlayer.setProperty('af', '')
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const persistedState: any = {
        currentStation: this.state.currentStation,
        currentSong: this.state.currentSong,
        queue: this.state.queue,
        queueIndex: this.state.queueIndex,
        repeat: this.state.repeat,
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const persistedState: any = JSON.parse(data)

      // Restore persisted state, but keep dynamic state as defaults
      this.state = {
        ...DEFAULT_AUDIO_STATE,
        currentStation: persistedState.currentStation,
        currentSong: persistedState.currentSong,
        queue: persistedState.queue || [],
        queueIndex: persistedState.queueIndex ?? -1,
        repeat: persistedState.repeat ?? 'off',
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
