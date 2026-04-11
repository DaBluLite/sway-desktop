import { useRef, useCallback, useState, useEffect } from 'react'
import { Icon } from '@mdi/react'
import { mdiChevronLeft, mdiChevronRight } from '@mdi/js'
import { PlaylistCard } from './playlist-card'
import { SubsonicPlaylist } from '../../../../types/subsonic'

interface PlaylistCarouselProps {
  title: string
  playlists: SubsonicPlaylist[]
  onPlay: (playlist: SubsonicPlaylist) => void
}

export const PlaylistCarousel: React.FC<PlaylistCarouselProps> = ({
  title,
  playlists,
  onPlay
}: PlaylistCarouselProps) => {
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
  }, [updateArrowVisibility, playlists.length])

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return

    const scrollAmount = scrollContainerRef.current.clientWidth * 0.8
    const newScrollLeft =
      scrollContainerRef.current.scrollLeft + (direction === 'right' ? scrollAmount : -scrollAmount)

    scrollContainerRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    })
  }

  if (playlists.length === 0) {
    return null
  }

  return (
    <div className="playlist-carousel">
      {title && (
        <div className="playlist-carousel-header">
          <h2 className="playlist-carousel-title">{title}</h2>
        </div>
      )}

      <div className="playlist-carousel-wrapper ml-4">
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="playlist-carousel-scroll-arrow playlist-carousel-scroll-arrow-left"
            aria-label="Scroll left"
          >
            <Icon path={mdiChevronLeft} size={1.5} />
          </button>
        )}

        <div className="playlist-carousel-scroll" ref={scrollContainerRef}>
          <div className="playlist-carousel-content">
            {playlists.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} onPlay={onPlay} />
            ))}
          </div>
        </div>

        {showRightArrow && (
          <button
            onClick={() => scroll('right')}
            className="playlist-carousel-scroll-arrow playlist-carousel-scroll-arrow-right"
            aria-label="Scroll right"
          >
            <Icon path={mdiChevronRight} size={1.5} />
          </button>
        )}
      </div>
    </div>
  )
}
