import { useAudioPlayer } from '@renderer/contexts/audio-player-context'
import { createFileRoute } from '@tanstack/react-router'
import { useFavourites } from '@renderer/contexts/favourites-context'
import { StationCard } from '@renderer/components/station-card'

export const Route = createFileRoute('/library/stations/')({
  component: RouteComponent
})

function RouteComponent() {
  const { favourites } = useFavourites()
  const { play } = useAudioPlayer()

  return (
    <div className="flex flex-col w-full h-screen">
      <div className="station-carousel-header pl-8">
        <h2 className="station-carousel-title">Stations</h2>
      </div>
      <div className="overflow-y-auto flex flex-wrap px-12 pt-8 pb-35 gap-x-4">
        {favourites?.map((station, i) => (
          <StationCard key={station.url + '_' + i} station={station} onPlay={() => play(station)} />
        ))}
      </div>
    </div>
  )
}
