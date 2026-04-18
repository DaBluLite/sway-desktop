import NodeMpv, { NodeMpvOptions } from 'node-mpv'

class MPV extends NodeMpv {
  constructor(options?: NodeMpvOptions) {
    super(options)
  }

  onTimePositionChange(callback: (position: number) => void) {
    return this.on('timeposition', callback)
  }

  onDurationChange(callback: (duration: number) => void) {
    return this.on('status', (status) => {
      if (status.property === 'duration' && status.value) {
        callback(Number(status.value))
      }
    })
  }
}

export default MPV
