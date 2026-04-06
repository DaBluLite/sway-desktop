"use client";

import React, { useState } from "react";
import { Icon } from "@mdi/react";
import { mdiClose, mdiTimerOutline, mdiPlus, mdiStop, mdiCheck } from "@mdi/js";
import {
  useSleepTimer,
  SleepTimerPreset,
} from "../contexts/sleep-timer-context";

interface SleepTimerModalProps {
  onClose: () => void;
}

const PRESETS: { value: SleepTimerPreset; label: string }[] = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
];

export const SleepTimerModal: React.FC<SleepTimerModalProps> = ({
  onClose,
}) => {
  const {
    isActive,
    selectedPreset,
    startPreset,
    stopTimer,
    addTime,
    formatTimeRemaining,
  } = useSleepTimer();

  const [customMinutes, setCustomMinutes] = useState<string>("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handlePresetClick = (preset: SleepTimerPreset) => {
    if (typeof preset === "number") {
      startPreset(preset);
      onClose();
    }
  };

  const handleCustomSubmit = () => {
    const minutes = parseInt(customMinutes, 10);
    if (!isNaN(minutes) && minutes > 0) {
      startPreset("custom", minutes);
      onClose();
    }
  };

  const handleAddTime = (minutes: number) => {
    addTime(minutes);
  };

  const handleStopTimer = () => {
    stopTimer();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal max-w-md!" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <Icon path={mdiTimerOutline} size={1.2} className="text-white" />
            <h2 className="text-xl font-semibold text-white">Sleep Timer</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 invis-btn rounded-full transition"
            aria-label="Close"
          >
            <Icon path={mdiClose} size={1} className="text-white" />
          </button>
        </div>
        {isActive ? (
          <>
            <div className="modal-content p-4">
              <div className="text-center mb-3">
                <p className="text-zinc-400 text-sm mb-2">Time remaining</p>
                <p className="text-4xl font-bold text-white font-mono">
                  {formatTimeRemaining()}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => handleAddTime(5)}
                  className="flex items-center gap-1 px-3 py-2 btn rounded-md text-white text-sm use-transition"
                >
                  <Icon path={mdiPlus} size={0.7} />5 min
                </button>
                <button
                  onClick={() => handleAddTime(10)}
                  className="flex items-center gap-1 px-3 py-2 btn rounded-md text-white text-sm use-transition"
                >
                  <Icon path={mdiPlus} size={0.7} />
                  10 min
                </button>
                <button
                  onClick={() => handleAddTime(15)}
                  className="flex items-center gap-1 px-3 py-2 btn rounded-md text-white text-sm use-transition"
                >
                  <Icon path={mdiPlus} size={0.7} />
                  15 min
                </button>
              </div>
            </div>
            <div className="border-t border-subtle p-3">
              <button
                onClick={handleStopTimer}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 btn bg-red-600/80 hover:bg-red-600 rounded-lg text-white font-medium use-transition"
              >
                <Icon path={mdiStop} size={1} />
                Cancel Timer
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="modal-content p-4">
              <p className="text-zinc-300 text-sm text-center mb-4">
                Set a timer to automatically stop playback
              </p>

              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handlePresetClick(preset.value)}
                    className={`px-3 py-2 rounded-md text-white font-medium use-transition ${
                      selectedPreset === preset.value
                        ? "raised-interface-lg"
                        : "raised-interface"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-subtle p-3">
              {showCustomInput ? (
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max="480"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    placeholder="Minutes"
                    className="flex-1 px-4 py-2 raised-interface focus:raised-interface-lg rounded-md text-white placeholder-zinc-400 focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleCustomSubmit}
                    disabled={!customMinutes || parseInt(customMinutes) <= 0}
                    className="px-4 py-2 btn-accent disabled:opacity-75 disabled:cursor-not-allowed rounded-md text-white use-transition"
                  >
                    <Icon path={mdiCheck} size={1} />
                  </button>
                  <button
                    onClick={() => {
                      setShowCustomInput(false);
                      setCustomMinutes("");
                    }}
                    className="px-4 py-2 btn rounded-md text-white use-transition"
                  >
                    <Icon path={mdiClose} size={1} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowCustomInput(true)}
                  className="w-full px-4 py-3 btn rounded-lg text-white font-medium use-transition"
                >
                  Custom time...
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
