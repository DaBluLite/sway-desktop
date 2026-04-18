import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Icon } from '@mdi/react'
import { mdiChevronLeft, mdiChevronRight, mdiLoading } from '@mdi/js'
import { ArtistCard } from './artist-card'
import { SubsonicArtist } from '../../../../types/subsonic'

interface ArtistCarouselProps {
  title: string
  fetchArtists: (offset: number, limit: number) => Promise<SubsonicArtist[]>
}

export const ArtistCarousel: React.FC<ArtistCarouselProps> = ({ title, fetchArtists }) => {
  const [artists, setArtists] = useState<SubsonicArtist[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const isLoadingRef = useRef(false)
  const hasInitializedRef = useRef(false)

  const loadMoreArtists = useCallback(async () => {
    if (isLoadingRef.current || !hasMore) return

    isLoadingRef.current = true
    setIsLoading(true)

    try {
      const newArtists = await fetchArtists(offset, 15)

      if (!Array.isArray(newArtists)) {
        isLoadingRef.current = false
        setIsLoading(false)
        return
      }

      if (newArtists.length < 15) {
        setHasMore(false)
      }

      setArtists((prev) => [...prev, ...newArtists])
      setOffset((prev) => prev + 15)
    } catch (error) {
      console.error('Failed to load albums:', error)
    } finally {
      isLoadingRef.current = false
      setIsLoading(false)
    }
  }, [offset, hasMore, fetchArtists])

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingRef.current) {
          loadMoreArtists()
        }
      },
      { threshold: 0.1, root: scrollContainerRef.current }
    )

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current)
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect()
    }
  }, [hasMore, loadMoreArtists])

  useEffect(() => {
    if (!hasInitializedRef.current && !isLoadingRef.current) {
      hasInitializedRef.current = true
      loadMoreArtists()
    }
  }, [loadMoreArtists])

  const updateArrowVisibility = useCallback(() => {
    if (!scrollContainerRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
    setShowLeftArrow(scrollLeft > 0)
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10)
  }, [])

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return
    updateArrowVisibility()
    scrollContainer.addEventListener('scroll', updateArrowVisibility)
    if (typeof window !== 'undefined') window.addEventListener('resize', updateArrowVisibility)
    return () => {
      scrollContainer.removeEventListener('scroll', updateArrowVisibility)
      if (typeof window !== 'undefined') window.removeEventListener('resize', updateArrowVisibility)
    }
  }, [updateArrowVisibility, artists.length])

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return
    const scrollAmount = scrollContainerRef.current.clientWidth * 0.8
    const newScrollLeft =
      scrollContainerRef.current.scrollLeft + (direction === 'right' ? scrollAmount : -scrollAmount)
    scrollContainerRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' })
  }

  if (!hasInitializedRef.current && artists.length === 0) return null

  return (
    <div className="station-carousel mb-8">
      {title && (
        <div className="station-carousel-header">
          <h2 className="station-carousel-title">{title}</h2>
        </div>
      )}
      <div className="station-carousel-wrapper">
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="station-carousel-scroll-arrow station-carousel-scroll-arrow-left"
          >
            <Icon path={mdiChevronLeft} size={1.5} />
          </button>
        )}
        <div className="station-carousel-scroll" ref={scrollContainerRef}>
          <div className="station-carousel-content">
            {artists.map((artist, index) => (
              <ArtistCard key={`${artist.id}-${index}`} artist={artist} />
            ))}
            {hasMore && (
              <div ref={sentinelRef} className="station-carousel-sentinel">
                {isLoading && (
                  <div className="station-carousel-loader">
                    <Icon path={mdiLoading} size={2} spin className="use-theme-text opacity-50" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {showRightArrow && (
          <button
            onClick={() => scroll('right')}
            className="station-carousel-scroll-arrow station-carousel-scroll-arrow-right"
          >
            <Icon path={mdiChevronRight} size={1.5} />
          </button>
        )}
      </div>
    </div>
  )
}
