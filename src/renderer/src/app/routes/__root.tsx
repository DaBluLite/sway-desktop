import { AudioPlayer } from '@renderer/components/audio-player'
import MediaPlayerScreen from '@renderer/components/media-player-screen'
import ModalWrapper from '@renderer/components/modal-wrapper'
import Navbar from '@renderer/components/navbar'
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

const RootLayout = () => (
  <>
    <div className="grab-bar" />
    <Navbar />
    <Outlet />
    <TanStackRouterDevtools />
    <ModalWrapper />
    <AudioPlayer />
    <MediaPlayerScreen />
  </>
)

export const Route = createRootRoute({ component: RootLayout })
