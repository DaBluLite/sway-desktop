import Wordmark from '@renderer/assets/wordmark'
import { useWindow } from '@renderer/contexts/window-context'
import { Link, useRouter } from '@tanstack/react-router'
import {
  Cog,
  Disc3,
  EllipsisVertical,
  House,
  ListCheck,
  ListMusic,
  MicVocal,
  Music,
  PencilLine,
  Plus,
  Radio,
  SortDesc,
  Trash
} from 'lucide-react'
import { usePlaylists } from '@renderer/contexts/playlists-context'
import { useSubsonic } from '@renderer/contexts/subsonic-context'
import { useCurations } from '@renderer/contexts/curations-context'
import { SubsonicPlaylist } from '../../../../types/subsonic'
import { useContextMenu } from '@renderer/contexts/context-menu-context'
import { useState } from 'react'
import { useModal } from '@renderer/contexts/modal-context'

function Navbar() {
  const { openContextMenu } = useContextMenu()
  const { subsonicEnabled } = useSubsonic()
  const { playlists } = usePlaylists()
  const { collections } = useCurations()
  const {
    openEditPlaylistModal,
    openDeletePlaylistModal,
    openCreateCurationModal,
    openCreatePlaylistModal,
    openEditCurationModal,
    openDeleteCurationModal
  } = useModal()
  const [playlistSort, setPlaylistSort] = useState<'name' | 'songCount'>('name')
  const [curationSort, setCurationSort] = useState<'name' | 'stationCount'>('name')

  const handleMinimize = () => {
    window.api.window.minimize()
  }

  const handleToggleMaximize = () => {
    window.api.window.toggleMaximize()
  }

  const handleClose = () => {
    window.api.window.close()
  }
  const { windowState } = useWindow()

  const router = useRouter()

  function handlePlaylistContextMenu(e: React.MouseEvent, playlist: SubsonicPlaylist) {
    e.preventDefault()
    e.stopPropagation()
    openContextMenu({
      x: e.clientX,
      y: e.clientY,
      onClose: () => {
        // Any cleanup if needed when context menu closes
      },
      items: [
        {
          text: 'Edit Playlist',
          onClick: () => {
            openEditPlaylistModal(playlist.id)
          }
        },
        {
          text: 'Delete Playlist',
          onClick: () => {
            openDeletePlaylistModal(playlist.id)
          }
        }
      ]
    })
    // You can also store the playlistId in state if you want to perform actions on it
  }

  const handleSettingsContextMenu = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.preventDefault()
    e.stopPropagation()
    openContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          text: 'Settings',
          onClick: () => router.navigate({ to: '/settings' }),
          Icon() {
            return <Cog className="size-4" />
          }
        }
      ],
      onClose: () => {}
    })
  }

  return (
    <>
      <div className="navbar">
        <div className="flex justify-between items-center gap-2">
          <Wordmark className="use-theme-text h-6 m-3 w-fit" />
          <button
            className="invis-btn rounded-full p-2 cursor-pointer"
            onClick={handleSettingsContextMenu}
          >
            <EllipsisVertical className="use-theme-text size-4" />
          </button>
        </div>
        {subsonicEnabled && (
          <Link to="/" className="nav-item">
            <House className="size-4" />
            Home
          </Link>
        )}
        <Link to="/radio" className="nav-item">
          {subsonicEnabled ? <Radio className="size-4" /> : <House className="size-4" />}
          {subsonicEnabled ? 'Radio' : 'Home'}
        </Link>
        <div className="navbar-categories">
          <div className="navbar-category">
            <span className="navbar-category-header">Library</span>
            {subsonicEnabled && (
              <>
                <Link to="/library/songs" className="nav-item">
                  <Music className="size-4" />
                  Songs
                </Link>
                <Link to="/library/albums" className="nav-item">
                  <Disc3 className="size-4" />
                  Albums
                </Link>
                <Link to="/library/artists" className="nav-item">
                  <MicVocal className="size-4" />
                  Artists
                </Link>
                <Link to="/library/playlists" className="nav-item">
                  <ListMusic className="size-4" />
                  Playlists
                </Link>
              </>
            )}
            <Link to="/library/stations" className="nav-item">
              <Radio className="size-4" />
              Stations
            </Link>
            <Link to="/library/curations" className="nav-item">
              <ListCheck className="size-4" />
              Curations
            </Link>
            <div className="navbar-category-header flex items-center justify-between">
              <span>{subsonicEnabled ? 'Playlists' : 'Collections'}</span>
              <div className="flex items-center gap-1">
                <button
                  className="cursor-pointer use-theme-text opacity-50"
                  onClick={() =>
                    subsonicEnabled
                      ? setPlaylistSort(playlistSort === 'name' ? 'songCount' : 'name')
                      : setCurationSort(curationSort === 'name' ? 'stationCount' : 'name')
                  }
                >
                  <SortDesc className="size-4" />
                </button>
                <button
                  className="cursor-pointer use-theme-text opacity-50"
                  onClick={() =>
                    subsonicEnabled ? openCreatePlaylistModal() : openCreateCurationModal()
                  }
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
            {subsonicEnabled
              ? playlists
                  .sort((a, b) => {
                    if (playlistSort === 'name') {
                      return a.name.localeCompare(b.name)
                    } else {
                      return b.songCount - a.songCount
                    }
                  })
                  .map((pl) => (
                    <Link
                      key={pl.id}
                      to={'/library/playlists/$playlistId'}
                      params={{ playlistId: pl.id }}
                      className="nav-item"
                      onContextMenu={(e) => {
                        handlePlaylistContextMenu(e, pl)
                      }}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span>{pl.name}</span>
                        <span className="text-xs opacity-50">{pl.songCount} Songs</span>
                      </div>
                    </Link>
                  ))
              : collections
                  .sort((a, b) => {
                    if (playlistSort === 'name') {
                      return a.name.localeCompare(b.name)
                    } else {
                      return b.stations.length - a.stations.length
                    }
                  })
                  .map((collection) => {
                    return (
                      <Link
                        key={collection.id}
                        to={'/library/curations/$curationId'}
                        params={{ curationId: collection.id }}
                        className="nav-item"
                        onContextMenu={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          openContextMenu({
                            x: e.clientX,
                            y: e.clientY,
                            items: [
                              {
                                text: 'Edit',
                                onClick: () => openEditCurationModal(collection.id),
                                Icon() {
                                  return <PencilLine className="size-4" />
                                }
                              },
                              {
                                text: 'Delete',
                                onClick: () => openDeleteCurationModal(collection.id),
                                Icon() {
                                  return <Trash className="size-4" />
                                }
                              }
                            ],
                            onClose: () => {}
                          })
                        }}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span>{collection.name}</span>
                          <span className="text-xs opacity-50">
                            {collection.stations.length} Stations
                          </span>
                        </div>
                      </Link>
                    )
                  })}
          </div>
        </div>
      </div>
      <div className="titlebar">
        <button className="titlebar-item" onClick={handleMinimize} aria-label="Minimize window">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="size-4"
          >
            <path
              fillRule="evenodd"
              d="M4.25 12a.75.75 0 0 1 .75-.75h14a.75.75 0 0 1 0 1.5H5a.75.75 0 0 1-.75-.75Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        <button
          className="titlebar-item"
          onClick={handleToggleMaximize}
          aria-label="Maximize/Restore window"
        >
          {windowState.isMaximized ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 8.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v8.25A2.25 2.25 0 0 0 6 16.5h2.25m8.25-8.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-7.5A2.25 2.25 0 0 1 8.25 18v-1.5m8.25-8.25h-6a2.25 2.25 0 0 0-2.25 2.25v6"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="size-3 m-0.5!"
            >
              <rect strokeWidth="3" width={24} height={24} fill="none" stroke="currentColor" />
            </svg>
          )}
        </button>
        <button
          className="titlebar-item titlebar-item_close"
          onClick={handleClose}
          aria-label="Close window"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="size-4"
          >
            <path
              fillRule="evenodd"
              d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </>
  )
}

export default Navbar
