import { mdiRestore, mdiCheck, mdiChevronDown } from '@mdi/js'
import Icon from '@mdi/react'
import { useEqualizer } from '../../contexts/equalizer-context'
import { useAudioPlayer } from '../../contexts/audio-player-context'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { AudioDevice } from '../../../../../types/audio-player'

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
    <div className="p-4 flex flex-col gap-8 overflow-y-auto flex-1 min-h-0 pb-20">
      {/* Native Audio Settings */}
      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-2">
          Advanced Audio
        </h3>

        {/* Gapless Playback */}
        <div className="flex items-center justify-between p-4 raised-interface rounded-xl">
          <div className="flex flex-col gap-0.5">
            <span className="text-white font-medium">Gapless Playback</span>
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

        {/* Exclusive Mode (Windows only usually) */}
        <div className="flex items-center justify-between p-4 raised-interface rounded-xl">
          <div className="flex flex-col gap-0.5">
            <span className="text-white font-medium">Exclusive Audio Output</span>
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
              <span className="text-white font-medium">Bit-Perfect Mode</span>
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

        {/* Audio Output Selection */}
        <div className="flex flex-col gap-2 p-4 raised-interface rounded-xl">
          <div className="flex flex-col gap-0.5 mb-2">
            <span className="text-white font-medium">Output Device</span>
            <span className="text-xs text-zinc-500">Select your preferred audio hardware</span>
          </div>
          <div className="relative group">
            <select
              value={audioDevice || 'auto'}
              onChange={(e) =>
                updateSettings({ audioDevice: e.target.value === 'auto' ? null : e.target.value })
              }
              className="w-full appearance-none bg-theme-bg/20 border border-faint rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-subtle cursor-pointer transition-colors hover:bg-theme-bg/30"
            >
              <option value="auto">Auto (Default)</option>
              {devices.map((device) => (
                <option key={device.name} value={device.name}>
                  {device.description || device.name}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
              <Icon path={mdiChevronDown} size={0.8} />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
