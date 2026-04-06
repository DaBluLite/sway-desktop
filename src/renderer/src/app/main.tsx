import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import CommonProviderWrapper from './components/common-provider-wrapper'
import { RouterProvider, createRouter, createHashHistory } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

// Create a new router instance
// Use hash history for Electron app to work with file:// protocol
const router = createRouter({
  routeTree,
  history: createHashHistory()
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

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
