import { useState } from 'react'
import { Icon } from '@mdi/react'
import {
  mdiRecord,
  mdiStop,
  mdiDownload,
  mdiDelete,
  mdiAlertCircle,
  mdiRadio,
  mdiClose,
  mdiRecordCircle,
  mdiCheck
} from '@mdi/js'
import { useRecordings } from '../contexts/recordings-context'
import { useAudioPlayer } from '../contexts/audio-player-context'

interface RecorderProps {
  onClose?: () => void
}

export const Recorder: React.FC<RecorderProps> = ({ onClose }: RecorderProps) => {
  const {
    recordings,
    isRecording,
    currentRecordingStation,
    recordingDuration,
    startRecording,
    stopRecording,
    deleteRecording,
    downloadRecording,
    clearAllRecordings,
    disclaimerAccepted,
    acceptDisclaimer
  } = useRecordings()

  const { currentStation, isPlaying, audioElement } = useAudioPlayer()
  const [showDisclaimer, setShowDisclaimer] = useState(!disclaimerAccepted)

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleStartRecording = async () => {
    if (!currentStation || !isPlaying) {
      alert('Please play a station first to start recording.')
      return
    }

    // Get the audio element
    if (!audioElement) {
      alert('Audio element not found.')
      return
    }

    const success = await startRecording(currentStation)
    if (!success) {
      alert('Failed to start recording. Make sure audio is playing.')
    }
  }

  const handleStopRecording = async () => {
    const recording = await stopRecording()
    if (recording) {
      // Recording saved successfully
    }
  }

  const handleAcceptDisclaimer = () => {
    acceptDisclaimer()
    setShowDisclaimer(false)
  }

  // Disclaimer modal
  if (showDisclaimer && !disclaimerAccepted) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal max-w-lg!" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header flex items-center justify-between p-4 border-b border-green-700/30">
            <div className="flex items-center gap-2">
              <Icon path={mdiAlertCircle} size={1.2} className="text-yellow-400" />
              <h2 className="text-xl font-semibold text-white">Recording Disclaimer</h2>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-green-400/20 rounded-full transition"
              >
                <Icon path={mdiClose} size={1} className="text-white" />
              </button>
            )}
          </div>

          <div className="p-4 flex flex-col gap-4">
            <div className="bg-yellow-600/20 border border-yellow-600/12 shadow-glass rounded-lg p-4">
              <h3 className="text-yellow-200 font-medium mb-2">Important Legal Notice</h3>
              <ul className="text-yellow-100/80 text-sm flex flex-col gap-2">
                <li>
                  • Recording radio streams may be subject to copyright laws in your jurisdiction.
                </li>
                <li>• Recordings are intended for personal, non-commercial use only.</li>
                <li>• You are solely responsible for ensuring compliance with applicable laws.</li>
                <li>
                  • Recordings are stored locally on your device and are not uploaded anywhere.
                </li>
                <li>• Maximum recording duration is 1 hour per recording.</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 btn rounded-lg text-white font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAcceptDisclaimer}
                className="flex-1 flex items-center justify-center gap-2 py-3 btn-accent rounded-lg text-white font-medium transition"
              >
                <Icon path={mdiCheck} size={1} />I Understand
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal max-w-lg!" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <Icon path={mdiRecord} size={1.2} className="text-red-400" />
            <h2 className="text-xl font-semibold text-white">Recording</h2>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 invis-btn rounded-full transition">
              <Icon path={mdiClose} size={1} className="text-white" />
            </button>
          )}
        </div>

        <div className="p-4">
          {/* Recording controls */}
          <div className="raised-interface-lg rounded-lg p-4 mb-4">
            {isRecording ? (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Icon path={mdiRecordCircle} size={1.5} className="text-red-500 animate-pulse" />
                  <span className="text-red-400 font-medium">Recording...</span>
                </div>

                {currentRecordingStation && (
                  <div className="flex items-center justify-center gap-2 mb-3">
                    {currentRecordingStation.favicon ? (
                      <img
                        src={currentRecordingStation.favicon}
                        alt=""
                        className="w-8 h-8 rounded"
                      />
                    ) : (
                      <Icon path={mdiRadio} size={1} className="text-zinc-400" />
                    )}
                    <span className="text-white text-sm">{currentRecordingStation.name}</span>
                  </div>
                )}

                <p className="text-3xl font-mono text-white mb-4">
                  {formatDuration(recordingDuration)}
                </p>

                <button
                  onClick={handleStopRecording}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 rounded-full text-white font-medium transition mx-auto"
                >
                  <Icon path={mdiStop} size={1} />
                  Stop Recording
                </button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-zinc-400 mb-4">
                  {currentStation && isPlaying
                    ? `Ready to record: ${currentStation.name}`
                    : 'Play a station to start recording'}
                </p>

                <button
                  onClick={handleStartRecording}
                  disabled={!currentStation || !isPlaying}
                  className="flex items-center justify-center gap-2 px-6 py-3 btn-danger disabled:opacity-50 disabled:cursor-not-allowed rounded-full text-white font-medium transition mx-auto"
                >
                  <Icon path={mdiRecord} size={1} />
                  Start Recording
                </button>
              </div>
            )}
          </div>

          {/* Recordings list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-medium">Saved Recordings ({recordings.length})</h3>
              {recordings.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm('Delete all recordings?')) {
                      clearAllRecordings()
                    }
                  }}
                  className="text-red-400 text-sm hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>

            {recordings.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">
                No recordings yet. Start recording to save audio.
              </p>
            ) : (
              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                {recordings.map((recording) => (
                  <div
                    key={recording.id}
                    className="flex items-center gap-3 p-3 raised-interface rounded-md"
                  >
                    {recording.stationFavicon ? (
                      <img src={recording.stationFavicon} alt="" className="w-10 h-10 rounded" />
                    ) : (
                      <div className="w-10 h-10 raised-interface rounded flex items-center justify-center">
                        <Icon path={mdiRadio} size={0.8} className="text-zinc-400" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{recording.stationName}</p>
                      <p className="text-zinc-400 text-xs">
                        {formatDuration(recording.duration)} • {formatFileSize(recording.size)}
                      </p>
                      <p className="text-zinc-500 text-xs">{formatDate(recording.startTime)}</p>
                    </div>

                    <div className="flex gap-1">
                      <button
                        onClick={() => downloadRecording(recording)}
                        className="p-2 invis-btn rounded-full transition"
                        title="Download"
                      >
                        <Icon path={mdiDownload} size={0.8} className="text-white" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this recording?')) {
                            deleteRecording(recording.id)
                          }
                        }}
                        className="p-2 invis-btn hover:bg-red-600/30 active:bg-red-300/30 rounded-full transition"
                        title="Delete"
                      >
                        <Icon path={mdiDelete} size={0.8} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info text */}
          <p className="text-zinc-500 text-xs text-center mt-4">
            Recordings are stored locally and available only during this session. Download to save
            permanently.
          </p>
        </div>
      </div>
    </div>
  )
}
