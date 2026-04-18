import Wordmark from '@renderer/assets/wordmark'
import { useAppSetup } from '@renderer/contexts/app-setup-context'
import { useSubsonic } from '@renderer/contexts/subsonic-context'
import { AudioLines, Check, ChevronLeft, ChevronRight, Radio, Save, Search, X } from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import { COUNTRIES } from '../utils/countries'

function WelcomeScreenWrapper({ children }: { children: React.ReactNode }) {
  const { isInitialized, setupCompleted } = useAppSetup()
  if (isInitialized && !setupCompleted) return <div className="welcome-screen">{children}</div>
  return <></>
}

function WelcomeScreen1({ nextScreen }: { nextScreen: () => void }) {
  return (
    <>
      <span className="text-3xl font-thin">Welcome to</span>
      <Wordmark className="h-20" />
      <button
        className="px-8 py-4 cursor-pointer flex items-center gap-2 btn-accent rounded-full absolute bottom-12"
        onClick={nextScreen}
      >
        <span className="text-xl">Get Started</span>
        <ChevronRight className="size-6" />
      </button>
    </>
  )
}

function SelectCountry({ nextScreen }: { nextScreen: () => void }) {
  const { selectedCountry, setSelectedCountry } = useAppSetup()
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!selectedCountry) {
      // Try to auto-select based on IP if possible
      fetch('https://api.country.is/')
        .then((res) => res.json())
        .then((geoData) => {
          if (geoData.country && !selectedCountry) {
            setSelectedCountry(geoData.country)
          }
        })
        .catch((err) => console.error('Failed to fetch geo data', err))
    }
  }, [selectedCountry, setSelectedCountry])

  const filteredCountries = useMemo(() => {
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [searchTerm])

  return (
    <>
      <span className="text-3xl font-thin mb-8">Select your Country</span>

      <div className="flex flex-col gap-4 w-120 max-h-120 mb-20 overflow-hidden">
        <div className="relative mx-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search countries..."
            className="w-full pl-10 pr-4 py-3 text-input rounded-xl outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-4 custom-scrollbar flex flex-col gap-1">
          {filteredCountries.length > 0 ? (
            filteredCountries.map((country) => (
              <button
                key={country.code}
                onClick={() => setSelectedCountry(country.code)}
                className={`flex items-center gap-4 px-4 py-3 border border-transparent rounded-md cursor-pointer use-transition ${
                  selectedCountry === country.code
                    ? 'bg-second-layer-thin dark:bg-second-layer-thin-dark border-subtle! shadow-glass'
                    : 'hover:bg-second-layer-thin-hover dark:hover:bg-second-layer-thin-hover-dark'
                }`}
              >
                <span className="text-3xl">{country.emoji}</span>
                <div className="flex flex-col flex-1 text-left">
                  <span className="font-medium">{country.name}</span>
                </div>
                {selectedCountry === country.code && <Check className="size-6 text-accent" />}
              </button>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-zinc-500">
              <span>No countries found for &quot;{searchTerm}&quot;</span>
            </div>
          )}
        </div>
      </div>

      <button
        className="px-8 py-4 cursor-pointer flex items-center gap-2 btn-accent rounded-full absolute bottom-12 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={nextScreen}
        disabled={!selectedCountry}
      >
        <span className="text-xl">Next</span>
        <ChevronRight className="size-6" />
      </button>
    </>
  )
}

function SelectExperience({
  nextScreen,
  prevScreen
}: {
  nextScreen: (isSubsonicEnabled: boolean) => void
  prevScreen: () => void
}) {
  const [selectedExperience, setSelectedExperience] = useState<'full' | 'radio'>('full')
  return (
    <>
      <span className="text-3xl font-thin">Select your experience</span>
      <div className="flex gap-4 items-center">
        <div
          className="flex flex-col items-center gap-2 cursor-pointer"
          onClick={() => setSelectedExperience('full')}
        >
          <div
            className={`use-transition w-70 h-50 rounded-md flex items-center justify-center gap-6 border-2 border-subtle ${selectedExperience === 'full' ? 'border-green-500!' : ''}`}
          >
            <div className="flex flex-col gap-2 items-center">
              <AudioLines className="size-16" />
              <span>Subsonic</span>
            </div>
            <span className="font-bold text-3xl">+</span>
            <div className="flex flex-col gap-2 items-center">
              <Radio className="size-16" />
              <span>Radio</span>
            </div>
          </div>
          <span className="text-lg">Full</span>
        </div>
        <div
          className="flex flex-col items-center gap-2 cursor-pointer"
          onClick={() => setSelectedExperience('radio')}
        >
          <div
            className={`use-transition w-70 h-50 rounded-md bg-theme-bg/20 flex items-center justify-center border-2 border-subtle ${selectedExperience === 'radio' ? 'border-green-500!' : ''}`}
          >
            <div className="flex flex-col gap-2 items-center">
              <Radio className="size-16" />
              <span>Radio</span>
            </div>
          </div>
          <span className="text-lg">Limited</span>
        </div>
      </div>
      <div className="absolute bottom-12 flex items-center gap-4">
        <button
          className="p-4 cursor-pointer flex items-center gap-2 btn rounded-full"
          onClick={prevScreen}
        >
          <ChevronLeft className="size-6" />
        </button>
        <button
          className="px-8 py-4 cursor-pointer flex items-center gap-2 btn-accent rounded-full"
          onClick={() => nextScreen(selectedExperience === 'full')}
        >
          {selectedExperience === 'full' ? (
            <>
              <span className="text-xl">Next</span>
              <ChevronRight className="size-6" />
            </>
          ) : (
            <>
              <span className="text-xl">Finish</span>
              <Check className="size-6" />
            </>
          )}
        </button>
      </div>
    </>
  )
}

function SetupSubsonic({ prevScreen, finish }: { prevScreen: () => void; finish: () => void }) {
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
        const ping = await window.api.subsonic.ping()
        if (ping.success) {
          setStatusMsg('Credentials saved successfully')
          setPassword('')
        } else {
          setError(
            result.error ||
              'Failed to authenticate with the server. Please check your credentials and server URL.'
          )
          setStatusMsg(null)
        }
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
      <span className="text-3xl font-thin">Set up your Subsonic/Navidrome account</span>
      <div className="p-4 min-w-120">
        {configured && !serverUrl ? (
          <div className="mb-4 text-green-600 dark:text-green-300 font-bold text-xs uppercase">
            Connected as {username}
          </div>
        ) : null}

        {error && (
          <div className="mb-4 text-red-600 dark:text-red-300 font-bold text-xs uppercase">
            {error}
          </div>
        )}

        {statusMsg && !error && (
          <div className="mb-4 text-green-600 dark:text-green-300 font-bold text-xs uppercase">
            {statusMsg}
          </div>
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
              className="use-transition px-3 py-2 bg-second-layer-thin dark:bg-second-layer-thin-dark focus:bg-second-layer-thin-active dark:focus:bg-second-layer-thin-dark-active border border-faint shadow-glass rounded-md outline-none focus:border-subtle"
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
              className="use-transition px-3 py-2 bg-second-layer-thin dark:bg-second-layer-thin-dark focus:bg-second-layer-thin-active dark:focus:bg-second-layer-thin-dark-active border border-faint shadow-glass rounded-md outline-none focus:border-subtle"
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
              className="use-transition px-3 py-2 bg-second-layer-thin dark:bg-second-layer-thin-dark focus:bg-second-layer-thin-active dark:focus:bg-second-layer-thin-dark-active border border-faint shadow-glass rounded-md outline-none focus:border-subtle"
              required={!configured}
            />
          </div>

          <div className="flex gap-2 mt-2 ml-auto">
            <button
              type="submit"
              className="p-3 rounded-full cursor-pointer gap-2 flex items-center btn"
            >
              <Save className="size-5" />
            </button>

            {configured && (
              <button
                type="button"
                onClick={handleClear}
                className="p-3 rounded-full cursor-pointer gap-2 flex items-center btn-danger"
              >
                <X className="size-5" />
              </button>
            )}
          </div>
        </form>
      </div>
      <div className="absolute bottom-12 flex items-center gap-4">
        <button
          className="p-4 cursor-pointer flex items-center gap-2 btn rounded-full"
          onClick={prevScreen}
        >
          <ChevronLeft className="size-6" />
        </button>
        <button
          className="px-8 py-4 cursor-pointer flex items-center gap-2 btn-accent rounded-full disabled:btn disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={finish}
          disabled={!configured}
        >
          <span className="text-xl">Finish</span>
          <Check className="size-6" />
        </button>
      </div>
    </>
  )
}

function WelcomeScreen() {
  const [currentScreen, setCurrentScreen] = useState(1)
  const { setSubsonicEnabled } = useSubsonic()
  const { completeSetup } = useAppSetup()

  return (
    <WelcomeScreenWrapper>
      {currentScreen === 1 && <WelcomeScreen1 nextScreen={() => setCurrentScreen((a) => a + 1)} />}
      {currentScreen === 2 && <SelectCountry nextScreen={() => setCurrentScreen((a) => a + 1)} />}
      {currentScreen === 3 && (
        <SelectExperience
          nextScreen={(isEnabled) => {
            if (isEnabled) {
              setCurrentScreen((a) => a + 1)
            } else completeSetup()
            setSubsonicEnabled(isEnabled)
          }}
          prevScreen={() => setCurrentScreen((a) => a - 1)}
        />
      )}
      {currentScreen === 4 && (
        <SetupSubsonic prevScreen={() => setCurrentScreen((a) => a - 1)} finish={completeSetup} />
      )}
    </WelcomeScreenWrapper>
  )
}

export default WelcomeScreen
