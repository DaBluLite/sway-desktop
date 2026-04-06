import { useState, useMemo } from 'react'
import { Icon } from '@mdi/react'
import {
  mdiClose,
  mdiAlarm,
  mdiPlus,
  mdiDelete,
  mdiPencil,
  mdiCheck,
  mdiVolumeHigh,
  mdiBellRing,
  mdiSleep,
  mdiRadio
} from '@mdi/js'
import { useAlarm, Alarm } from '../contexts/alarm-context'
import { useFavourites } from '../contexts/favourites-context'
import { Station } from 'radio-browser-api'

interface AlarmModalProps {
  onClose: () => void
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const AlarmModal: React.FC<AlarmModalProps> = ({ onClose }: AlarmModalProps) => {
  const {
    alarms,
    activeAlarm,
    isRinging,
    addAlarm,
    updateAlarm,
    deleteAlarm,
    toggleAlarm,
    dismissAlarm,
    snoozeAlarm,
    requestNotificationPermission,
    notificationPermission
  } = useAlarm()
  const { favourites } = useFavourites()

  const [isCreating, setIsCreating] = useState(false)
  const [editingAlarmId, setEditingAlarmId] = useState<string | null>(null)

  // Find the editing alarm from alarms list
  const editingAlarm = useMemo(
    () => alarms.find((a) => a.id === editingAlarmId) || null,
    [alarms, editingAlarmId]
  )

  // Form state - initialize from editingAlarm when it changes
  const [label, setLabel] = useState('')
  const [time, setTime] = useState('07:00')
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const [volume, setVolume] = useState(0.7)
  const [snoozeMinutes, setSnoozeMinutes] = useState(5)
  const [gradualVolume, setGradualVolume] = useState(true)

  // Helper to populate form when editing
  const startEditing = (alarm: Alarm) => {
    setEditingAlarmId(alarm.id)
    setLabel(alarm.label)
    setTime(alarm.time)
    setSelectedDays(alarm.days)
    setSelectedStation(alarm.station)
    setVolume(alarm.volume)
    setSnoozeMinutes(alarm.snoozeMinutes)
    setGradualVolume(alarm.gradualVolume)
  }

  const resetForm = () => {
    setLabel('')
    setTime('07:00')
    setSelectedDays([])
    setSelectedStation(null)
    setVolume(0.7)
    setSnoozeMinutes(5)
    setGradualVolume(true)
    setIsCreating(false)
    setEditingAlarmId(null)
  }

  const handleSave = () => {
    if (!selectedStation) return

    const alarmData = {
      label: label || 'Alarm',
      time,
      days: selectedDays,
      station: selectedStation,
      volume,
      snoozeMinutes,
      gradualVolume,
      enabled: true
    }

    if (editingAlarm) {
      updateAlarm(editingAlarm.id, alarmData)
    } else {
      addAlarm(alarmData)
    }

    resetForm()
  }

  const toggleDay = (day: number) => {
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  const formatNextAlarm = (alarm: Alarm): string => {
    if (!alarm.enabled) return 'Disabled'

    const now = new Date()
    const [hours, minutes] = alarm.time.split(':').map(Number)
    const alarmTime = new Date()
    alarmTime.setHours(hours, minutes, 0, 0)

    if (alarm.days.length === 0) {
      // One-time alarm
      if (alarmTime <= now) {
        alarmTime.setDate(alarmTime.getDate() + 1)
      }
      return `Today at ${alarm.time}`
    }

    // Find next scheduled day
    const currentDay = now.getDay()
    for (let i = 0; i < 7; i++) {
      const checkDay = (currentDay + i) % 7
      if (alarm.days.includes(checkDay)) {
        if (i === 0 && alarmTime > now) {
          return `Today at ${alarm.time}`
        } else if (i === 0) {
          continue
        } else if (i === 1) {
          return `Tomorrow at ${alarm.time}`
        } else {
          return `${DAYS[checkDay]} at ${alarm.time}`
        }
      }
    }
    return alarm.time
  }

  // Ringing alarm UI
  if (isRinging && activeAlarm) {
    return (
      <div className="modal-overlay" onClick={(e) => e.stopPropagation()}>
        <div className="modal max-w-md! text-center animate-pulse-glow">
          <div className="p-8">
            <div className="mb-6">
              <Icon path={mdiBellRing} size={4} className="text-green-400 mx-auto animate-bounce" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">{activeAlarm.label}</h2>
            <p className="text-xl text-zinc-300 mb-2">{activeAlarm.time}</p>
            <p className="text-zinc-400 mb-8">Playing: {activeAlarm.station.name}</p>

            <div className="flex gap-4 justify-center">
              <button
                onClick={snoozeAlarm}
                className="flex items-center gap-2 px-6 py-3 bg-yellow-600 hover:bg-yellow-500 rounded-full text-white font-medium transition"
              >
                <Icon path={mdiSleep} size={1} />
                Snooze {activeAlarm.snoozeMinutes}m
              </button>
              <button
                onClick={dismissAlarm}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 rounded-full text-white font-medium transition"
              >
                <Icon path={mdiCheck} size={1} />
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Creating/Editing form
  if (isCreating || editingAlarm) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal max-w-lg!" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="flex items-center gap-2">
              <Icon path={mdiAlarm} size={1.2} className="text-white" />
              <h2 className="text-xl font-semibold text-white">
                {editingAlarm ? 'Edit Alarm' : 'New Alarm'}
              </h2>
            </div>
            <button onClick={resetForm} className="p-2 invis-btn rounded-full use-transition">
              <Icon path={mdiClose} size={1} className="text-white" />
            </button>
          </div>

          <div className="p-4 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
            {/* Time picker */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-3 raised-interface rounded-md text-white text-2xl font-mono focus:outline-none focus:raised-interface-lg"
              />
            </div>

            {/* Label */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Label</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Alarm"
                className="w-full px-4 py-2 raised-interface rounded-md text-white placeholder-zinc-500 focus:outline-none focus:raised-interface-lg"
              />
            </div>

            {/* Days */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">
                Repeat (leave empty for one-time)
              </label>
              <div className="flex gap-1">
                {DAYS.map((day, index) => (
                  <button
                    key={day}
                    onClick={() => toggleDay(index)}
                    className={`flex-1 py-1 rounded-sm text-sm font-medium transition btn ${
                      selectedDays.includes(index) ? 'btn-accent!' : ''
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {/* Station selection */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Station</label>
              {favourites.length > 0 ? (
                <div className="grid gap-2 max-h-40 overflow-y-auto">
                  {favourites.map((station) => (
                    <button
                      key={station.url}
                      onClick={() => setSelectedStation(station)}
                      className={`flex items-center gap-3 p-3 rounded-md use-transition ${
                        selectedStation?.url === station.url
                          ? 'raised-interface-lg'
                          : 'raised-interface'
                      }`}
                    >
                      {station.favicon ? (
                        <img
                          src={station.favicon}
                          alt=""
                          className="w-8 h-8 rounded object-cover"
                        />
                      ) : (
                        <Icon path={mdiRadio} size={1} className="text-zinc-400" />
                      )}
                      <span className="text-white text-sm truncate">{station.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-500 text-sm">
                  Add stations to favourites to use them as alarms
                </p>
              )}
            </div>

            {/* Volume */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">
                Volume: {Math.round(volume * 100)}%
              </label>
              <div className="flex items-center gap-3">
                <Icon path={mdiVolumeHigh} size={0.8} className="text-zinc-400" />
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="flex-1 audio-player-slider"
                />
              </div>
            </div>

            {/* Gradual volume */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-white">Gradual volume</span>
                <p className="text-zinc-500 text-sm">Fade in over 30 seconds</p>
              </div>
              <button
                onClick={() => setGradualVolume(!gradualVolume)}
                className={`w-12 h-6 rounded-full transition ${
                  gradualVolume ? 'bg-green-600' : 'bg-zinc-600'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    gradualVolume ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Snooze duration */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Snooze duration</label>
              <select
                value={snoozeMinutes}
                onChange={(e) => setSnoozeMinutes(parseInt(e.target.value))}
                className="w-full px-4 py-2 raised-interface rounded-md text-white focus:outline-none focus:raised-interface-lg"
              >
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={20}>20 minutes</option>
              </select>
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={!selectedStation}
              className="w-full py-3 btn-accent disabled:btn disabled:cursor-not-allowed rounded-lg text-white font-medium transition"
            >
              {editingAlarm ? 'Save Changes' : 'Create Alarm'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Alarm list
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal max-w-lg!" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <Icon path={mdiAlarm} size={1.2} className="text-white" />
            <h2 className="text-xl font-semibold text-white">Alarms</h2>
          </div>
          <button onClick={onClose} className="p-2 invis-btn rounded-full transition">
            <Icon path={mdiClose} size={1} className="text-white" />
          </button>
        </div>

        <div className="p-4">
          {notificationPermission !== 'granted' && (
            <div className="mb-4 p-3 bg-yellow-600/20 border border-yellow-600/12 shadow-glass rounded-lg">
              <p className="text-yellow-200 text-sm mb-2">
                Enable notifications to receive alarm alerts
              </p>
              <button
                onClick={requestNotificationPermission}
                className="text-yellow-400 text-sm hover:underline"
              >
                Enable notifications
              </button>
            </div>
          )}

          {alarms.length === 0 ? (
            <div className="text-center py-8">
              <Icon path={mdiAlarm} size={3} className="text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400 mb-4">No alarms set</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 mb-4 max-h-[50vh] overflow-y-auto">
              {alarms.map((alarm) => (
                <div
                  key={alarm.id}
                  className={`p-4 rounded-lg border border-transparent transition ${
                    alarm.enabled ? 'raised-interface-lg' : 'opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-mono text-white">{alarm.time}</span>
                      <button
                        onClick={() => toggleAlarm(alarm.id)}
                        className={`w-12 h-6 rounded-full transition ${
                          alarm.enabled ? 'bg-green-600' : 'bg-zinc-600'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 bg-white rounded-full transition-transform ${
                            alarm.enabled ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEditing(alarm)}
                        className="p-2 hover:bg-green-400/20 rounded-full transition"
                      >
                        <Icon path={mdiPencil} size={0.8} className="text-zinc-400" />
                      </button>
                      <button
                        onClick={() => deleteAlarm(alarm.id)}
                        className="p-2 hover:bg-red-400/20 rounded-full transition"
                      >
                        <Icon path={mdiDelete} size={0.8} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                  <p className="text-white text-sm mb-1">{alarm.label}</p>
                  <p className="text-zinc-400 text-sm mb-1">
                    {alarm.days.length > 0 ? alarm.days.map((d) => DAYS[d]).join(', ') : 'One-time'}
                  </p>
                  <p className="text-zinc-500 text-xs">
                    {formatNextAlarm(alarm)} • {alarm.station.name}
                  </p>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => setIsCreating(true)}
            className="w-full flex items-center justify-center gap-2 py-3 btn-accent rounded-lg text-white font-medium transition"
          >
            <Icon path={mdiPlus} size={1} />
            Add Alarm
          </button>
        </div>
      </div>
    </div>
  )
}
