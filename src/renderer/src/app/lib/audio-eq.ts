export interface EQBand {
  frequency: number
  gain: number
  type: BiquadFilterType
}

export interface EQPreset {
  name: string
  bands: number[]
}

export const EQ_FREQUENCIES = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000]

export const EQ_PRESETS: EQPreset[] = [
  { name: 'Flat', bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: 'Bass Boost', bands: [6, 5, 4, 2, 0, 0, 0, 0, 0, 0] },
  { name: 'Treble Boost', bands: [0, 0, 0, 0, 0, 2, 4, 5, 6, 6] },
  { name: 'Vocal', bands: [-2, -1, 0, 2, 4, 4, 3, 1, 0, -1] },
  { name: 'Rock', bands: [5, 4, 3, 1, -1, -1, 1, 3, 4, 5] },
  { name: 'Pop', bands: [-1, 1, 3, 4, 3, 1, -1, -1, 1, 2] },
  { name: 'Jazz', bands: [3, 2, 1, 2, -1, -1, 0, 1, 2, 3] },
  { name: 'Classical', bands: [4, 3, 2, 1, -1, -1, 0, 2, 3, 4] },
  { name: 'Electronic', bands: [4, 3, 1, 0, -1, 2, 1, 2, 4, 5] },
  { name: 'Hip-Hop', bands: [5, 4, 1, 3, -1, -1, 1, 0, 2, 3] }
]

export class AudioEqualizer {
  private audioContext: AudioContext | null = null
  private sourceNode: MediaElementAudioSourceNode | null = null
  private filters: BiquadFilterNode[] = []
  private gainNode: GainNode | null = null
  private isConnected = false
  private audioElement: HTMLAudioElement | null = null

  constructor() {}

  connect(audioElement: HTMLAudioElement): boolean {
    if (this.isConnected && this.audioElement === audioElement) {
      return true
    }

    // Disconnect existing connection first
    if (this.isConnected) {
      this.disconnect()
    }

    try {
      // Create audio context
      this.audioContext = new AudioContext()

      // Create source from audio element
      this.sourceNode = this.audioContext.createMediaElementSource(audioElement)
      this.audioElement = audioElement

      // Create filters for each frequency band
      this.filters = EQ_FREQUENCIES.map((frequency, index) => {
        const filter = this.audioContext!.createBiquadFilter()
        filter.type =
          index === 0 ? 'lowshelf' : index === EQ_FREQUENCIES.length - 1 ? 'highshelf' : 'peaking'
        filter.frequency.value = frequency
        filter.gain.value = 0
        filter.Q.value = 1
        return filter
      })

      // Create gain node
      this.gainNode = this.audioContext.createGain()
      this.gainNode.gain.value = 1

      // Connect the chain: source -> filters -> gain -> destination
      let lastNode: AudioNode = this.sourceNode
      for (const filter of this.filters) {
        lastNode.connect(filter)
        lastNode = filter
      }
      lastNode.connect(this.gainNode)
      this.gainNode.connect(this.audioContext.destination)

      this.isConnected = true
      return true
    } catch (error) {
      console.error('Failed to initialize equalizer:', error)
      return false
    }
  }

  disconnect(): void {
    try {
      if (this.sourceNode) {
        this.sourceNode.disconnect()
      }
      this.filters.forEach((filter) => filter.disconnect())
      if (this.gainNode) {
        this.gainNode.disconnect()
      }
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close()
      }
    } catch (error) {
      console.error('Error disconnecting equalizer:', error)
    }

    this.audioContext = null
    this.sourceNode = null
    this.filters = []
    this.gainNode = null
    this.isConnected = false
    this.audioElement = null
  }

  setBandGain(bandIndex: number, gain: number): void {
    if (bandIndex >= 0 && bandIndex < this.filters.length) {
      this.filters[bandIndex].gain.value = gain
    }
  }

  setAllBands(gains: number[]): void {
    gains.forEach((gain, index) => {
      if (index < this.filters.length) {
        this.filters[index].gain.value = gain
      }
    })
  }

  applyPreset(preset: EQPreset): void {
    this.setAllBands(preset.bands)
  }

  getAllBands(): number[] {
    return this.filters.map((filter) => filter.gain.value)
  }

  // Get the output node for tapping into the audio chain (e.g., for recording)
  getOutputNode(): AudioNode | null {
    return this.gainNode
  }

  // Get the audio context
  getAudioContext(): AudioContext | null {
    return this.audioContext
  }

  // Check if equalizer is connected
  getIsConnected(): boolean {
    return this.isConnected
  }

  setPreamp(gain: number): void {
    if (this.gainNode) {
      // Convert dB to linear gain
      this.gainNode.gain.value = Math.pow(10, gain / 20)
    }
  }

  resume(): void {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume()
    }
  }

  get isActive(): boolean {
    return this.isConnected
  }

  get context(): AudioContext | null {
    return this.audioContext
  }
}

// Singleton instance
export const audioEqualizer = new AudioEqualizer()
