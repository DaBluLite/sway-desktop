import { useAudioPlayer } from '@renderer/contexts/audio-player-context'
import { createFileRoute } from '@tanstack/react-router'
import { useCallback } from 'react'
import { SubsonicPlaylist, SubsonicSong } from '../../../../../../types/subsonic'
import { usePlaylists } from '@renderer/contexts/playlists-context'
import { PlaylistCard } from '@renderer/components/playlist-card'

export const Route = createFileRoute('/library/playlists/')({
  component: RouteComponent
})

function RouteComponent() {
  const { playSong } = useAudioPlayer()
  const { playlists } = usePlaylists()

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

  return (
    <div className="flex flex-col w-full h-screen">
      <div className="station-carousel-header pl-8">
        <h2 className="station-carousel-title">Playlists</h2>
      </div>
      <div className="overflow-y-auto flex flex-wrap px-12 pt-8 pb-35 gap-x-4">
        {playlists?.map((album) => (
          <PlaylistCard key={album.id} playlist={album} onPlay={handlePlayPlaylist} />
        ))}
      </div>
    </div>
  )
}
