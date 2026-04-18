import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState, useCallback, useMemo, ReactNode } from 'react'
import { useSearch } from '@renderer/contexts/search-context'
import {
  SubsonicSearchResult,
  SubsonicSong,
  SubsonicAlbum,
  SubsonicPlaylist
} from '../../../../../types/subsonic'
import { Station } from 'radio-browser-api'
import { AlbumCard } from '@renderer/components/album-card'
import { PlaylistCard } from '@renderer/components/playlist-card'
import { useAudioPlayer } from '@renderer/contexts/audio-player-context'
import { usePlaylists } from '@renderer/contexts/playlists-context'
import { useSubsonic } from '@renderer/contexts/subsonic-context'
import { AlbumCarousel } from '@renderer/components/album-carousel'
import { StationCarousel } from '@renderer/components/station-carousel'
import { ArtistCarousel } from '@renderer/components/artist-carousel'
import SongRow from '@renderer/components/song-row'
import {
  Disc3,
  ListCheck,
  ListMusic,
  LoaderCircle,
  Music,
  Radio,
  Search,
  Star,
  User,
  X
} from 'lucide-react'
import SongListHeader from '@renderer/components/song-list-header'
import { ArtistCard } from '@renderer/components/artist-card'
import { useCurations } from '@renderer/contexts/curations-context'
import { CurationCard } from '@renderer/components/curation-card'
import StationRow from '@renderer/components/station-row'
import StationListHeader from '@renderer/components/station-list-header'

export const Route = createFileRoute('/search/')({
  component: SearchPage
})

