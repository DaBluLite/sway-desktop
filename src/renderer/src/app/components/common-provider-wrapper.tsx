import { useEffect, useRef } from 'react'
import { AlarmProvider } from '@renderer/contexts/alarm-context'
import { AudioPlayerProvider } from '@renderer/contexts/audio-player-context'
import { MediaSessionProvider } from '@renderer/contexts/media-session-context'
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
import { WindowProvider } from '@renderer/contexts/window-context'
import { CurationsProvider } from '@renderer/contexts/curations-context'
import { useAudioPlayer } from '@renderer/contexts/audio-player-context'
import { useSubsonic } from '@renderer/contexts/subsonic-context'

/**
 * Component that monitors Subsonic state and clears audio queue when disabled
 */
function SubsonicStateManager({ children }: { children: React.ReactNode }) {
  const { currentSong, clearQueue } = useAudioPlayer()
  const { subsonicEnabled } = useSubsonic()
  const previousSubsonicState = useRef(true)

  useEffect(() => {
    // When subsonic is disabled and was previously enabled
    if (!subsonicEnabled && previousSubsonicState.current && currentSong) {
      console.log('Subsonic disabled: clearing queue and stopping playback')
      // clearQueue() already stops playback and clears all song-related state
      clearQueue()
    }
    previousSubsonicState.current = subsonicEnabled
  }, [subsonicEnabled, currentSong, clearQueue])

  return <>{children}</>
}

function CommonProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <WindowProvider>
      <SearchProvider>
        <AppSetupProvider>
          <SubsonicProvider>
            <ContextMenuProvider>
              <ThemeProvider>
                <AudioPlayerProvider>
                  <SubsonicStateManager>
                    <MediaSessionProvider>
                      <AlarmProvider>
                        <MediaPlayerScreenProvider>
                          <SleepTimerProvider>
                            <CurationsProvider>
                              <PlaylistsProvider>
                                <LibraryProvider>
                                  <FavouritesProvider>
                                    <HistoryProvider>
                                      <ModalProvider>{children}</ModalProvider>
                                    </HistoryProvider>
                                  </FavouritesProvider>
                                </LibraryProvider>
                              </PlaylistsProvider>
                            </CurationsProvider>
                          </SleepTimerProvider>
                        </MediaPlayerScreenProvider>
                      </AlarmProvider>
                    </MediaSessionProvider>
                  </SubsonicStateManager>
                </AudioPlayerProvider>
              </ThemeProvider>
            </ContextMenuProvider>
          </SubsonicProvider>
        </AppSetupProvider>
      </SearchProvider>
    </WindowProvider>
  )
}

export default CommonProviderWrapper
