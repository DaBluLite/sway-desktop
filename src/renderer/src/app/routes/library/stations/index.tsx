import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useFavourites } from '@renderer/contexts/favourites-context'
import { useAudioPlayer } from '@renderer/contexts/audio-player-context'
import { StationItem } from '@renderer/components/station-item'
import { Station } from 'radio-browser-api'
import { Icon } from '@mdi/react'
import { mdiChevronLeft } from '@mdi/js'

export const Route = createFileRoute('/library/stations/')({
  component: StationsPage
})

function StationsPage() {
  const router = useRouter()
  const { favourites } = useFavourites()
  const { play } = useAudioPlayer()

  const handlePlayStation = (station: Station) => {
    play(station)
  }

  const handleBack = () => {
    router.history.back()
  }

  return (
    <div className="flex min-h-screen justify-center font-sans w-full">
      <main className="main-page">
        <div className="mb-6 flex gap-4 w-full">
          <h1 className="text-3xl font-bold text-black dark:text-white">Favourite Stations</h1>
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-green-500 hover:text-green-400 transition"
          >
            <Icon path={mdiChevronLeft} size={1} />
            Back to Library
          </button>
        </div>
        {favourites.length === 0 ? (
          <p className="text-gray-800 dark:text-gray-500 mb-8">No favourite stations yet.</p>
        ) : (
          <div className="flex flex-col gap-4 w-full pb-24">
            {favourites.map((radio) => {
              return <StationItem key={radio.url} station={radio} onPlay={handlePlayStation} />
            })}
          </div>
        )}
      </main>
    </div>
  )
}
