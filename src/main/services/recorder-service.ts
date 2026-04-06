import { BrowserWindow } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import { Station } from 'radio-browser-api'
import NodeMPV from 'node-mpv'
import {
  RecorderInstance,
  RecorderState,
  RecorderCommandResult,
  RecorderChannels,
  RecorderError,
  IRecorderService
} from '../../types/recorder'

export class RecorderService implements IRecorderService {
  private recorders = new Map<string, RecorderInstance>()
  private registeredWindows = new Set<number>()
  private recordingDirectory: string

  constructor() {
    // Initialize recordings directory
    this.recordingDirectory = path.join(os.homedir(), 'Sway Recordings')
    // Note: We ensure directory exists in startRecording() since constructor can't be async
    console.log('Recorder service initialized')
  }

  private async ensureRecordingDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.recordingDirectory, { recursive: true })
      console.log(`Recording directory ensured: ${this.recordingDirectory}`)
    } catch (error) {
      console.error('Failed to create recording directory:', error)
    }
  }

  private generateRecorderId(): string {
    return `recorder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getRecordingOutputPath(station: Station, recorderId: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const sanitizedName = station.name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').toLowerCase()
    const fileName = `${sanitizedName}_${timestamp}_${recorderId}.mp3`
    return path.join(this.recordingDirectory, fileName)
  }

  async startRecording(station: Station, duration?: number): Promise<RecorderCommandResult> {
    try {
      // Validate station
      if (!station.urlResolved && !station.url) {
        throw new RecorderError('Station has no playable URL', 'INVALID_URL', station)
      }

      const streamUrl = station.urlResolved || station.url
      const recorderId = this.generateRecorderId()
      const outputPath = this.getRecordingOutputPath(station, recorderId)

      console.log(`Starting recording: ${station.name} -> ${outputPath}`)

      // Ensure recording directory exists
      await this.ensureRecordingDirectory()

      // Create MPV instance for recording (audio-only, muted)
      const mpvPlayer = new NodeMPV({
        audio_only: true,
        socket: path.join(os.tmpdir(), `sway-desktop-recorder-${recorderId}`),
        debug: false,
        verbose: false
      })

      // Set up the recorder instance
      const recorder: RecorderInstance = {
        id: recorderId,
        station,
        state: 'initializing',
        startTime: Date.now(),
        outputPath,
        mpvPlayer,
        duration
      }

      this.recorders.set(recorderId, recorder)

      // Set up event listeners for this recorder
      this.setupRecorderEventListeners(recorder)

      // Load the stream
      await mpvPlayer.load(streamUrl, 'replace')

      // Set volume to 0 (muted recording)
      await mpvPlayer.volume(0)

      // Start recording immediately
      await mpvPlayer.setProperty('stream-record', outputPath)
      console.log(`MPV: Recording property set to: ${outputPath}`)

      // Start playback (required for recording)
      await mpvPlayer.play()
      console.log(`MPV: Playback started for recording ${recorderId}`)

      // Update recorder state
      recorder.state = 'recording'
      this.broadcastRecorderStateChange(recorder)

      // Set up automatic stop if duration is specified
      if (duration && duration > 0) {
        console.log(`Setting auto-stop timer for ${duration}ms (${Math.round(duration / 60000)} minutes)`)
        setTimeout(async () => {
          try {
            console.log(`Auto-stopping recording ${recorderId}`)
            await this.stopRecording(recorderId)
          } catch (error) {
            console.error(`Failed to auto-stop recording ${recorderId}:`, error)
          }
        }, duration)
      }

      console.log(`Recording started: ${recorderId} for station "${station.name}"`)
      console.log(`Output path: ${outputPath}`)
      console.log(`Stream URL: ${streamUrl}`)
      console.log(`Duration: ${duration ? `${Math.round(duration / 60000)} minutes` : 'unlimited'}`)

      return {
        success: true,
        recorderId,
        recorder: this.getRecorderInfo(recorder)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording'
      const recorderError = error instanceof RecorderError
        ? error
        : new RecorderError(errorMessage, 'RECORDING_FAILED', station)

      console.error('Failed to start recording:', recorderError)

      return {
        success: false,
        error: recorderError.message
      }
    }
  }

  async stopRecording(recorderId: string): Promise<RecorderCommandResult> {
    try {
      const recorder = this.recorders.get(recorderId)
      if (!recorder) {
        throw new RecorderError(`Recording not found: ${recorderId}`, 'NOT_FOUND')
      }

      console.log(`Stopping recording: ${recorderId}`)

      // Stop recording
      await recorder.mpvPlayer.setProperty('stream-record', '')

      // Stop and quit the MPV player
      await recorder.mpvPlayer.stop()
      await recorder.mpvPlayer.quit()

      // Update recorder state
      recorder.state = 'stopped'
      recorder.endTime = Date.now()
      this.broadcastRecorderStateChange(recorder)

      // Remove from active recorders
      this.recorders.delete(recorderId)

      console.log(`Recording stopped: ${recorderId}`)

      return {
        success: true,
        recorderId,
        recorder: this.getRecorderInfo(recorder)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to stop recording'
      console.error('Failed to stop recording:', error)

      return {
        success: false,
        error: errorMessage,
        recorderId
      }
    }
  }

  async stopAllRecordings(): Promise<RecorderCommandResult[]> {
    const results: RecorderCommandResult[] = []
    const recorderIds = Array.from(this.recorders.keys())

    for (const recorderId of recorderIds) {
      const result = await this.stopRecording(recorderId)
      results.push(result)
    }

    return results
  }

  getActiveRecordings(): RecorderState[] {
    return Array.from(this.recorders.values()).map(recorder => this.getRecorderInfo(recorder))
  }

  getRecording(recorderId: string): RecorderState | null {
    const recorder = this.recorders.get(recorderId)
    return recorder ? this.getRecorderInfo(recorder) : null
  }

  private getRecorderInfo(recorder: RecorderInstance): RecorderState {
    const currentTime = Date.now()
    const elapsed = currentTime - recorder.startTime

    return {
      id: recorder.id,
      station: recorder.station,
      state: recorder.state,
      startTime: recorder.startTime,
      endTime: recorder.endTime,
      outputPath: recorder.outputPath,
      duration: recorder.duration,
      elapsed
    }
  }

  private setupRecorderEventListeners(recorder: RecorderInstance): void {
    const { mpvPlayer, id } = recorder

    mpvPlayer.on('started', () => {
      console.log(`Recorder ${id}: Playback started`)
      recorder.state = 'recording'
      this.broadcastRecorderStateChange(recorder)
    })

    mpvPlayer.on('stopped', () => {
      console.log(`Recorder ${id}: Playback stopped`)
      if (recorder.state !== 'stopped') {
        recorder.state = 'stopped'
        recorder.endTime = Date.now()
        this.broadcastRecorderStateChange(recorder)
      }
    })

    mpvPlayer.on('crashed', () => {
      console.error(`Recorder ${id}: MPV crashed`)
      recorder.state = 'error'
      recorder.error = 'MPV player crashed'
      this.broadcastRecorderStateChange(recorder)

      // Clean up crashed recorder
      this.recorders.delete(id)
    })
  }

  private broadcastRecorderStateChange(recorder: RecorderInstance): void {
    const recorderState = this.getRecorderInfo(recorder)

    this.registeredWindows.forEach((windowId) => {
      const window = BrowserWindow.fromId(windowId)
      if (window && !window.isDestroyed()) {
        window.webContents.send(RecorderChannels.STATE_CHANGED, {
          recorderId: recorder.id,
          recorder: recorderState
        })
      } else {
        // Clean up destroyed windows
        this.registeredWindows.delete(windowId)
      }
    })
  }

  // Window management
  registerWindow(windowId: number): void {
    this.registeredWindows.add(windowId)
    console.log(
      `Recorder service: Registered window ${windowId}. Total windows: ${this.registeredWindows.size}`
    )
  }

  unregisterWindow(windowId: number): void {
    this.registeredWindows.delete(windowId)
    console.log(
      `Recorder service: Unregistered window ${windowId}. Total windows: ${this.registeredWindows.size}`
    )
  }

  // Cleanup method
  dispose(): void {
    console.log('Disposing recorder service...')

    // Stop all active recordings
    const stopPromises = Array.from(this.recorders.keys()).map(recorderId =>
      this.stopRecording(recorderId).catch(error =>
        console.error(`Error stopping recording ${recorderId} during cleanup:`, error)
      )
    )

    // Wait for all recordings to stop (with timeout)
    Promise.allSettled(stopPromises).then(() => {
      this.recorders.clear()
      this.registeredWindows.clear()
      console.log('Recorder service disposed')
    })
  }
}