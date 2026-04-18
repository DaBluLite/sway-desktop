import { createFileRoute, Link } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { SubsonicAlbum, SubsonicArtist, SubsonicSong } from '../../../../../../types/subsonic'
import { useAudioPlayer } from '@renderer/contexts/audio-player-context'
import { AlbumCarousel } from '@renderer/components/album-carousel'
import Icon from '@mdi/react'
import { mdiHeart, mdiHeartOutline } from '@mdi/js'
import { useLibrary } from '@renderer/contexts/library-context'
import SongListHeader from '@renderer/components/song-list-header'
import SongRow from '@renderer/components/song-row'
import { ChevronRight } from 'lucide-react'

export const Route = createFileRoute('/artist/$artistId/')({
  component: ArtistPage
})

type ExtendedAlbum = SubsonicAlbum & { title: string }

function ArtistPage() {
  const { artistId } = Route.useParams()
  const [artist, setArtist] = useState<SubsonicArtist>()
  const [albums, setAlbums] = useState<ExtendedAlbum[]>([])
  const [songs, setSongs] = useState<SubsonicSong[]>([])
  const [artistCoverUrl, setArtistCoverUrl] = useState<string>()
  const { playSong } = useAudioPlayer()
  const { isStarred, star, unstar } = useLibrary()
  const [selectedSongs, setSelectedSongs] = useState<string[]>([])

  const handlePlayAlbum = useCallback(
    async (album: ExtendedAlbum) => {
      const result = await window.api.subsonic.getAlbum(album.id)
      if (result.success && result.data) {
        const albumData = result.data as { song: SubsonicSong[] }
        playSong(albumData.song, albumData.song[0].id)
      }
    },
    [playSong]
  )

  const fetchAlbumsForCarousel = useCallback(
    async (offset: number, limit: number) => {
      return albums.slice(offset, offset + limit)
    },
    [albums]
  )

  useEffect(() => {
    async function fetchArtistData() {
      try {
        const albumData = (await window.api.subsonic.getArtist(artistId)) as {
          success: boolean
          data?: SubsonicArtist
        }
        if (albumData.success && albumData.data) {
          setArtist(albumData.data)
          if (albumData.data.album) {
            setAlbums(
              albumData.data.album.map((album) => ({
                ...album,
                title: album.name
              }))
            )
          }
        }

        const coverUrl = await window.api.subsonic.getCoverArtUrl(artistId)
        coverUrl && setArtistCoverUrl(coverUrl)
      } catch (err) {
        console.error('Failed to fetch artist:', err)
      }
    }
    fetchArtistData()
  }, [artistId])

  useEffect(() => {
    async function fetchArtistTopSongs() {
      try {
        const topSongsData = (await window.api.subsonic.getTopSongs(artist?.name || '', '5')) as {
          success: boolean
          data?: SubsonicSong[]
        }
        if (topSongsData.success && topSongsData.data) {
          if (topSongsData.data) {
            setSongs(topSongsData.data)
          }
        }
      } catch (err) {
        console.error('Failed to fetch artist:', err)
      }
    }
    artist && artist.name && fetchArtistTopSongs()
  }, [artist])

  return (
    <div className="flex flex-col px-12 w-full h-[calc(100vh-64px)] gap-2 overflow-y-auto pb-35">
      <div className="flex gap-8 items-end mb-6">
        {artistCoverUrl ? (
          <img
            src={artistCoverUrl}
            alt={`${artist?.name} cover`}
            className="w-48 h-48 object-cover rounded-full"
          />
        ) : (
          <div className="w-48 h-48 bg-zinc-300 rounded flex items-center justify-center">
            <span className="text-zinc-500">No Cover</span>
          </div>
        )}
        <div>
          <h1 className="text-3xl font-bold">{artist?.name}</h1>
        </div>
        <div className="flex items-center gap-4 ml-auto">
          <button
            className="btn cursor-pointer use-theme-text p-3 rounded-full"
            onClick={(e) => {
              e.stopPropagation()
              if (isStarred(artistId, 'artist')) {
                unstar({ artistId })
              } else {
                star({ artistId })
              }
            }}
          >
            <Icon
              path={(() => {
                if (isStarred(artistId, 'artist')) return mdiHeart
                else return mdiHeartOutline
              })()}
              className="size-5"
            />
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <div className="station-carousel-header">
          <h2 className="station-carousel-title">Top Songs</h2>
          <Link
            className="text-green-600 dark:text-green-400 cursor-pointer hover:underline flex items-center gap-1"
            to="/artist/$artistName/songs"
            params={{ artistName: artist?.name || '' }}
          >
            View All
            <ChevronRight className="size-4" />
          </Link>
        </div>
        <SongListHeader />
        {songs.map((song, i) => (
          <SongRow
            onSelect={(e) => {
              e.stopPropagation()
              if (e.ctrlKey || e.metaKey) {
                // Toggle selection
                setSelectedSongs((prev) =>
                  prev.includes(song.id) ? prev.filter((id) => id !== song.id) : [...prev, song.id]
                )
              } else {
                setSelectedSongs([song.id])
              }
            }}
            selected={selectedSongs.includes(song.id)}
            key={song.id}
            song={song}
            i={i}
            playlist={songs}
          />
        ))}
        {albums.length > 0 && (
          <AlbumCarousel
            key={`artist-albums-${artistId}`}
            title="Albums"
            onAlbumPlay={handlePlayAlbum}
            fetchAlbums={fetchAlbumsForCarousel}
          />
        )}
      </div>
    </div>
  )
}
