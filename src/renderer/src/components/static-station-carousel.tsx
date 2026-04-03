import React, { useRef, useCallback, useState, useEffect } from 'react'
import { Icon } from '@mdi/react'
import { mdiChevronLeft, mdiChevronRight } from '@mdi/js'
import { StationCard } from './station-card'
import { Station } from 'radio-browser-api'

interface StaticStationCarouselProps {
  title?: string
  stations: Station[]
  onStationPlay: (station: Station) => void
}

export const StaticStationCarousel: React.FC<StaticStationCarouselProps> = ({
  title,
  stations,
  onStationPlay
}) => {
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

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
    window.addEventListener('resize', updateArrowVisibility)

    return () => {
      scrollContainer.removeEventListener('scroll', updateArrowVisibility)
      window.removeEventListener('resize', updateArrowVisibility)
    }
  }, [updateArrowVisibility, stations.length])

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

  if (stations.length === 0) {
    return null
  }

  return (
    <div className="station-carousel">
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
