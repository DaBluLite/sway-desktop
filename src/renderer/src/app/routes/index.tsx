import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAudioPlayer } from '../contexts/audio-player-context'
import { AlbumCarousel } from '../components/album-carousel'
import { FeaturedAlbumCarousel } from '../components/featured-album-carousel'
import { SubsonicAlbum, SubsonicSong } from '../../../../types/subsonic'
import { useRef, useEffect, useState } from 'react'
import { useSubsonic } from '../contexts/subsonic-context'

type ExtendedAlbum = SubsonicAlbum & { title: string }

export const Route = createFileRoute('/')({
  component: RadiosList
})

const CarouselPlaceholder: React.FC<{
  id: string
  children: React.ReactNode
  visibleCarousels: Set<string>
}> = ({
  id,
  children,
  visibleCarousels
}: {
  id: string
  children: React.ReactNode
  visibleCarousels: Set<string>
}) => {
  const isVisible = visibleCarousels.has(id)

  return (
    <div className="carousel-placeholder" data-carousel-id={id}>
      {isVisible ? children : <div className="h-80" />}
    </div>
  )
}

function RadiosList() {
  const { playSong } = useAudioPlayer()
  const { subsonicEnabled, isInitialized } = useSubsonic()
  const navigate = useNavigate()
  const [visibleCarousels, setVisibleCarousels] = useState<Set<string>>(
    new Set([
      'recently-played',
      'most-played-albums',
      'trending',
      'music',
      'local',
      'newly-added-albums'
    ])
  )
  const observerRef = useRef<IntersectionObserver | null>(null)
  const [subsonicConfigured, setSubsonicConfigured] = useState(false)

  useEffect(() => {
    if (isInitialized && !subsonicEnabled) {
      navigate({ to: '/radio' })
    }
  }, [isInitialized, subsonicEnabled, navigate])

  useEffect(() => {
    window.api.subsonic.getCredentialsStatus().then((status) => {
      setSubsonicConfigured(status.configured)
    })

    const cleanup = window.api.subsonic.onCredentialsChanged((status) => {
      setSubsonicConfigured(status.configured)
    })

    return cleanup
  }, [])

  const fetchMostPlayedAlbums = async (offset: number, size: number) => {
    const result = await window.api.subsonic.getMostPlayed({
      offset: offset.toString(),
      size: size.toString()
    })

    if (result.success && result.data) {
      return (result.data as { album: ExtendedAlbum[] }).album
    }

    return []
  }

  const fetchNewlyAddedAlbums = async (offset: number, size: number) => {
    const result = await window.api.subsonic.getNewlyAddedAlbums({
      offset: offset.toString(),
      size: size.toString()
    })

    if (result.success && result.data) {
      return result.data as ExtendedAlbum[]
    }

    return []
  }

  const handlePlayAlbum = async (album: ExtendedAlbum) => {
    const result = await window.api.subsonic.getAlbum(album.id)
    if (result.success && result.data) {
      const albumData = result.data as { song: SubsonicSong[] }
      if (albumData.song && albumData.song.length > 0) {
        playSong(albumData.song, albumData.song[0].id)
      }
    }
  }

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const carouselId = entry.target.getAttribute('data-carousel-id')
            if (carouselId) {
              setVisibleCarousels((prev) => new Set(prev).add(carouselId))
            }
          }
        })
      },
      { rootMargin: '200px' }
    )

    // Use requestAnimationFrame to ensure DOM is ready
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        const carouselPlaceholders = document.querySelectorAll('.carousel-placeholder')
        carouselPlaceholders.forEach((placeholder) => {
          observerRef.current?.observe(placeholder)
        })
      })
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  if (!isInitialized || (isInitialized && !subsonicEnabled)) {
    return null
  }

  return (
    <div className="flex min-h-screen items-start justify-start w-full font-sans overflow-auto">
      <main className="main-page pr-0! pb-60!">
        {subsonicConfigured && <FeaturedAlbumCarousel />}
        {subsonicConfigured && (
          <CarouselPlaceholder id="most-played-albums" visibleCarousels={visibleCarousels}>
            <AlbumCarousel
              title="Most Played Albums"
              fetchAlbums={fetchMostPlayedAlbums}
              onAlbumPlay={handlePlayAlbum}
            />
          </CarouselPlaceholder>
        )}
        {subsonicConfigured && (
          <CarouselPlaceholder id="newly-added-albums" visibleCarousels={visibleCarousels}>
            <AlbumCarousel
              title="Newly Added Albums"
              fetchAlbums={fetchNewlyAddedAlbums}
              onAlbumPlay={handlePlayAlbum}
            />
          </CarouselPlaceholder>
        )}
      </main>
    </div>
  )
}
