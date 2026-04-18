import { useEffect, useState, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, LoaderCircle, Play } from 'lucide-react'
import { useAudioPlayer } from '../contexts/audio-player-context'
import { Station } from 'radio-browser-api'

export const FeaturedStationCarousel: React.FC = () => {
  const [stations, setStations] = useState<Station[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const { play } = useAudioPlayer()
  const isFetchingRef = useRef(false)

  const fetchFeaturedStations = useCallback(async () => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        // Quality signals
        has_extended_info: 'true', // station has filled out metadata properly
        is_https: 'true', // uses secure stream URL (optional but nice)

        // Popularity/reliability signals
        order: 'votes', // sort by community votes
        reverse: 'true', // highest first

        // Filter out junk
        hidebroken: 'true' // exclude stations with broken streams
      })
      const response = await fetch(
        `https://sway.dablulite.dev/api/radio/search?${params.toString()}`
      )
      const data = await response.json()
      setStations(data.filter((station: Station) => station.favicon))
    } catch (error) {
      console.warn('Failed to fetch featured stations:', error)
    } finally {
      isFetchingRef.current = false
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFeaturedStations()
  }, [fetchFeaturedStations])

  const currentStation = stations[currentIndex]

  const handleNext = () => {
    if (currentIndex === stations.length - 3) {
      fetchFeaturedStations()
    }
    if (currentIndex < stations.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }

  if (!currentStation && isLoading) {
    return (
      <div className="w-full h-80 flex items-center justify-center bg-theme-bg/10 rounded-2xl mb-12">
        <LoaderCircle className="opacity-20 size-12 animate-spin" />
      </div>
    )
  }

  if (!currentStation) return null

  return (
    <div className="relative group w-full h-80 mb-12 overflow-hidden rounded-3xl bg-theme-bg/5 flex items-center mr-8">
      {/* Background Blur */}
      {currentStation.favicon && (
        <div
          className="absolute inset-0 z-0 blur-3xl scale-110 shadow-main"
          style={{
            backgroundImage: `url(${currentStation.favicon})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10 flex w-full h-full p-8 items-center gap-8">
        <div className="shadow-main w-64 h-64 shrink-0 rounded-xl overflow-hidden transition-transform duration-300">
          {currentStation.favicon ? (
            <img
              src={currentStation.favicon}
              alt={currentStation.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-theme-bg/20 flex items-center justify-center">
              <Play className="opacity-20 size-3" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1 flex-1">
          <h2 className="text-5xl truncate leading-14 font-light">{currentStation.name}</h2>

          <div className="flex gap-4 mt-8">
            <button
              onClick={() => play(currentStation)}
              className="px-8 py-3 rounded-full font-bold flex items-center gap-2 btn backdrop-brightness-50 cursor-pointer"
            >
              <Play className="size-4" />
              Play
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <div className="absolute inset-y-0 left-4 z-20 flex items-center">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="p-2 rounded-full btn cursor-pointer disabled:opacity-0 transition-all active:scale-90 backdrop-brightness-75"
        >
          <ChevronLeft className="size-8" />
        </button>
      </div>

      <div className="absolute inset-y-0 right-4 z-20 flex items-center">
        <button
          onClick={handleNext}
          className="p-2 rounded-full btn cursor-pointer disabled:opacity-0 transition-all active:scale-90 backdrop-brightness-75"
        >
          {isLoading && stations.length - 1 === currentIndex ? (
            <LoaderCircle className="size-8 animate-spin" />
          ) : (
            <ChevronRight className="size-8" />
          )}
        </button>
      </div>

      {/* Progress Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-1">
        {stations
          .slice(Math.max(0, currentIndex - 2), Math.min(stations.length, currentIndex + 3))
          .map((_, i) => {
            const actualIndex = Math.max(0, currentIndex - 2) + i
            return (
              <div
                key={actualIndex}
                className={`h-1.5 rounded-full transition-all duration-300 ${actualIndex === currentIndex ? 'w-6 bg-theme-text' : 'w-1.5 bg-theme-text/20'}`}
              />
            )
          })}
      </div>
    </div>
  )
}
