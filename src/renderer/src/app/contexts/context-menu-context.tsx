import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'

export interface ContextMenuItem {
  text: string
  onClick?: () => void
  Icon?: () => React.ReactNode
  items?: ContextMenuItem[]
  danger?: boolean
}

interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

interface ContextMenuContextType {
  openContextMenu: (props: ContextMenuProps) => void
  closeContextMenu: () => void
}

const ContextMenuContext = createContext<ContextMenuContextType | undefined>(undefined)

const MenuItem: React.FC<{ item: ContextMenuItem; onClose: () => void }> = ({ item, onClose }) => {
  const [showSubmenu, setShowSubmenu] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const itemRef = useRef<HTMLDivElement>(null)

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setShowSubmenu(true)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setShowSubmenu(false)
    }, 100)
  }

  const handleClick = (e: React.MouseEvent) => {
    if (item.items) {
      e.stopPropagation()
      return
    }
    if (item.onClick) {
      item.onClick()
      onClose()
    }
  }

  return (
    <div
      ref={itemRef}
      className={`context-menu-item ${item.danger ? 'danger' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {item.Icon && (
        <div className="flex items-center justify-center w-4 h-4 shrink-0">
          <item.Icon />
        </div>
      )}
      <span className="flex-1 truncate">{item.text}</span>
      {item.items && (
        <div className="ml-auto pl-2 opacity-50">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="9 5l7 7-7 7" />
          </svg>
        </div>
      )}

      {showSubmenu && item.items && (
        <div
          className="absolute left-full top-0 ml-1 min-w-45 py-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-xl z-1001"
          style={{ transform: 'translateZ(0)' }}
        >
          {item.items.map((subItem, idx) => (
            <MenuItem key={idx} item={subItem} onClose={onClose} />
          ))}
        </div>
      )}
    </div>
  )
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (menuRef.current) {
      const menu = menuRef.current
      const rect = menu.getBoundingClientRect()
      const winW = window.innerWidth
      const winH = window.innerHeight

      let newX = x
      let newY = y

      // Adjust if off screen
      if (x + rect.width > winW) newX = x - rect.width
      if (y + rect.height > winH) newY = y - rect.height

      // Ensure not off top/left
      if (newX < 0) newX = 5
      if (newY < 0) newY = 5

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPos({ x: newX, y: newY })
    }
  }, [x, y])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-1000 overflow-hidden"
      onClick={onClose}
      onContextMenu={(e) => {
        e.preventDefault()
        onClose()
      }}
    >
      <div
        ref={menuRef}
        className={'absolute context-menu' + (pos.x === 0 && pos.y === 0 ? ' invisible' : '')}
        style={{
          left: pos.x,
          top: pos.y,
          transform: 'translateZ(0)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((item, idx) => (
          <MenuItem key={idx} item={item} onClose={onClose} />
        ))}
      </div>
    </div>,
    document.body
  )
}

export const ContextMenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuProps | null>(null)

  const openContextMenu = useCallback((props: ContextMenuProps) => {
    setContextMenu(props)
  }, [])

  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  return (
    <ContextMenuContext.Provider value={{ openContextMenu, closeContextMenu }}>
      {children}
      {contextMenu && <ContextMenu {...contextMenu} onClose={closeContextMenu} />}
    </ContextMenuContext.Provider>
  )
}

export const useContextMenu = () => {
  const context = useContext(ContextMenuContext)
  if (!context) {
    throw new Error('useContextMenu must be used within a ContextMenuProvider')
  }
  return context
}
