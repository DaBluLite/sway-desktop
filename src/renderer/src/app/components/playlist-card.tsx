import { useEffect, useState } from 'react'
import { Icon } from '@mdi/react'
import {
  mdiPencil,
  mdiDelete,
  mdiContentDuplicate,
  mdiShareVariant,
  mdiChevronRight
} from '@mdi/js'
import { Playlist } from '../contexts/playlists-context'

interface PlaylistCardProps {
  playlist: Playlist
  onEdit?: (playlist: Playlist) => void
  onDelete?: (playlistId: string) => void
  onDuplicate?: (playlistId: string) => void
  onShare?: (playlist: Playlist) => void
  onSelect?: (playlist: Playlist) => void
}

export const PlaylistCard: React.FC<PlaylistCardProps> = ({
  playlist,
  onEdit,
  onDelete,
  onDuplicate,
  onShare,
  onSelect
}: PlaylistCardProps) => {
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
  } | null>(null)

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const handleCloseContextMenu = () => {
    setContextMenu(null)
  }

  const handleSelect = () => {
    onSelect?.(playlist)
    handleCloseContextMenu()
  }

  const handleEdit = () => {
    onEdit?.(playlist)
    handleCloseContextMenu()
  }

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${playlist.name}"?`)) {
      onDelete?.(playlist.id)
      handleCloseContextMenu()
    }
  }

  const handleDuplicate = () => {
    onDuplicate?.(playlist.id)
    handleCloseContextMenu()
  }

  const handleShare = () => {
    onShare?.(playlist)
    handleCloseContextMenu()
  }

  useEffect(() => {
    if (!contextMenu) return
    document.addEventListener('click', handleCloseContextMenu)
    return () => document.removeEventListener('click', handleCloseContextMenu)
  }, [contextMenu])

  const backgroundColor = playlist.color || '#22c55e'

  return (
    <>
      <div
        className="playlist-card cursor-pointer group"
        onContextMenu={handleContextMenu}
        onClick={handleSelect}
      >
        <div className="playlist-card-image-container" style={{ backgroundColor }}>
          <div className="playlist-card-icon-wrapper">
            <span className="playlist-card-icon">{playlist.icon || '🎵'}</span>
          </div>
          <div className="playlist-card-play-overlay">
            <div className="playlist-card-hover-info">
              <Icon path={mdiChevronRight} size={1.5} color="currentColor" />
            </div>
          </div>
        </div>
        <div className="playlist-card-info">
          <h3 className="playlist-card-title">{playlist.name}</h3>
          <p className="playlist-card-count">
            {playlist.stations.length} {playlist.stations.length === 1 ? 'station' : 'stations'}
          </p>
          {playlist.description && (
            <p className="playlist-card-description">{playlist.description}</p>
          )}
        </div>
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
          <button className="context-menu-item" onClick={handleEdit}>
            <Icon path={mdiPencil} size={0.7} color="currentColor" />
            <span>Edit playlist</span>
          </button>
          <button className="context-menu-item" onClick={handleDuplicate}>
            <Icon path={mdiContentDuplicate} size={0.7} color="currentColor" />
            <span>Duplicate</span>
          </button>
          <button className="context-menu-item" onClick={handleShare}>
            <Icon path={mdiShareVariant} size={0.7} color="currentColor" />
            <span>Share playlist</span>
          </button>
          <button className="context-menu-item context-menu-item-danger" onClick={handleDelete}>
            <Icon path={mdiDelete} size={0.7} color="currentColor" />
            <span>Delete</span>
          </button>
        </div>
      )}
    </>
  )
}
