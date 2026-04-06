import { useTheme } from '../../contexts/theme-context'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/settings/appearance')({
  component: AppearanceSettings
})

function AppearanceSettings() {
  const { setTheme, theme } = useTheme()
  return (
    <>
      <div className="settings-section">
        <div className="settings-item">
          <label className="settings-label">Theme</label>
          <div className="settings-theme-options">
            <button
              className={
                'settings-theme-option' + (theme === 'light' ? ' settings-theme-option-active' : '')
              }
              onClick={() => setTheme('light')}
            >
              Light
            </button>
            <button
              className={
                'settings-theme-option' + (theme === 'dark' ? ' settings-theme-option-active' : '')
              }
              onClick={() => setTheme('dark')}
            >
              Dark
            </button>
            <button
              className={
                'settings-theme-option' +
                (theme === 'system' ? ' settings-theme-option-active' : '')
              }
              onClick={() => setTheme('system')}
            >
              System Default
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default AppearanceSettings
