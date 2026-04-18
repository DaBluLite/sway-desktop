import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/artist/$artistName/songs/')({
  component: RouteComponent
})

function RouteComponent() {
  const { artistName } = Route.useParams()
  return <div>Hello {artistName}!</div>
}
