import { createFileRoute } from '@tanstack/react-router'
import Wordmark from '@renderer/assets/wordmark'

export const Route = createFileRoute('/settings/about')({
  component: AboutSection
})

function AboutSection() {
  return (
    <div className="settings-section flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="shrink-0 flex items-start justify-center flex-col">
          <Wordmark height="3rem" className="fill-black dark:fill-white w-max" />
          <span className="font-unbounded">Desktop</span>
        </div>
      </div>

      <p className="text-zinc-700 dark:text-zinc-300">
        A new way to listen to and explore radio stations worldwide.
      </p>

      <p className="text-zinc-700 dark:text-zinc-300">Version 2.0.0 - Released June 2024</p>

      <div className="flex flex-col gap-3">
        <div className="settings-item">
          <label className="settings-label mb-2">Features</label>
          <ul className="text-zinc-700 dark:text-zinc-300 text-sm flex flex-col gap-1 list-disc list-inside">
            <li>Browse thousands of radio stations worldwide</li>
            <li>Save favourite stations for quick access</li>
            <li>Sleep timer for falling asleep to radio</li>
            <li>Listening history tracking</li>
            <li>Keyboard shortcuts for power users</li>
            <li>Interactive radio map</li>
            <li>Chromecast support</li>
            <li>Works offline (PWA)</li>
          </ul>
        </div>

        <div className="settings-item mt-4">
          <label className="settings-label">Data Source</label>
          <p className="text-zinc-700 dark:text-zinc-300 text-sm">
            Station data provided by{' '}
            <a
              href="https://www.radio-browser.info/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 hover:text-green-300 underline"
            >
              Radio Browser
            </a>
            , a community-driven database of internet radio stations.
          </p>
        </div>
      </div>
    </div>
  )
}
