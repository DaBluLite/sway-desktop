import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/library/')({
  component: LibraryPage
})

function LibraryPage() {
  return (
    <div className="flex min-h-screen w-full justify-center font-sans">
      <main className="main-page pb-24!"></main>
    </div>
  )
}
