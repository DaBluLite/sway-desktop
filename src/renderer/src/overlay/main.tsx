import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import CommonProviderWrapper from '@renderer/components/common-provider-wrapper'
import {
  RouterProvider,
  createRouter,
  createHashHistory,
  createRoute
} from '@tanstack/react-router'
import QuickPlay from './pages/quickplay'
import LibraryPanel from './pages/library'
import { rootRoute } from './root'

const quickplayRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: QuickPlay
})

const libraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/library',
  component: LibraryPanel
})

const routeTree = rootRoute.addChildren([quickplayRoute, libraryRoute])

const router = createRouter({
  routeTree,
  history: createHashHistory()
})

// Render the app
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = createRoot(rootElement)
  root.render(
    <StrictMode>
      <CommonProviderWrapper>
        <RouterProvider router={router} />
      </CommonProviderWrapper>
    </StrictMode>
  )
}

rootElement.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    rootElement.classList.add('hiding')
    setTimeout(() => window.api.window.hideOverlay(), 500)
  }
})

window.api.window.onOverlayHiding(() => {
  rootElement.classList.add('hiding')
})
