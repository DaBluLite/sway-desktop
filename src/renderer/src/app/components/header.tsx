import { Link, useRouter } from '@tanstack/react-router'
import { ChevronRight, ChevronLeft, Search, X, EllipsisVertical, House } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import { useSearch } from '@renderer/contexts/search-context'
import { useSubsonic } from '@renderer/contexts/subsonic-context'
import Wordmark from '@renderer/assets/wordmark'

function Header() {
  const router = useRouter()
  const { searchValue, setSearchValue } = useSearch()
  const [localSearch, setLocalSearch] = useState(searchValue)
  const canGoForward = router.history.location.state.__TSR_index < router.history.length - 1
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { subsonicEnabled } = useSubsonic()
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
  } | null>(null)

  // Sync local search with global search value
  useEffect(() => {
    setLocalSearch(searchValue)
  }, [searchValue])

  // Clear search if not on search page
  useEffect(() => {
    if (!router.state.location.pathname.startsWith('/search')) {
      setSearchValue('')
      setLocalSearch('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.state.location.pathname])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setLocalSearch(value)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      setSearchValue(value)
      if (value.trim()) {
        if (!router.state.location.pathname.startsWith('/search')) {
          router.navigate({ to: '/search' })
        }
      } else if (router.state.location.pathname.startsWith('/search')) {
        router.navigate({ to: subsonicEnabled ? '/' : '/radio' })
      }
    }, 500)
  }

  const handleContextMenu = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const handleCloseContextMenu = (): void => {
    setContextMenu(null)
  }

  useEffect(() => {
    document.addEventListener('click', handleCloseContextMenu)
    return () => document.removeEventListener('click', handleCloseContextMenu)
  }, [contextMenu])

  const handleClear = () => {
    setLocalSearch('')
    setSearchValue('')
    if (router.state.location.pathname.startsWith('/search')) {
      router.navigate({ to: subsonicEnabled ? '/' : '/radio' })
    }
  }

  return (
    <>
      <div
        className={`flex items-center group justify-between h-16 w-full px-4 shrink-0 ${subsonicEnabled ? '' : 'no-subsonic'}`}
      >
        <div className="flex items-center gap-2">
          {!subsonicEnabled && (
            <>
              <div className="flex justify-between items-center gap-2">
                <Wordmark className="use-theme-text h-6 m-3 w-fit" />
                <button
                  className="invis-btn rounded-full p-2 cursor-pointer"
                  onClick={handleContextMenu}
                >
                  <EllipsisVertical className="use-theme-text size-4" />
                </button>
              </div>
            </>
          )}
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
            {!subsonicEnabled && (
              <Link to="/radio" className="btn rounded-sm p-2.5">
                <House className="size-4" />
              </Link>
            )}
            <div className="absolute inset-y-0 left-0 group-[.no-subsonic]:left-11.5 pl-3 flex items-center pointer-events-none">
              <Search className="size-4 opacity-50" />
            </div>
            <input
              type="text"
              value={localSearch}
              onChange={handleSearchChange}
              placeholder="Search for music, artists, albums, or radio stations..."
              className="w-full text-input rounded-sm! py-2 pl-10 pr-10 text-sm transition-all outline-none"
            />
            {localSearch && (
              <button
                onClick={handleClear}
                className="absolute inset-y-0 right-0 pr-3 flex items-center hover:opacity-100 opacity-50 transition-opacity"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        <div className="w-23 group-[.no-subsonic]:w-70 shrink-0" />
      </div>
      {contextMenu && (
        <div
          className="context-menu"
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 1000
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="context-menu-item"
            onClick={() => {
              router.navigate({ to: '/settings' })
              handleCloseContextMenu()
            }}
          >
            <span>Settings</span>
          </button>
        </div>
      )}
    </>
  )
}

export default Header
