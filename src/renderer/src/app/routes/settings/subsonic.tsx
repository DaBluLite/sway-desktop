import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useSubsonic } from '../../contexts/subsonic-context'
import { Save } from 'lucide-react'

export const Route = createFileRoute('/settings/subsonic')({
  component: SubsonicSettings
})

function SubsonicSettings() {
  const { subsonicEnabled, setSubsonicEnabled } = useSubsonic()
  const [serverUrl, setServerUrl] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [configured, setConfigured] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  useEffect(() => {
    // Check initial status
    window.api.subsonic.getCredentialsStatus().then((status) => {
      setConfigured(status.configured)
      if (status.configured && status.username) {
        setUsername(status.username)
      }
    })

    // Listen for changes
    const cleanup = window.api.subsonic.onCredentialsChanged((status) => {
      setConfigured(status.configured)
      if (status.configured && status.username) {
        setUsername(status.username)
      }
    })

    return cleanup
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setStatusMsg('Saving...')

    try {
      const result = await window.api.subsonic.setCredentials(username, password, serverUrl)
      if (result.success) {
        setStatusMsg('Credentials saved successfully')
        setPassword('') // Clear password from memory
      } else {
        setError(result.error || 'Failed to save credentials')
        setStatusMsg(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setStatusMsg(null)
    }
  }

  const handleClear = async () => {
    const result = await window.api.subsonic.clearCredentials()
    if (result.success) {
      setServerUrl('')
      setUsername('')
      setPassword('')
      setStatusMsg('Credentials cleared')
      setTimeout(() => setStatusMsg(null), 3000)
    }
  }

  return (
    <>
      <div className="settings-section">
        {/* Global Enable Toggle */}
        <div className="settings-item mt-6 p-4 raised-interface rounded-xl flex items-center justify-between border border-theme-accent/20">
          <div className="flex flex-col gap-0.5">
            <span className="text-white font-bold text-lg">Subsonic Integration</span>
            <span className="text-xs text-zinc-500">
              Enable or disable all Subsonic-related features globally
            </span>
          </div>
          <button
            onClick={() => setSubsonicEnabled(!subsonicEnabled)}
            className={`w-14 h-7 rounded-full transition-colors duration-200 flex items-center px-1 ${
              subsonicEnabled ? 'bg-green-600' : 'bg-zinc-700'
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full transition-transform duration-200 ${
                subsonicEnabled ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="settings-item mt-8">
          <label className="settings-label">Subsonic Server Settings</label>
          <p className="settings-description">
            Connect to your Subsonic-compatible server (e.g. Navidrome, Airsonic)
          </p>

          <div className="">
            {configured && !serverUrl ? (
              <div className="mb-4 text-green-600 dark:text-green-300 font-medium">
                Connected as {username}
              </div>
            ) : null}

            {error && (
              <div className="mb-4 text-red-600 dark:text-red-300 font-medium">{error}</div>
            )}

            {statusMsg && !error && (
              <div className="mb-4 text-green-600 dark:text-green-300 font-medium">{statusMsg}</div>
            )}

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase text-zinc-700 dark:text-zinc-400">
                  Server URL
                </label>
                <input
                  type="url"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="https://your-server.com"
                  className="text-input"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase text-zinc-700 dark:text-zinc-400">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="text-input"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase text-zinc-700 dark:text-zinc-400">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="text-input"
                  required={!configured}
                />
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  type="submit"
                  className="btn px-4 py-2 rounded-md cursor-pointer gap-2 flex items-center use-transition"
                >
                  <Save className="size-4" />
                  Save Credentials
                </button>

                {configured && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="btn-danger px-4 py-2 rounded-md cursor-pointer gap-2 flex items-center use-transition"
                  >
                    Clear Credentials
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
