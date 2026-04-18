import React, { useEffect, useState, useCallback, useRef, Fragment } from 'react'
import { SubsonicAlbum, SubsonicSong } from '../../../../types/subsonic'
import { Link, useRouter } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, LoaderCircle, Play } from 'lucide-react'
import { useAudioPlayer } from '@renderer/contexts/audio-player-context'

export const FeaturedAlbumCarousel: React.FC = () => {
  const [albums, setAlbums] = useState<SubsonicAlbum[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const router = useRouter()
  const isFetchingRef = useRef(false)
  const { playSong } = useAudioPlayer()

  const fetchRandomAlbums = useCallback(async () => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    setIsLoading(true)
    try {
      const result = await window.api.subsonic.getRandomAlbums({ size: '10', offset: '0' })
      if (result.success && result.data) {
        const newAlbums = result.data as SubsonicAlbum[]
        setAlbums((prev) => [...prev, ...newAlbums])
      }
    } catch (error) {
      console.error('Failed to fetch random albums:', error)
    } finally {
      setIsLoading(false)
      isFetchingRef.current = false
    }
  }, [])

  function playAlbum(album: SubsonicAlbum) {
    try {
      window.api.subsonic.getAlbum(album.id).then((result) => {
        if (result.success && result.data) {
          const albumData = result.data as { song: SubsonicSong[] }
          playSong(albumData.song, albumData.song[0].id)
        }
      })
    } catch (err) {
      console.error('Failed to play album:', err)
    }
  }

  useEffect(() => {
    fetchRandomAlbums()
  }, [fetchRandomAlbums])

  const currentAlbum = albums[currentIndex]

  useEffect(() => {
    if (currentAlbum) {
      window.api.subsonic.getCoverArtUrl(currentAlbum.id).then((url) => {
        setCoverUrl(url)
      })
    }
  }, [currentAlbum])

  const handleNext = () => {
    if (currentIndex === albums.length - 3) {
      fetchRandomAlbums()
    }
    if (currentIndex < albums.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }

  const handleNavigate = () => {
    if (currentAlbum) {
      router.navigate({ to: `/album/${currentAlbum.id}` })
    }
  }

  if (!currentAlbum && isLoading) {
    return (
      <div className="w-full h-80 flex items-center justify-center bg-theme-bg/10 rounded-2xl mb-12">
        <LoaderCircle className="opacity-20 size-12 animate-spin" />
      </div>
    )
  }

  if (!currentAlbum) return null

  return (
    <div className="relative group w-full h-80 mb-12 overflow-hidden rounded-3xl bg-theme-bg/5 flex items-center mr-8">
      {/* Background Blur */}
      {coverUrl && (
        <div
          className="absolute inset-0 z-0 blur-3xl scale-110 shadow-main"
          style={{
            backgroundImage: `url(${coverUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10 flex w-full h-full p-8 items-center gap-8">
        <div
          className="shadow-main w-64 h-64 shrink-0 rounded-xl overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-300"
          onClick={handleNavigate}
        >
          {coverUrl ? (
            <img src={coverUrl} alt={currentAlbum.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-theme-bg/20 flex items-center justify-center">
              <Play className="opacity-20 size-3" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1 flex-1">
          <h2
            className="text-5xl truncate leading-14 cursor-pointer hover:underline font-light"
            onClick={handleNavigate}
          >
            {currentAlbum.name}
          </h2>
          <div className="flex items-center">
            {currentAlbum.artists.map((artist, i) => (
              <Fragment key={artist.id}>
                <Link
                  className="text-2xl font-light opacity-70 truncate hover:underline"
                  to={`/artist/$artistId`}
                  params={{ artistId: artist.id }}
                >
                  {artist.name}
                </Link>
                {currentAlbum.artists.length > 1 && i < currentAlbum.artists.length - 1 && (
                  <span className="text-2xl font-light opacity-70 mr-2">, </span>
                )}{' '}
              </Fragment>
            ))}
          </div>

          <div className="flex gap-4 mt-8">
            <button
              onClick={() => playAlbum(currentAlbum)}
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
          {isLoading && albums.length - 1 === currentIndex ? (
            <LoaderCircle className="size-8 animate-spin" />
          ) : (
            <ChevronRight className="size-8" />
          )}
        </button>
      </div>

      {/* Progress Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-1">
        {albums
          .slice(Math.max(0, currentIndex - 2), Math.min(albums.length, currentIndex + 3))
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
