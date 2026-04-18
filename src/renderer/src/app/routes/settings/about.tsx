import { createFileRoute } from '@tanstack/react-router'
import Wordmark from '@renderer/assets/wordmark'

export const Route = createFileRoute('/settings/about')({
  component: AboutSection
})

function AboutSection() {
  return (
    <div className="settings-section flex flex-col gap-4">
      <div className="flex items-center gap-4 mt-6">
        <div className="flex flex-col items-start">
          <div className="shrink-0 flex items-center justify-center gap-1">
            <Wordmark height="3rem" className="fill-black dark:fill-white w-max" />
            <span className="font-unbounded text-5xl font-thin -tracking-wider">Music</span>
          </div>
          <span className="font-unbounded font-thin -tracking-wider">For Desktop</span>
        </div>
      </div>

      <p className="text-zinc-700 dark:text-zinc-300">
        Next-gen music experience. Stream your favourite music and radio stations
      </p>

      <p className="text-zinc-700 dark:text-zinc-300">Version 2.0.0</p>
    </div>
  )
}
