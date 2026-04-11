import { useAudioPlayer } from '@renderer/contexts/audio-player-context'
import { useLibrary } from '@renderer/contexts/library-context'
import { createFileRoute } from '@tanstack/react-router'
import { AlbumCard } from '@renderer/components/album-card'
import { useCallback } from 'react'
import { SubsonicAlbum, SubsonicSong } from '../../../../../../types/subsonic'

export const Route = createFileRoute('/library/albums/')({
  component: RouteComponent
})

type ExtendedAlbum = SubsonicAlbum & { title: string }

function RouteComponent() {
  const { starred } = useLibrary()
  const { playSong } = useAudioPlayer()
  const starredAlbums = starred?.album || []

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

  return (
    <div className="flex flex-col w-full h-screen">
      <div className="station-carousel-header pl-8">
        <h2 className="station-carousel-title">Albums</h2>
      </div>
      <div className="overflow-y-auto flex flex-wrap px-12 pt-8 pb-35 gap-x-4">
        {starredAlbums?.map((album) => (
          <AlbumCard
            key={album.id}
            album={{ ...album, title: album.name }}
            onPlay={handlePlayAlbum}
          />
        ))}
      </div>
    </div>
  )
}
