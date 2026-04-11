import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSearch } from '@renderer/contexts/search-context'
import {
  SubsonicSearchResult,
  SubsonicSong,
  SubsonicAlbum,
  SubsonicPlaylist
} from '../../../../../types/subsonic'
import { Station } from 'radio-browser-api'
import { StationItem } from '@renderer/components/station-item'
import { AlbumCard } from '@renderer/components/album-card'
import { PlaylistCard } from '@renderer/components/playlist-card'
import { useAudioPlayer } from '@renderer/contexts/audio-player-context'
import { usePlaylists } from '@renderer/contexts/playlists-context'
import { useSubsonic } from '@renderer/contexts/subsonic-context'
import { Icon } from '@mdi/react'
import {
  mdiMagnify,
  mdiLoading,
  mdiClose,
  mdiAccount,
  mdiMusicNote,
  mdiAlbum,
  mdiPlaylistMusic,
  mdiRadioTower
} from '@mdi/js'

export const Route = createFileRoute('/search/')({
  component: SearchPage
})

type SearchTab = 'top' | 'artists' | 'songs' | 'albums' | 'playlists' | 'stations'

function SearchPage() {
  const { searchValue, setSearchValue } = useSearch()
  const { subsonicEnabled } = useSubsonic()
  const { play, playSong } = useAudioPlayer()
  const { playlists } = usePlaylists()
  const [activeTab, setActiveTab] = useState<SearchTab>('top')
  const [isSubsonicConfigured, setIsSubsonicConfigured] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [subsonicResults, setSubsonicResults] = useState<SubsonicSearchResult | null>(null)
  const [stationResults, setStationResults] = useState<Station[]>([])
  const router = useRouter()

  useEffect(() => {
    window.api.subsonic.getCredentialsStatus().then((status) => {
      setIsSubsonicConfigured(status.configured)
    })
  }, [])

  const performSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) return

      setIsLoading(true)

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const promises: Promise<any>[] = [
          fetch(
            `https://sway.dablulite.dev/api/radio/search?name=${encodeURIComponent(query)}&limit=20`
          )
            .then((res) => res.json())
            .catch(() => [])
        ]

        if (isSubsonicConfigured) {
          promises.push(window.api.subsonic.search({ query, size: 20 }))
        }

        const [stations, subsonic] = await Promise.all(promises)

        setStationResults(stations || [])
        if (subsonic?.success) {
          setSubsonicResults(subsonic.data)
        } else {
          setSubsonicResults(null)
        }
      } catch (error) {
        console.error('Search failed:', error)
      } finally {
        setIsLoading(false)
      }
    },
    [isSubsonicConfigured]
  )

  useEffect(() => {
    if (searchValue) {
      performSearch(searchValue)
    }
  }, [searchValue, performSearch])

  const filteredPlaylists = useMemo(() => {
    if (!searchValue.trim()) return []
    return playlists.filter((p) => p.name.toLowerCase().includes(searchValue.toLowerCase()))
  }, [playlists, searchValue])

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
    // Play this song and others in the same search result as context
    if (subsonicResults?.song) {
      playSong(subsonicResults.song, song.id)
    } else {
      playSong([song], song.id)
    }
  }

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

  const tabs: { id: SearchTab; label: string; icon: string }[] = [
    { id: 'top', label: 'Top Results', icon: mdiMagnify },
    { id: 'artists', label: 'Artists', icon: mdiAccount },
    { id: 'songs', label: 'Songs', icon: mdiMusicNote },
    { id: 'albums', label: 'Albums', icon: mdiAlbum },
    { id: 'playlists', label: 'Playlists', icon: mdiPlaylistMusic },
    { id: 'stations', label: 'Radio Stations', icon: mdiRadioTower }
  ]

  if (!searchValue.trim()) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] opacity-50">
        <Icon path={mdiMagnify} size={4} className="mb-4" />
        <h2 className="text-xl font-bold">Search for your favorite music</h2>
        <p>Artists, albums, songs, and radio stations</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full h-full px-8 pt-4 pb-24 overflow-y-auto">
      <div className="flex items-center gap-2 mb-6 overflow-x-auto no-scrollbar py-2 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-theme-text text-theme-bg font-bold'
                : 'bg-theme-bg/10 hover:bg-theme-bg/20'
            }`}
          >
            <Icon path={tab.icon} size={0.7} />
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-50">
          <Icon path={mdiLoading} size={3} spin />
          <p className="mt-4">Searching...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {activeTab === 'top' && (
            <>
              {/* Top Results View */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Artists Section */}
                {subsonicResults?.artist && subsonicResults.artist.length > 0 && (
                  <section>
                    <h3 className="text-xl font-bold mb-4">Artists</h3>
                    <div className="flex flex-col gap-2">
                      {subsonicResults.artist.slice(0, 3).map((artist) => (
                        <button
                          key={artist.id}
                          onClick={() =>
                            router.navigate({
                              to: `/artist/$artistId`,
                              params: { artistId: artist.id }
                            })
                          }
                          className="flex items-center gap-4 p-3 rounded-xl hover:bg-theme-bg/10 transition-all text-left"
                        >
                          <div className="w-12 h-12 rounded-full bg-theme-bg/20 overflow-hidden flex items-center justify-center shrink-0">
                            <Icon path={mdiAccount} size={1} className="opacity-50" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold truncate">{artist.name}</p>
                            <p className="text-sm opacity-50">
                              Artist • {artist.albumCount} albums
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {/* Songs Section */}
                {subsonicResults?.song && subsonicResults.song.length > 0 && (
                  <section>
                    <h3 className="text-xl font-bold mb-4">Songs</h3>
                    <div className="flex flex-col gap-2">
                      {subsonicResults.song.slice(0, 4).map((song) => (
                        <div
                          key={song.id}
                          className="flex items-center gap-4 p-3 rounded-xl hover:bg-theme-bg/10 transition-all group"
                        >
                          <div className="w-12 h-12 rounded-lg bg-theme-bg/20 overflow-hidden shrink-0 relative">
                            <Icon
                              path={mdiMusicNote}
                              size={1}
                              className="opacity-50 m-auto absolute inset-0"
                            />
                            <button
                              onClick={() => handlePlaySong(song)}
                              className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Icon path={mdiMusicNote} size={1} color="white" />
                            </button>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold truncate">{song.title}</p>
                            <p className="text-sm opacity-50 truncate">
                              {song.artist} • {song.album}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {/* Albums Carousel */}
              {subsonicResults?.album && subsonicResults.album.length > 0 && (
                <section>
                  <h3 className="text-xl font-bold mb-4">Albums</h3>
                  <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4">
                    {subsonicResults.album.slice(0, 10).map((album) => (
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

              {/* Stations Grid */}
              {stationResults.length > 0 && (
                <section>
                  <h3 className="text-xl font-bold mb-4">Radio Stations</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {stationResults.slice(0, 6).map((station) => (
                      <StationItem key={station.url} station={station} onPlay={play} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {activeTab === 'artists' && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {subsonicResults?.artist?.map((artist) => (
                <button
                  key={artist.id}
                  onClick={() =>
                    router.navigate({ to: `/artist/$artistId`, params: { artistId: artist.id } })
                  }
                  className="flex flex-col items-center text-center gap-4 p-4 rounded-2xl hover:bg-theme-bg/10 transition-all"
                >
                  <div className="w-32 h-32 rounded-full bg-theme-bg/20 overflow-hidden flex items-center justify-center shadow-lg">
                    <Icon path={mdiAccount} size={2.5} className="opacity-20" />
                  </div>
                  <div className="w-full">
                    <p className="font-bold truncate">{artist.name}</p>
                    <p className="text-sm opacity-50">{artist.albumCount} albums</p>
                  </div>
                </button>
              ))}
              {!subsonicResults?.artist?.length && <p className="opacity-50">No artists found</p>}
            </div>
          )}

          {activeTab === 'songs' && (
            <div className="flex flex-col gap-1">
              {subsonicResults?.song?.map((song) => (
                <div
                  key={song.id}
                  className="flex items-center gap-4 p-2 rounded-xl hover:bg-theme-bg/5 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-theme-bg/10 flex items-center justify-center shrink-0 relative">
                    <Icon path={mdiMusicNote} size={0.8} className="opacity-30" />
                    <button
                      onClick={() => handlePlaySong(song)}
                      className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Icon path={mdiMusicNote} size={0.8} color="white" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0 grid grid-cols-2 gap-4">
                    <div className="truncate">
                      <p className="font-bold truncate">{song.title}</p>
                      <p className="text-xs opacity-50 truncate">{song.artist}</p>
                    </div>
                    <p className="text-sm opacity-50 truncate flex items-center">{song.album}</p>
                  </div>
                  <p className="text-sm opacity-50 w-12 text-right">
                    {Math.floor(song.duration / 60)}:
                    {(song.duration % 60).toString().padStart(2, '0')}
                  </p>
                </div>
              ))}
              {!subsonicResults?.song?.length && <p className="opacity-50">No songs found</p>}
            </div>
          )}

          {activeTab === 'albums' && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {subsonicResults?.album?.map((album) => (
                <AlbumCard
                  key={album.id}
                  album={{ ...album, title: album.name }}
                  onPlay={() => handlePlayAlbum(album)}
                />
              ))}
              {!subsonicResults?.album?.length && <p className="opacity-50">No albums found</p>}
            </div>
          )}

          {activeTab === 'playlists' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPlaylists.map((playlist) => (
                <PlaylistCard key={playlist.id} playlist={playlist} onPlay={handlePlayPlaylist} />
              ))}
              {filteredPlaylists.length === 0 && <p className="opacity-50">No playlists found</p>}
            </div>
          )}

          {activeTab === 'stations' && (
            <div className="flex flex-col gap-4">
              {stationResults.map((station) => (
                <StationItem key={station.url} station={station} onPlay={play} />
              ))}
              {stationResults.length === 0 && <p className="opacity-50">No radio stations found</p>}
            </div>
          )}
        </div>
      )}

      {!isLoading &&
        searchValue &&
        stationResults.length === 0 &&
        (!subsonicResults ||
          (!subsonicResults.artist?.length &&
            !subsonicResults.album?.length &&
            !subsonicResults.song?.length)) &&
        filteredPlaylists.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <Icon path={mdiClose} size={3} className="mb-4" />
            <h2 className="text-xl font-bold">No results found for &quot;{searchValue}&quot;</h2>
            <p className="mb-6">Try searching for something else</p>
            <button
              onClick={() => {
                setSearchValue('')
                router.navigate({ to: subsonicEnabled ? '/' : '/radio' })
              }}
              className="px-6 py-2 bg-theme-text text-theme-bg rounded-full font-bold"
            >
              Clear search
            </button>
          </div>
        )}
    </div>
  )
}
