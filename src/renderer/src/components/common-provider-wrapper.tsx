import { AudioPlayerProvider } from '@renderer/contexts/audio-player-context'
import { CastContextProvider } from '@renderer/contexts/cast-context'
import { FavouritesProvider } from '@renderer/contexts/favourites-context'
import { HistoryProvider } from '@renderer/contexts/history-context'
import { MediaPlayerScreenProvider } from '@renderer/contexts/media-player-screen-context'
import { ModalProvider } from '@renderer/contexts/modal-context'
import { PlaylistsProvider } from '@renderer/contexts/playlists-context'
import { RecordingsProvider } from '@renderer/contexts/recordings-context'
import { SleepTimerProvider } from '@renderer/contexts/sleep-timer-context'
import { VersionProvider } from '@renderer/contexts/version-context'

function CommonProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <VersionProvider>
      <AudioPlayerProvider>
        <CastContextProvider>
          <MediaPlayerScreenProvider>
            <SleepTimerProvider>
              <RecordingsProvider>
                <PlaylistsProvider>
                  <FavouritesProvider>
                    <HistoryProvider>
                      <ModalProvider>{children}</ModalProvider>
                    </HistoryProvider>
                  </FavouritesProvider>
                </PlaylistsProvider>
              </RecordingsProvider>
            </SleepTimerProvider>
          </MediaPlayerScreenProvider>
        </CastContextProvider>
      </AudioPlayerProvider>
    </VersionProvider>
  )
}

export default CommonProviderWrapper
