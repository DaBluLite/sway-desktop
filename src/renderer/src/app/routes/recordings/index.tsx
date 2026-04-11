import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Icon } from '@mdi/react'
import { mdiRecord, mdiStop, mdiRadio, mdiClockOutline, mdiInfinity, mdiRefresh } from '@mdi/js'
import { RecorderState } from '../../../../../types/recorder'

export const Route = createFileRoute('/recordings/')({
  component: ActiveRecordings
})

function ActiveRecordings() {
  const [activeRecordings, setActiveRecordings] = useState<RecorderState[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadActiveRecordings = async () => {
    try {
      const recordings = await window.api.recorder.getActiveRecordings()
      setActiveRecordings(recordings)
      setError(null)
    } catch (err) {
      console.error('Failed to load active recordings:', err)
      setError('Failed to load active recordings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Initial load
    loadActiveRecordings()

    // Listen for recorder state changes
    const unsubscribe = window.api.recorder.onStateChanged((event) => {
      console.log('Recorder state changed:', event)
      // Reload the list when any recording changes
      loadActiveRecordings()
    })

    // Auto-refresh every 5 seconds to update elapsed times
    const interval = setInterval(loadActiveRecordings, 5000)

    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [])

  const handleStopRecording = async (recorderId: string) => {
    try {
      const result = await window.api.recorder.stopRecording(recorderId)
      if (result.success) {
        console.log('Recording stopped:', recorderId)
        // State change event will trigger a reload
      } else {
        alert(`Failed to stop recording: ${result.error}`)
      }
    } catch (error) {
      console.error('Error stopping recording:', error)
      alert('Failed to stop recording')
    }
  }

  const handleStopAllRecordings = async () => {
    if (activeRecordings.length === 0) return

    if (!confirm(`Stop all ${activeRecordings.length} active recording(s)?`)) {
      return
    }

    try {
      const results = await window.api.recorder.stopAllRecordings()
      const successful = results.filter((r) => r.success).length
      const failed = results.length - successful

      if (failed > 0) {
        alert(`Stopped ${successful} recording(s). ${failed} failed to stop.`)
      }
    } catch (error) {
      console.error('Error stopping all recordings:', error)
      alert('Failed to stop all recordings')
    }
  }

  const formatDuration = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const formatRemainingTime = (recording: RecorderState): string => {
    if (!recording.duration) return 'No limit'

    const remaining = recording.duration - recording.elapsed
    if (remaining <= 0) return 'Finishing...'

    return formatDuration(remaining)
  }

  const getStateColor = (state: RecorderState['state']): string => {
    switch (state) {
      case 'recording':
        return 'text-green-400'
      case 'initializing':
        return 'text-yellow-400'
      case 'stopped':
        return 'text-zinc-400'
      case 'error':
        return 'text-red-400'
      default:
        return 'text-zinc-400'
    }
  }

  const getStateIcon = (state: RecorderState['state']) => {
    switch (state) {
      case 'recording':
        return mdiRecord
      case 'initializing':
        return mdiClockOutline
      case 'stopped':
        return mdiStop
      case 'error':
        return mdiStop
      default:
        return mdiStop
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Icon path={mdiRefresh} size={2} className="animate-spin text-white-400 mx-auto mb-4" />
          <p className="text-zinc-400">Loading active recordings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full justify-start font-sans flex-col p-12 pt-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Active Recordings</h1>
          <p className="text-zinc-400">
            Manage recordings from the recorder service ({activeRecordings.length} active)
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={loadActiveRecordings}
            className="btn-accent use-theme-text px-3 py-1 rounded-md cursor-pointer flex items-center space-x-2"
          >
            <Icon path={mdiRefresh} size={0.8} />
            <span>Refresh</span>
          </button>

          {activeRecordings.length > 0 && (
            <button
              onClick={handleStopAllRecordings}
              className="btn-danger disabled:opacity-50 disabled:cursor-not-allowed use-theme-text px-3 py-1 rounded-md flex items-center space-x-2 use-transition cursor-pointer"
            >
              <Icon path={mdiStop} size={0.8} />
              <span>Stop All</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Recording List */}
      {activeRecordings.length === 0 ? (
        <div className="text-center py-12">
          <Icon path={mdiRecord} size={3} className="text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-300 mb-2">No Active Recordings</h3>
          <p className="text-zinc-500">
            Start recording stations to see them here. Use the recorder service API to begin
            recording.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeRecordings.map((recording) => (
            <div
              key={recording.id}
              className="bg-zinc-800/50 backdrop-blur border border-zinc-700/50 rounded-xl p-6 hover:bg-zinc-800/70 transition-colors"
            >
              <div className="flex items-start justify-between">
                {/* Recording Info */}
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <Icon
                      path={getStateIcon(recording.state)}
                      size={1}
                      className={`${getStateColor(recording.state)} ${
                        recording.state === 'recording' ? 'animate-pulse' : ''
                      }`}
                    />
                    <div>
                      <h3 className="text-lg font-medium text-white flex items-center space-x-2">
                        <Icon path={mdiRadio} size={0.8} className="text-zinc-400" />
                        <span>{recording.station.name}</span>
                      </h3>
                      <p className="text-sm text-zinc-400">ID: {recording.id}</p>
                    </div>
                  </div>

                  {/* Recording Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="text-xs text-zinc-500 uppercase tracking-wide">
                        Status
                      </label>
                      <p className={`font-medium ${getStateColor(recording.state)}`}>
                        {recording.state.charAt(0).toUpperCase() + recording.state.slice(1)}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs text-zinc-500 uppercase tracking-wide">
                        Elapsed Time
                      </label>
                      <p className="font-medium text-white">{formatDuration(recording.elapsed)}</p>
                    </div>

                    <div>
                      <label className="text-xs text-zinc-500 uppercase tracking-wide">
                        Remaining Time
                      </label>
                      <p className="font-medium text-white flex items-center space-x-1">
                        {recording.duration ? (
                          <Icon path={mdiClockOutline} size={0.7} className="text-zinc-400" />
                        ) : (
                          <Icon path={mdiInfinity} size={0.7} className="text-zinc-400" />
                        )}
                        <span>{formatRemainingTime(recording)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar (for timed recordings) */}
                  {recording.duration && (
                    <div className="mb-4">
                      <div className="w-full bg-zinc-700 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full transition-all duration-1000"
                          style={{
                            width: `${Math.min((recording.elapsed / recording.duration) * 100, 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Output Path */}
                  <div>
                    <label className="text-xs text-zinc-500 uppercase tracking-wide">
                      Output File
                    </label>
                    <p className="text-sm text-zinc-300 font-mono bg-zinc-900/50 px-2 py-1 rounded mt-1">
                      {recording.outputPath}
                    </p>
                  </div>

                  {recording.error && (
                    <div className="mt-3 bg-red-900/20 border border-red-500/30 rounded px-3 py-2">
                      <p className="text-red-400 text-sm">Error: {recording.error}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="ml-6">
                  <button
                    onClick={() => handleStopRecording(recording.id)}
                    disabled={recording.state === 'stopped'}
                    className="btn-danger disabled:opacity-50 disabled:cursor-not-allowed use-theme-text px-3 py-1 rounded-md flex items-center space-x-2 use-transition cursor-pointer"
                  >
                    <Icon path={mdiStop} size={0.8} />
                    <span>Stop</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
