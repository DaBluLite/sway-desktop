import { useLibrary } from '@renderer/contexts/library-context'
import { createFileRoute } from '@tanstack/react-router'
import { ArtistCard } from '@renderer/components/artist-card'

export const Route = createFileRoute('/library/artists/')({
  component: RouteComponent
})

function RouteComponent() {
  const { starred } = useLibrary()
  const starredArtists = starred?.artist || []

  return (
    <div className="flex flex-col w-full h-screen">
      <div className="station-carousel-header pl-8">
        <h2 className="station-carousel-title">Artists</h2>
      </div>
      <div className="overflow-y-auto flex flex-wrap px-12 pt-8 pb-35 gap-x-4">
        {starredArtists?.map((artist) => (
          <ArtistCard key={artist.id} artist={artist} />
        ))}
      </div>
    </div>
  )
}
