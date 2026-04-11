import { AlarmProvider } from '@renderer/contexts/alarm-context'
import { AudioPlayerProvider } from '@renderer/contexts/audio-player-context'
import { MediaSessionProvider } from '@renderer/contexts/media-session-context'
import { CastContextProvider } from '@renderer/contexts/cast-context'
import { EqualizerProvider } from '@renderer/contexts/equalizer-context'
import { FavouritesProvider } from '@renderer/contexts/favourites-context'
import { HistoryProvider } from '@renderer/contexts/history-context'
import { LibraryProvider } from '@renderer/contexts/library-context'
import { MediaPlayerScreenProvider } from '@renderer/contexts/media-player-screen-context'
import { ModalProvider } from '@renderer/contexts/modal-context'
import { PlaylistsProvider } from '@renderer/contexts/playlists-context'
import { SleepTimerProvider } from '@renderer/contexts/sleep-timer-context'
import { SearchProvider } from '@renderer/contexts/search-context'
import { AppSetupProvider } from '@renderer/contexts/app-setup-context'
import { SubsonicProvider } from '@renderer/contexts/subsonic-context'
import { ContextMenuProvider } from '@renderer/contexts/context-menu-context'
import { ThemeProvider } from '@renderer/contexts/theme-context'
import { VersionProvider } from '@renderer/contexts/version-context'
import { WindowProvider } from '@renderer/contexts/window-context'

function CommonProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <WindowProvider>
      <SearchProvider>
        <AppSetupProvider>
          <SubsonicProvider>
            <ContextMenuProvider>
              <ThemeProvider>
                <VersionProvider>
                  <EqualizerProvider>
                    <AudioPlayerProvider>
                      <MediaSessionProvider>
                        <AlarmProvider>
                          <CastContextProvider>
                            <MediaPlayerScreenProvider>
                              <SleepTimerProvider>
                                <PlaylistsProvider>
                                  <LibraryProvider>
                                    <FavouritesProvider>
                                      <HistoryProvider>
                                        <ModalProvider>{children}</ModalProvider>
                                      </HistoryProvider>
                                    </FavouritesProvider>
                                  </LibraryProvider>
                                </PlaylistsProvider>
                              </SleepTimerProvider>
                            </MediaPlayerScreenProvider>
                          </CastContextProvider>
                        </AlarmProvider>
                      </MediaSessionProvider>
                    </AudioPlayerProvider>
                  </EqualizerProvider>
                </VersionProvider>
              </ThemeProvider>
            </ContextMenuProvider>
          </SubsonicProvider>
        </AppSetupProvider>
      </SearchProvider>
    </WindowProvider>
  )
}

export default CommonProviderWrapper
