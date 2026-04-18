import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { useFavourites } from '@renderer/contexts/favourites-context'
import { useAudioPlayer } from '@renderer/contexts/audio-player-context'
import { usePlaylists } from '@renderer/contexts/playlists-context'
import { useLibrary } from '@renderer/contexts/library-context'
import { useHistory } from '@renderer/contexts/history-context'
import { PlaylistCarousel } from '@renderer/components/playlist-carousel'
import { StaticStationCarousel } from '@renderer/components/static-station-carousel'
import { AlbumCard } from '@renderer/components/album-card'
import { Station } from 'radio-browser-api'
import { Icon } from '@mdi/react'
import { mdiChevronRight, mdiLoading, mdiAccount, mdiMusicNote } from '@mdi/js'
import { SubsonicAlbum, SubsonicPlaylist, SubsonicSong } from '../../../../../types/subsonic'
import StationRow from '@renderer/components/station-row'
import StationListHeader from '@renderer/components/station-list-header'

export const Route = createFileRoute('/library/')({
  component: LibraryPage
})

function LibraryPage() {
  const router = useRouter()
  const { favourites } = useFavourites()
  const { starred, loading, refreshStarred } = useLibrary()
  const { playlists } = usePlaylists()
  const { play, playSong } = useAudioPlayer()
  const { getRecentStations } = useHistory()
  const recentStations = getRecentStations(10)
  const [subsonicConfigured, setSubsonicConfigured] = useState(false)

  useEffect(() => {
    window.api.subsonic.getCredentialsStatus().then((status) => {
      setSubsonicConfigured(status.configured)
      if (status.configured) {
        refreshStarred()
      }
    })

    const cleanup = window.api.subsonic.onCredentialsChanged((status) => {
      setSubsonicConfigured(status.configured)
      if (status.configured) {
        refreshStarred()
      }
    })

    return cleanup
  }, [refreshStarred])

  const handlePlayPlaylist = useCallback(
    async (album: SubsonicPlaylist) => {
      const result = await window.api.subsonic.getPlaylist(album.id)
      if (result.success && result.data && (result.data as { entry: SubsonicSong[] }).entry) {
        const albumData = result.data as { entry: SubsonicSong[] }
        playSong(albumData.entry, albumData.entry[0].id)
      }
    },
    [playSong]
  )

  const handleViewAllStations = () => {
    router.navigate({ to: `/library/stations` })
  }

  const handleViewAllPlaylists = () => {
    router.navigate({ to: `/library/playlists` })
  }

  const handleViewAllHistory = () => {
    router.navigate({ to: `/settings/history` })
  }

  const handlePlayStation = (station: Station) => {
    play(station)
  }

  const handlePlayAlbum = async (album: SubsonicAlbum) => {
    const result = await window.api.subsonic.getAlbum(album.id)
    if (result.success && result.data) {
      const albumData = result.data as { songs?: SubsonicSong[] }
      if (albumData.songs && albumData.songs.length > 0) {
        playSong(albumData.songs, albumData.songs[0].id)
      }
    }
  }

  const handlePlaySong = (song: SubsonicSong) => {
    if (starred?.song) {
      playSong(starred.song, song.id)
    } else {
      playSong([song], song.id)
    }
  }

  return (
    <div className="flex min-h-screen w-full justify-center font-sans">
      <main className="main-page pb-24!">
        <h1 className="text-4xl font-black mb-8 px-3">Your Library</h1>

        {loading ? (
          <div className="flex items-center justify-center py-20 opacity-50">
            <Icon path={mdiLoading} size={2} spin />
          </div>
        ) : (
          <>
            {/* Starred Artists */}
            {subsonicConfigured && starred?.artist && starred.artist.length > 0 && (
              <section className="mb-12">
                <h2 className="text-2xl font-bold mb-6 px-3">Artists</h2>
                <div className="flex gap-6 overflow-x-auto no-scrollbar px-3">
                  {starred.artist.map((artist) => (
                    <button
                      key={artist.id}
                      onClick={() =>
                        router.navigate({
                          to: `/artist/$artistId`,
                          params: { artistId: artist.id }
                        })
                      }
                      className="flex flex-col items-center text-center gap-3 shrink-0 group w-32"
                    >
                      <div className="w-32 h-32 rounded-full bg-theme-bg/10 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform shadow-lg">
                        <Icon path={mdiAccount} size={2.5} className="opacity-20" />
                      </div>
                      <p className="font-bold truncate w-full">{artist.name}</p>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Starred Albums */}
            {subsonicConfigured && starred?.album && starred.album.length > 0 && (
              <section className="mb-12">
                <h2 className="text-2xl font-bold mb-6 px-3">Albums</h2>
                <div className="flex gap-4 overflow-x-auto no-scrollbar px-3 pb-4">
                  {starred.album.map((album) => (
                    <div key={album.id} className="w-48 shrink-0">
                      <AlbumCard
                        album={{ ...album, title: album.name }}
                        onPlay={() => handlePlayAlbum(album)}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Starred Songs */}
            {subsonicConfigured && starred?.song && starred.song.length > 0 && (
              <section className="mb-12">
                <h2 className="text-2xl font-bold mb-6 px-3">Songs</h2>
                <div className="flex flex-col gap-1 px-3">
                  {starred.song.slice(0, 10).map((song) => (
                    <div
                      key={song.id}
                      className="flex items-center gap-4 p-2 rounded-xl hover:bg-theme-bg/5 transition-all group cursor-pointer"
                      onClick={() => handlePlaySong(song)}
                    >
                      <div className="w-10 h-10 rounded-lg bg-theme-bg/10 flex items-center justify-center shrink-0 relative">
                        <Icon path={mdiMusicNote} size={0.8} className="opacity-30" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{song.title}</p>
                        <p className="text-xs opacity-50 truncate">
                          {song.artist} • {song.album}
                        </p>
                      </div>
                      <p className="text-sm opacity-50 w-12 text-right">
                        {Math.floor(song.duration / 60)}:
                        {(song.duration % 60).toString().padStart(2, '0')}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Favourite Stations Section */}
            <div className="mb-12">
              <button
                onClick={handleViewAllStations}
                className="w-full flex items-center justify-between mb-6 hover:opacity-75 transition text-left"
              >
                <h2 className="text-2xl font-bold px-3">Favourite Stations</h2>
                <span className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium pr-3">
                  View all
                  <Icon path={mdiChevronRight} size={0.8} />
                </span>
              </button>

              {favourites.length === 0 ? (
                <p className="opacity-50 mb-8 px-3">No favourite stations yet.</p>
              ) : (
                <div className="flex flex-col gap-4 w-full px-3">
                  <StationListHeader />
                  {favourites.slice(0, 5).map((radio, i) => (
                    <StationRow key={radio.url} station={radio} i={i} />
                  ))}
                </div>
              )}
            </div>

            {/* Recently Played Section */}
            {recentStations.length > 0 && (
              <div className="w-full mb-12">
                <button
                  onClick={handleViewAllHistory}
                  className="w-full flex items-center justify-between mb-6 hover:opacity-75 transition text-left"
                >
                  <h2 className="text-2xl font-bold px-3">Recently Played</h2>
                  <span className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium pr-3">
                    View all
                    <Icon path={mdiChevronRight} size={0.8} />
                  </span>
                </button>
                <div className="px-3">
                  <StaticStationCarousel
                    stations={recentStations}
                    onStationPlay={handlePlayStation}
                  />
                </div>
              </div>
            )}

            {/* Your Playlists Section */}
            {playlists.length > 0 && (
              <div className="w-full">
                <button
                  onClick={handleViewAllPlaylists}
                  className="w-full flex items-center justify-between mb-6 hover:opacity-75 transition text-left"
                >
                  <h2 className="text-2xl font-bold px-3">Your Playlists</h2>
                  <span className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium pr-3">
                    View all
                    <Icon path={mdiChevronRight} size={0.8} />
                  </span>
                </button>
                <div className="px-3">
                  <PlaylistCarousel
                    title=""
                    playlists={playlists.slice(0, 10)}
                    onPlay={handlePlayPlaylist}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
