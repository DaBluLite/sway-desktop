import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useFavourites } from '@renderer/contexts/favourites-context'
import { useAudioPlayer } from '@renderer/contexts/audio-player-context'
import { usePlaylists, Playlist } from '@renderer/contexts/playlists-context'
import { useHistory } from '@renderer/contexts/history-context'
import { StationItem } from '@renderer/components/station-item'
import { PlaylistCarousel } from '@renderer/components/playlist-carousel'
import { StaticStationCarousel } from '@renderer/components/static-station-carousel'
import { Station } from 'radio-browser-api'
import { Icon } from '@mdi/react'
import { mdiChevronRight } from '@mdi/js'

export const Route = createFileRoute('/library/')({
  component: LibraryPage
})

export default function LibraryPage() {
  const router = useRouter()
  const { favourites } = useFavourites()
  const { playlists, deletePlaylist, duplicatePlaylist } = usePlaylists()
  const { play } = useAudioPlayer()
  const { getRecentStations } = useHistory()
  const recentStations = getRecentStations(10)

  const handlePlaylistSelect = (playlist: Playlist) => {
    // Navigate to library playlists page with selected playlist
    router.navigate({ to: `/library/playlists`, search: { id: playlist.id } })
  }

  const handleViewAllStations = () => {
    router.navigate({ to: `/library/stations` })
  }

  const handleViewAllPlaylists = () => {
    router.navigate({ to: `/library/playlists` })
  }

  const handleViewAllHistory = () => {
    router.navigate({ to: `/library/history` })
  }

  const handleDeletePlaylist = (playlistId: string) => {
    deletePlaylist(playlistId)
  }

  const handleDuplicatePlaylist = (playlistId: string) => {
    duplicatePlaylist(playlistId)
  }

  const handlePlayStation = (station: Station) => {
    play(station)
  }

  return (
    <div className="flex min-h-screen w-full justify-center font-sans">
      <main className="main-page">
        {/* Favourite Stations Section */}
        <button
          onClick={handleViewAllStations}
          className="w-full flex items-center justify-between mb-6 hover:opacity-75 transition text-left"
        >
          <h2 className="text-2xl font-bold font-unbounded ml-3 text-black dark:text-white">
            Favourite Stations
          </h2>
          <span className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
            View all
            <Icon path={mdiChevronRight} size={0.8} />
          </span>
        </button>

        {favourites.length === 0 ? (
          <p className="text-gray-800 dark:text-gray-500 mb-8 ml-3">No favourite stations yet.</p>
        ) : (
          <div className="flex flex-col gap-4 w-full mb-12 ml-6">
            {favourites.slice(0, 5).map((radio) => {
              return <StationItem key={radio.url} station={radio} onPlay={handlePlayStation} />
            })}
          </div>
        )}

        {/* Recently Played Section */}
        {recentStations.length > 0 && (
          <div className="w-full mb-8">
            <button
              onClick={handleViewAllHistory}
              className="w-full flex items-center justify-between mb-6 hover:opacity-75 transition text-left"
            >
              <h2 className="text-2xl font-bold font-unbounded ml-3 text-black dark:text-white">
                Recently Played
              </h2>
              <span className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
                View all
                <Icon path={mdiChevronRight} size={0.8} />
              </span>
            </button>
            <StaticStationCarousel stations={recentStations} onStationPlay={handlePlayStation} />
          </div>
        )}

        {/* Your Playlists Section */}
        {playlists.length > 0 && (
          <div className="w-full">
            <button
              onClick={handleViewAllPlaylists}
              className="w-full flex items-center justify-between mb-6 hover:opacity-75 transition text-left"
            >
              <h2 className="text-2xl font-bold font-unbounded ml-3 text-black dark:text-white">
                Your Playlists
              </h2>
              <span className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
                View all
                <Icon path={mdiChevronRight} size={0.8} />
              </span>
            </button>
            <PlaylistCarousel
              title=""
              playlists={playlists.slice(0, 10)}
              onPlaylistSelect={handlePlaylistSelect}
              onPlaylistDelete={handleDeletePlaylist}
              onPlaylistDuplicate={handleDuplicatePlaylist}
            />
          </div>
        )}
      </main>
    </div>
  )
}
