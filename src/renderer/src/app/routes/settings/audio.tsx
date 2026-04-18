import { useAudioPlayer } from '../../contexts/audio-player-context'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { AudioDevice } from '../../../../../types/audio-player'
import { Select } from '@renderer/components/custom-select'

export const Route = createFileRoute('/settings/audio')({
  component: AudioSettings
})

function AudioSettings() {
  const {
    gaplessEnabled,
    exclusiveEnabled,
    bitPerfectEnabled,
    audioDevice,
    updateSettings,
    getAudioDevices
  } = useAudioPlayer()

  const [devices, setDevices] = useState<AudioDevice[]>([])

  useEffect(() => {
    getAudioDevices().then(setDevices)
  }, [getAudioDevices])
  return (
    <div className="p-4 flex flex-col gap-8 overflow-y-auto flex-1 min-h-0 pb-20 h-full">
      {/* Native Audio Settings */}
      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-2">
          Advanced Audio
        </h3>

        {/* Gapless Playback */}
        <div className="flex items-center justify-between p-4 raised-interface rounded-xl">
          <div className="flex flex-col gap-0.5">
            <span className="use-theme-text font-medium">Gapless Playback</span>
            <span className="text-xs text-zinc-500">Remove silence between tracks</span>
          </div>
          <button
            onClick={() => updateSettings({ gaplessEnabled: !gaplessEnabled })}
            className={`w-12 h-6 rounded-full transition-colors duration-200 flex items-center px-1 ${
              gaplessEnabled ? 'bg-green-600' : 'bg-zinc-700'
            }`}
          >
            <div
              className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                gaplessEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {(devices.find((a) => a.name == audioDevice) || { supports_exclusive_audio: false })
          .supports_exclusive_audio && (
          <>
            {/* Exclusive Mode (Windows only usually) */}
            <div className="flex items-center justify-between p-4 raised-interface rounded-xl">
              <div className="flex flex-col gap-0.5">
                <span className="use-theme-text font-medium">Exclusive Audio Output</span>
                <span className="text-xs text-zinc-500">Bypass OS mixer for lower latency</span>
              </div>
              <button
                onClick={() => updateSettings({ exclusiveEnabled: !exclusiveEnabled })}
                className={`w-12 h-6 rounded-full transition-colors duration-200 flex items-center px-1 ${
                  exclusiveEnabled ? 'bg-green-600' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                    exclusiveEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Bit-Perfect Mode */}
            <div className="flex items-center justify-between p-4 raised-interface rounded-xl border border-green-500/20">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="use-theme-text font-medium">Bit-Perfect Mode</span>
                  <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-[10px] text-green-400 font-bold uppercase tracking-tighter">
                    Hi-Res
                  </span>
                </div>
                <span className="text-xs text-zinc-500">Disable all resampling and processing</span>
              </div>
              <button
                onClick={() => updateSettings({ bitPerfectEnabled: !bitPerfectEnabled })}
                className={`w-12 h-6 rounded-full transition-colors duration-200 flex items-center px-1 ${
                  bitPerfectEnabled
                    ? 'bg-green-600 shadow-[0_0_10px_rgba(34,197,94,0.3)]'
                    : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                    bitPerfectEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </>
        )}

        {/* Audio Output Selection */}
        <div className="flex flex-col gap-2 p-4 raised-interface rounded-xl">
          <div className="flex flex-col gap-0.5 mb-2">
            <span className="use-theme-text font-medium">Output Device</span>
            <span className="text-xs text-zinc-500">Select your preferred audio hardware</span>
          </div>
          <Select
            options={[
              devices.map((device) => ({
                value: device.name,
                label:
                  (device.description || device.name) +
                  (device.supports_exclusive_audio ? ' (Supports Bit-Perfect)' : '')
              })),
              { value: 'auto', label: 'Auto (Default)' }
            ].flat()}
            value={audioDevice || 'auto'}
            onChange={(e) => updateSettings({ audioDevice: e === 'auto' ? null : String(e) })}
          />
        </div>
      </section>
    </div>
  )
}
