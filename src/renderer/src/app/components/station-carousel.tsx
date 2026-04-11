'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Icon } from '@mdi/react'
import { mdiChevronLeft, mdiChevronRight, mdiLoading } from '@mdi/js'
import { StationCard } from './station-card'
import { Station } from 'radio-browser-api'

interface StationCarouselProps {
  title: string
  fetchStations: (offset: number, limit: number) => Promise<Station[]>
  onStationPlay: (station: Station) => void
}

export const StationCarousel: React.FC<StationCarouselProps> = ({
  title,
  fetchStations,
  onStationPlay
}) => {
  const [stations, setStations] = useState<Station[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isLoadingRef = useRef(false)
  const hasInitializedRef = useRef(false)

  // Memoize the fetch function to prevent unnecessary recreations
  const memoizedFetchStations = useCallback(
    (offset: number, limit: number) => {
      return fetchStations(offset, limit)
    },
    [fetchStations]
  )

  const loadMoreStations = useCallback(async () => {
    // Use ref to prevent race conditions
    if (isLoadingRef.current || !hasMore) return

    isLoadingRef.current = true
    setIsLoading(true)

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()

    try {
      const newStations = await Promise.race([
        memoizedFetchStations(offset, 15),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Request timeout')),
            10000 // 10 second timeout
          )
        )
      ])

      if (!Array.isArray(newStations)) {
        isLoadingRef.current = false
        setIsLoading(false)
        return
      }

      if (newStations.length < 15) {
        setHasMore(false)
      }

      setStations((prev) => [...prev, ...newStations])
      setOffset((prev) => prev + 15)
    } catch (error) {
      // Only log if it's not an abort
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Failed to load stations:', error)
      }
    } finally {
      isLoadingRef.current = false
      setIsLoading(false)
    }
  }, [offset, hasMore, memoizedFetchStations])

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingRef.current) {
          loadMoreStations()
        }
      },
      { threshold: 0.1, root: scrollContainerRef.current }
    )

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [hasMore, loadMoreStations])

  // Load initial data only once
  useEffect(() => {
    if (!hasInitializedRef.current && !isLoadingRef.current) {
      hasInitializedRef.current = true
      loadMoreStations()
    }
  }, [loadMoreStations])

  // Update arrow visibility on scroll
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

    // Only add window listener on client-side
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', updateArrowVisibility)
    }

    return () => {
      scrollContainer.removeEventListener('scroll', updateArrowVisibility)
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', updateArrowVisibility)
      }
    }
  }, [updateArrowVisibility, stations.length])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  const scroll = (direction: 'left' | 'right'): void => {
    if (!scrollContainerRef.current) return

    const scrollAmount = scrollContainerRef.current.clientWidth * 0.8
    const newScrollLeft =
      scrollContainerRef.current.scrollLeft + (direction === 'right' ? scrollAmount : -scrollAmount)

    scrollContainerRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    })
  }

  return (
    <div className="station-carousel">
      <div className="station-carousel-header">
        <h2 className="station-carousel-title">{title}</h2>
      </div>

      <div className="station-carousel-wrapper">
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="station-carousel-scroll-arrow station-carousel-scroll-arrow-left"
            aria-label="Scroll left"
          >
            <Icon path={mdiChevronLeft} size={1.5} />
          </button>
        )}

        <div className="station-carousel-scroll" ref={scrollContainerRef}>
          <div className="station-carousel-content">
            {stations.map((station, index) => (
              <StationCard
                key={`${station.url}-${index}`}
                station={station}
                onPlay={onStationPlay}
              />
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
            aria-label="Scroll right"
          >
            <Icon path={mdiChevronRight} size={1.5} />
          </button>
        )}
      </div>
    </div>
  )
}
