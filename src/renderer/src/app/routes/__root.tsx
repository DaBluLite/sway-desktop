import { AudioPlayer } from '@renderer/components/audio-player'
import Header from '@renderer/components/header'
import MediaPlayerScreen from '@renderer/components/media-player-screen'
import ModalWrapper from '@renderer/components/modal-wrapper'
import Navbar from '@renderer/components/navbar'
import WelcomeScreen from '@renderer/components/welcome'
import { useSubsonic } from '@renderer/contexts/subsonic-context'
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

const RootLayout = () => {
  const { subsonicEnabled } = useSubsonic()
  return (
    <>
      <div className="flex min-w-screen min-h-screen max-w-screen max-h-screen">
        <div className="grab-bar" />
        <Navbar />
        <div
          className={
            'flex flex-col w-[calc(100vw-(var(--spacing)*70))] h-screen' +
            (subsonicEnabled ? '' : ' w-full!')
          }
        >
          <Header />
          <Outlet />
        </div>
        <AudioPlayer />
        <MediaPlayerScreen />
        <ModalWrapper />
      </div>
      <TanStackRouterDevtools position="bottom-right" />
      <WelcomeScreen />
    </>
  )
}

export const Route = createRootRoute({ component: RootLayout })
