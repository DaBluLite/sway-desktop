import { mdiRestore } from '@mdi/js'
import Icon from '@mdi/react'
import { useEqualizer } from '../../contexts/equalizer-context'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/settings/audio')({
  component: AudioSettings
})

function AudioSettings() {
  const {
    enabled: eqEnabled,
    bands,
    preamp,
    currentPreset: currentEqPreset,
    presets,
    frequencies,
    toggleEQ,
    setBandGain,
    setPreamp,
    applyPreset,
    resetEQ
  } = useEqualizer()

  const formatFrequency = (freq: number): string => {
    if (freq >= 1000) {
      return `${freq / 1000}k`
    }
    return `${freq}`
  }
  return (
    <div className="p-4 flex flex-col gap-6 overflow-y-auto flex-1 min-h-0">
      {/* Enable/Disable toggle */}
      <div className="flex items-center justify-between">
        <span className="text-white font-medium">Enable Equalizer</span>
        <button
          onClick={toggleEQ}
          className={`w-14 h-7 rounded-full transition ${
            eqEnabled ? 'bg-green-600' : 'bg-zinc-600'
          }`}
        >
          <div
            className={`w-6 h-6 bg-white rounded-full transition-transform ${
              eqEnabled ? 'translate-x-7' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Presets */}
      <div>
        <label className="block text-sm text-zinc-400 mb-2">Presets</label>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset.name)}
              disabled={!eqEnabled}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition shadow-glass border border-faint disabled:opacity-50 disabled:cursor-not-allowed ${
                currentEqPreset === preset.name
                  ? 'bg-green-600/40 text-white'
                  : 'bg-second-layer-thin text-zinc-300 hover:bg-second-layer-thin-hover'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Preamp */}
      <div>
        <div className="flex justify-between mb-2">
          <label className="text-sm text-zinc-400">Preamp</label>
          <span className="text-sm text-zinc-400">
            {preamp > 0 ? '+' : ''}
            {preamp} dB
          </span>
        </div>
        <div className="relative">
          {/* Progress background */}
          <div className="absolute inset-0 h-1 bg-white/10 rounded-full" />
          {/* Active progress */}
          <div
            className="absolute inset-y-0 left-0 h-1 bg-linear-to-r from-green-400 to-green-500 rounded-full transition-all duration-150"
            style={{ width: `${((preamp + 12) / 24) * 100}%` }}
          />
          {/* Slider input */}
          <input
            type="range"
            min="-12"
            max="12"
            step="1"
            value={preamp}
            onChange={(e) => setPreamp(parseInt(e.target.value))}
            disabled={!eqEnabled}
            className="relative w-full h-1 bg-transparent appearance-none cursor-pointer z-10 -top-3.5
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-5
              [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:bg-white
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:shadow-lg
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:transition-all
              [&::-webkit-slider-thumb]:duration-150
              hover:[&::-webkit-slider-thumb]:scale-110
              active:[&::-webkit-slider-thumb]:scale-95
              [&::-moz-range-thumb]:w-5
              [&::-moz-range-thumb]:h-5
              [&::-moz-range-thumb]:bg-white
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:border-none
              [&::-moz-range-thumb]:shadow-lg
              [&::-moz-range-thumb]:cursor-pointer
              [&::-moz-range-thumb]:transition-all
              hover:[&::-moz-range-thumb]:scale-110
              active:[&::-moz-range-thumb]:scale-95"
            aria-label="Volume"
          />
        </div>
      </div>

      {/* EQ Bands */}
      <div className="overflow-y-auto">
        <div className="flex justify-between items-end gap-1 sm:gap-2 h-56">
          {bands.map((gain, index) => (
            <div key={index} className="flex flex-col items-center gap-1">
              {/* Gain value */}
              <span className="text-xs text-zinc-400 h-4">
                {gain > 0 ? '+' : ''}
                {gain.toFixed(0)}
              </span>

              {/* Vertical slider container */}
              <div className="relative h-32 flex items-center justify-center">
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="1"
                  value={gain}
                  onChange={(e) => setBandGain(index, parseFloat(e.target.value))}
                  disabled={!eqEnabled}
                  className="eq-vertical-slider disabled:opacity-50"
                  style={{
                    width: '128px',
                    height: '24px',
                    transform: 'rotate(-90deg)',
                    transformOrigin: 'center center'
                  }}
                />
              </div>

              {/* Frequency label */}
              <span className="text-xs text-zinc-500 mt-1">
                {formatFrequency(frequencies[index])}
              </span>
            </div>
          ))}
        </div>

        {/* Zero line indicator */}
        <div className="flex justify-center mt-2">
          <span className="text-xs text-zinc-600">0 dB</span>
        </div>
      </div>

      {/* Reset button */}
      <button
        onClick={resetEQ}
        disabled={!eqEnabled}
        className="w-full flex items-center justify-center gap-2 py-3 btn-accent disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition"
      >
        <Icon path={mdiRestore} size={1} />
        Reset to Flat
      </button>

      {/* Info text */}
      <p className="text-zinc-500 text-xs text-center">
        Note: The equalizer uses the Web Audio API. Some browsers may require user interaction
        before audio can be processed.
        {!eqEnabled && ' Enable the equalizer to adjust settings.'}
      </p>
    </div>
  )
}