type SearchTab = 'top' | 'artists' | 'songs' | 'albums' | 'playlists' | 'stations' | 'curations'

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
  const [selectedSongs, setSelectedSongs] = useState<string[]>([])
  const router = useRouter()
  const { collections } = useCurations()

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

  const tabs: { id: SearchTab; label: string; Icon(): ReactNode }[] = [
    { id: 'top', label: 'Top Results', Icon: () => <Star className="size-4" /> },
    { id: 'artists', label: 'Artists', Icon: () => <User className="size-4" /> },
    { id: 'songs', label: 'Songs', Icon: () => <Music className="size-4" /> },
    { id: 'albums', label: 'Albums', Icon: () => <Disc3 className="size-4" /> },
    { id: 'playlists', label: 'Playlists', Icon: () => <ListMusic className="size-4" /> },
    { id: 'stations', label: 'Radio Stations', Icon: () => <Radio className="size-4" /> },
    { id: 'curations', label: 'Curations', Icon: () => <ListCheck className="size-4" /> }
  ]

  if (!searchValue.trim()) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] opacity-50">
        <Search className="mb-4 size-4" />
        <h2 className="text-xl font-bold">Search for your favorite music</h2>
        <p>Artists, albums, songs, and radio stations</p>
      </div>
    )
  }

  return (
    <>
      <div className="settings-sidebar-wrapper">
        {tabs.map(({ id, Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`settings-sidebar-item flex items-center gap-2 ${activeTab === id ? 'active' : ''}`}
          >
            <Icon />
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-col w-full h-full px-8 pt-4 pb-24 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <LoaderCircle className="animate-spin size-10" />
            <p className="mt-4">Searching...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {activeTab === 'top' && (
              <>
                {/* Top Results View */}
                <div className="grid grid-cols-1 gap-8">
                  {/* Songs Section */}
                  {subsonicResults && subsonicResults.song && subsonicResults.song.length > 0 && (
                    <section>
                      <h3 className="text-xl font-bold mb-4">Songs</h3>
                      <div className="flex flex-col gap-2">
                        {subsonicResults.song.slice(0, 4).map((song, i) => (
                          <SongRow
                            selected={false}
                            key={song.id}
                            song={song}
                            i={i}
                            playlist={subsonicResults.song || []}
                          />
                        ))}
                      </div>
                    </section>
                  )}
                </div>

                {/* Albums Carousel */}
                {subsonicResults && subsonicResults.album && subsonicResults.album.length > 0 && (
                  <AlbumCarousel
                    fetchAlbums={(offset, limit) => {
                      return new Promise((resolve) => {
                        const albums =
                          subsonicResults.album
                            ?.slice(offset, offset + limit)
                            .map((album) => ({ ...album, title: album.name })) || []
                        resolve(albums)
                      })
                    }}
                    onAlbumPlay={handlePlayAlbum}
                    title="Albums"
                  />
                )}

                {/* Artists Carousel */}
                {subsonicResults && subsonicResults.artist && subsonicResults.artist.length > 0 && (
                  <ArtistCarousel
                    fetchArtists={(offset, limit) => {
                      return new Promise((resolve) => {
                        const artists =
                          subsonicResults.artist
                            ?.slice(offset, offset + limit)
                            .map((artist) => ({ ...artist, title: artist.name })) || []
                        resolve(artists)
                      })
                    }}
                    title="Artists"
                  />
                )}

                {/* Stations Grid */}
                {stationResults.length > 0 && (
                  <StationCarousel
                    fetchStations={(offset, limit) => {
                      return new Promise((resolve) => {
                        const stations = stationResults.slice(offset, offset + limit)
                        resolve(stations)
                      })
                    }}
                    title="Radio Stations"
                    onStationPlay={play}
                  />
                )}
              </>
            )}

            {activeTab === 'artists' && (
              <div className="overflow-y-auto flex flex-wrap px-8 pt-8 pb-35 gap-x-4">
                {subsonicResults?.artist?.map((artist) => (
                  <ArtistCard artist={artist} key={artist.id} />
                ))}
                {!subsonicResults?.artist?.length && <p className="opacity-50">No artists found</p>}
              </div>
            )}

            {activeTab === 'songs' && (
              <div className="flex flex-col gap-1 pb-30">
                <SongListHeader />
                {subsonicResults &&
                  subsonicResults.song &&
                  subsonicResults.song.length > 0 &&
                  subsonicResults.song.map((song, i) => (
                    <SongRow
                      onSelect={(e) => {
                        e.stopPropagation()
                        if (e.ctrlKey || e.metaKey) {
                          // Toggle selection
                          setSelectedSongs((prev) =>
                            prev.includes(song.id)
                              ? prev.filter((id) => id !== song.id)
                              : [...prev, song.id]
                          )
                        } else {
                          setSelectedSongs([song.id])
                        }
                      }}
                      selected={selectedSongs.includes(song.id)}
                      key={song.id}
                      song={song}
                      i={i}
                      playlist={subsonicResults.song || []}
                    />
                  ))}
                {!subsonicResults?.song?.length && <p className="opacity-50">No songs found</p>}
              </div>
            )}

            {activeTab === 'albums' && (
              <div className="overflow-y-auto flex flex-wrap px-8 pt-8 pb-35 gap-x-4">
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
              <div className="overflow-y-auto flex flex-wrap px-8 pt-8 pb-35 gap-x-4">
                {filteredPlaylists.map((playlist) => (
                  <PlaylistCard key={playlist.id} playlist={playlist} onPlay={handlePlayPlaylist} />
                ))}
                {filteredPlaylists.length === 0 && <p className="opacity-50">No playlists found</p>}
              </div>
            )}

            {activeTab === 'curations' && (
              <div className="overflow-y-auto flex flex-wrap px-8 pt-8 pb-35 gap-x-4">
                {collections.map((collection) => (
                  <CurationCard key={collection.id} curation={collection} />
                ))}
                {collections.length === 0 && <p className="opacity-50">No collections found</p>}
              </div>
            )}

            {activeTab === 'stations' && (
              <div className="flex flex-col gap-1 pb-30">
                <StationListHeader />
                {stationResults.map((station, i) => (
                  <StationRow key={station.url} station={station} i={i} />
                ))}
                {stationResults.length === 0 && (
                  <p className="opacity-50">No radio stations found</p>
                )}
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
              <X className="mb-4 size-12" />
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
    </>
  )
}
