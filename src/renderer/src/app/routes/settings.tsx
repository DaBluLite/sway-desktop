import { createFileRoute, Link, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/settings')({
  component: Settings
})

function Settings() {
  return (
    <div className="flex flex-col w-full h-full grow pt-7.5">
      <div className="settings-sidebar-wrapper">
        <Link to="/settings" activeOptions={{ exact: true }} className="settings-sidebar-item">
          System
        </Link>
        <Link to="/settings/audio" className="settings-sidebar-item">
          Audio
        </Link>
        <Link to="/settings/history" className="settings-sidebar-item">
          History
        </Link>
        <Link to="/settings/subsonic" className="settings-sidebar-item">
          Subsonic
        </Link>
        <Link to="/settings/about" className="settings-sidebar-item">
          About
        </Link>
      </div>
      <div className="settings-content">
        <Outlet />
      </div>
    </div>
  )
}
