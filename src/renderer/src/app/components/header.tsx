import { useRouter } from '@tanstack/react-router'
import { ChevronRight, ChevronLeft, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearch } from '@renderer/contexts/search-context'
import { useSubsonic } from '@renderer/contexts/subsonic-context'

function Header() {
  const router = useRouter()
  const { setSearchValue: setContextSearchValue } = useSearch()
  const [localSearchValue, setLocalSearchValue] = useState('')
  const canGoForward = router.history.location.state.__TSR_index < router.history.length - 1
  const { subsonicEnabled } = useSubsonic()

  // Sync local state with context when navigating away from search page
  useEffect(() => {
    if (!router.state.location.pathname.startsWith('/search')) {
      setLocalSearchValue('')
      setContextSearchValue('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.state.location.pathname])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setLocalSearchValue(value)
  }

  const handleClear = () => {
    setLocalSearchValue('')
    setContextSearchValue('')
    if (router.state.location.pathname.startsWith('/search')) {
      router.navigate({ to: subsonicEnabled ? '/' : '/radio' })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (localSearchValue.trim()) {
        setContextSearchValue(localSearchValue)
        if (!router.state.location.pathname.startsWith('/search')) {
          router.navigate({ to: '/search' })
        }
      }
    }
  }

  return (
    <>
      <div className={`flex items-center justify-between h-16 w-full px-4 shrink-0`}>
        <div className="flex items-center gap-2">
          <button
            className="invis-btn cursor-pointer rounded-full p-3 disabled:opacity-50 disabled:cursor-default"
            disabled={!router.history.canGoBack()}
            onClick={() => router.history.back()}
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            className="invis-btn cursor-pointer rounded-full p-3 disabled:opacity-50 disabled:cursor-default"
            disabled={!canGoForward}
            onClick={() => router.history.forward()}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="flex-1 max-w-xl px-4">
          <div className={`relative flex items-center gap-2`}>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="size-4 opacity-50" />
            </div>
            <input
              type="text"
              value={localSearchValue}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              placeholder="Search for music, artists, albums, or radio stations..."
              className="w-full text-input rounded-sm! py-2 pl-10 pr-10 text-sm transition-all outline-none"
            />
            {localSearchValue && (
              <button
                onClick={handleClear}
                className="absolute inset-y-0 right-0 pr-3 flex items-center hover:opacity-100 opacity-50 transition-opacity"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        <div className="w-23 shrink-0" />
      </div>
    </>
  )
}

export default Header
