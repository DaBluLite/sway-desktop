import { createFileRoute } from '@tanstack/react-router'
import { useAudioPlayer } from '../contexts/audio-player-context'
import { useUserLocation } from '../contexts/user-location-context'
import { useHistory } from '../contexts/history-context'
import { StationCarousel } from '../components/station-carousel'
import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { Station } from 'radio-browser-api'

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

export default function RadiosList() {
  const { countryCode, city } = useUserLocation()
  const { play } = useAudioPlayer()
  const { getRecentStations } = useHistory()
  const [visibleCarousels, setVisibleCarousels] = useState<Set<string>>(
    new Set(['recently-played', 'trending', 'music', 'local'])
  )
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Get recently played stations from history
  const recentlyPlayed = useMemo(() => getRecentStations(10), [getRecentStations])

  // Fetch function for recently played - returns cached data
  const fetchRecentlyPlayed = useCallback(
    async (offset: number, limit: number): Promise<Station[]> => {
      // Return slice of recently played stations based on offset/limit
      return recentlyPlayed.slice(offset, offset + limit)
    },
    [recentlyPlayed]
  )

  // Fetch trending stations (ordered by recent clicks/trending)
  const fetchTrendingStations = useCallback(async (offset: number, limit: number) => {
    // eslint-disable-next-line no-useless-catch
    try {
      const response = await fetch(
        `https://sway.dablulite.dev/api/radio/search?limit=${limit}&offset=${offset}&order=clicktrend&reverse=true`
      )
      return await response.json()
    } catch (error) {
      throw error
    }
  }, [])

  // Fetch recently added/changed stations
  const fetchRecentlyAdded = useCallback(async (offset: number, limit: number) => {
    // eslint-disable-next-line no-useless-catch
    try {
      const response = await fetch(
        `https://sway.dablulite.dev/api/radio/search?limit=${limit}&offset=${offset}&order=changetimestamp&reverse=true`
      )
      return await response.json()
    } catch (error) {
      throw error
    }
  }, [])

  const fetchTopLocalStations = useCallback(
    async (offset: number, limit: number) => {
      console.log(countryCode)
      // eslint-disable-next-line no-useless-catch
      try {
        const response = await fetch(
          `https://sway.dablulite.dev/api/radio/search?limit=${limit}&offset=${offset}&order=clickcount&reverse=true&countrycode=${countryCode}${city ? `&state=${encodeURIComponent(city)}` : ''}`
        )
        return await response.json()
      } catch (error) {
        throw error
      }
    },
    [countryCode, city]
  )

  const fetchTopMusicStations = useCallback(
    async (offset: number, limit: number) => {
      // eslint-disable-next-line no-useless-catch
      try {
        const response = await fetch(
          `https://sway.dablulite.dev/api/radio/search?limit=${limit}&offset=${offset}&order=clickcount&reverse=true&countrycode=${countryCode}&tag=music`
        )
        return await response.json()
      } catch (error) {
        throw error
      }
    },
    [countryCode]
  )

  const fetchLocalPopStations = useCallback(
    async (offset: number, limit: number) => {
      // eslint-disable-next-line no-useless-catch
      try {
        const response = await fetch(
          `https://sway.dablulite.dev/api/radio/search?limit=${limit}&offset=${offset}&order=clickcount&reverse=true&countrycode=${countryCode}&tag=pop`
        )
        return await response.json()
      } catch (error) {
        throw error
      }
    },
    [countryCode]
  )

  const fetchLocalNewsStations = useCallback(
    async (offset: number, limit: number) => {
      // eslint-disable-next-line no-useless-catch
      try {
        const response = await fetch(
          `https://sway.dablulite.dev/api/radio/search?limit=${limit}&offset=${offset}&order=clickcount&reverse=true&countrycode=${countryCode}&tag=news`
        )
        return await response.json()
      } catch (error) {
        throw error
      }
    },
    [countryCode]
  )

  const fetchTopNewsStations = useCallback(async (offset: number, limit: number) => {
    // eslint-disable-next-line no-useless-catch
    try {
      const response = await fetch(
        `https://sway.dablulite.dev/api/radio/search?limit=${limit}&offset=${offset}&order=clickcount&reverse=true&tag=news`
      )
      return await response.json()
    } catch (error) {
      throw error
    }
  }, [])

  const fetchTopRockStations = useCallback(
    async (offset: number, limit: number) => {
      // eslint-disable-next-line no-useless-catch
      try {
        const response = await fetch(
          `https://sway.dablulite.dev/api/radio/search?limit=${limit}&offset=${offset}&order=clickcount&reverse=true&tag=rock&countrycode=${countryCode}`
        )
        return await response.json()
      } catch (error) {
        throw error
      }
    },
    [countryCode]
  )

  const fetchTopSportsStations = useCallback(
    async (offset: number, limit: number) => {
      // eslint-disable-next-line no-useless-catch
      try {
        const response = await fetch(
          `https://sway.dablulite.dev/api/radio/search?limit=${limit}&offset=${offset}&order=clickcount&reverse=true&tag=sports&countrycode=${countryCode}`
        )
        return await response.json()
      } catch (error) {
        throw error
      }
    },
    [countryCode]
  )

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

  return (
    <div className="flex min-h-screen items-start justify-start w-full font-sans overflow-auto">
      <main className="main-page pr-0!">
        {/* Recently Played - only show if user has history */}
        {recentlyPlayed.length > 0 && (
          <CarouselPlaceholder id="recently-played" visibleCarousels={visibleCarousels}>
            <StationCarousel
              key={`recently-played-${recentlyPlayed.length}`}
              title="Recently Played"
              fetchStations={fetchRecentlyPlayed}
              onStationPlay={play}
            />
          </CarouselPlaceholder>
        )}

        {/* Trending Stations - based on click trend */}
        <CarouselPlaceholder id="trending" visibleCarousels={visibleCarousels}>
          <StationCarousel
            key="trending"
            title="Trending Now"
            fetchStations={fetchTrendingStations}
            onStationPlay={play}
          />
        </CarouselPlaceholder>

        <CarouselPlaceholder id="music" visibleCarousels={visibleCarousels}>
          <StationCarousel
            key={`music-${countryCode}-${city}`}
            title="Top Music"
            fetchStations={fetchTopMusicStations}
            onStationPlay={play}
          />
        </CarouselPlaceholder>

        <CarouselPlaceholder id="local" visibleCarousels={visibleCarousels}>
          <StationCarousel
            key={`local-${countryCode}-${city}`}
            title="Top Local Stations"
            fetchStations={fetchTopLocalStations}
            onStationPlay={play}
          />
        </CarouselPlaceholder>

        {/* Recently Added Stations */}
        <CarouselPlaceholder id="recently-added" visibleCarousels={visibleCarousels}>
          <StationCarousel
            key="recently-added"
            title="Recently Added"
            fetchStations={fetchRecentlyAdded}
            onStationPlay={play}
          />
        </CarouselPlaceholder>

        <CarouselPlaceholder id="pop" visibleCarousels={visibleCarousels}>
          <StationCarousel
            key={`pop-${countryCode}-${city}`}
            title="Local Pop Stations"
            fetchStations={fetchLocalPopStations}
            onStationPlay={play}
          />
        </CarouselPlaceholder>

        <CarouselPlaceholder id="news" visibleCarousels={visibleCarousels}>
          <StationCarousel
            key={`news-${countryCode}-${city}`}
            title="Local News Stations"
            fetchStations={fetchLocalNewsStations}
            onStationPlay={play}
          />
        </CarouselPlaceholder>

        <CarouselPlaceholder id="top-news" visibleCarousels={visibleCarousels}>
          <StationCarousel
            key={`top-news-${countryCode}-${city}`}
            title="Top News Stations"
            fetchStations={fetchTopNewsStations}
            onStationPlay={play}
          />
        </CarouselPlaceholder>

        <CarouselPlaceholder id="rock" visibleCarousels={visibleCarousels}>
          <StationCarousel
            key={`rock-${countryCode}-${city}`}
            title="Top Rock Stations"
            fetchStations={fetchTopRockStations}
            onStationPlay={play}
          />
        </CarouselPlaceholder>

        <CarouselPlaceholder id="sports" visibleCarousels={visibleCarousels}>
          <StationCarousel
            key={`sports-${countryCode}-${city}`}
            title="Top Sports Stations"
            fetchStations={fetchTopSportsStations}
            onStationPlay={play}
          />
        </CarouselPlaceholder>
      </main>
    </div>
  )
}
