import { useCallback, useEffect, useState } from 'react'
import { useAudioPlayer } from '../../contexts/audio-player-context'
import { GoogleMap, useJsApiLoader, OverlayView } from '@react-google-maps/api'
import Icon from '@mdi/react'
import { mdiRadio, mdiRefresh, mdiFilterOutline } from '@mdi/js'
import { IconPin, ImagePin } from '../../components/pins'
import { useUserLocation } from '../../contexts/user-location-context'
import { Station } from 'radio-browser-api'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/map/')({
  component: RadioMap
})

export default function RadioMap() {
  const [radios, setRadios] = useState<Station[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const { play } = useAudioPlayer()
  const { coordinates, countryCode } = useUserLocation()
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.RENDERER_VITE_GOOGLE_MAPS_KEY as string
  })

  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: coordinates?.latitude || 40,
    lng: coordinates?.longitude || 0
  })

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })

  // Available genre filters
  const genres = [
    { value: null, label: 'All' },
    { value: 'music', label: 'Music' },
    { value: 'news', label: 'News' },
    { value: 'sports', label: 'Sports' },
    { value: 'talk', label: 'Talk' },
    { value: 'rock', label: 'Rock' },
    { value: 'pop', label: 'Pop' },
    { value: 'jazz', label: 'Jazz' },
    { value: 'classical', label: 'Classical' }
  ]

  // Detect theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  // Update map center when user location changes
  useEffect(() => {
    if (coordinates?.latitude && coordinates?.longitude) {
      setMapCenter({
        lat: coordinates.latitude,
        lng: coordinates.longitude
      })
    }
  }, [coordinates])

  // Fetch stations based on user's country and selected filter
  const fetchStations = useCallback(async () => {
    setIsLoading(true)
    try {
      let url = `https://sway.dablulite.dev/api/radio/search?limit=50&order=clickcount&reverse=true&has_geo_info=true`

      // Use country code if available
      if (countryCode) {
        url += `&countrycode=${countryCode}`
      }

      // Add tag filter if selected
      if (selectedTag) {
        url += `&tag=${selectedTag}`
      }

      const response = await fetch(url)
      const data = await response.json()
      setRadios(data)
    } catch (error) {
      console.error('Failed to fetch radio stations:', error)
    } finally {
      setIsLoading(false)
    }
  }, [countryCode, selectedTag])

  useEffect(() => {
    fetchStations()
  }, [fetchStations])

  const onLoad = useCallback(
    function callback(map: google.maps.Map) {
      if (coordinates?.latitude && coordinates?.longitude) {
        const bounds = new window.google.maps.LatLngBounds({
          lat: coordinates.latitude,
          lng: coordinates.longitude
        })
        map.fitBounds(bounds)

        // Set a reasonable zoom level after fitting bounds
        setTimeout(() => {
          map.setZoom(6)
        }, 100)
      }
    },
    [coordinates]
  )

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const onUnmount = useCallback(function callback() {}, [])

  // Light theme map styles
  const lightMapStyles = [
    {
      elementType: 'geometry',
      stylers: [{ color: '#f5f5f5' }]
    },
    {
      elementType: 'labels.icon',
      stylers: [{ visibility: 'off' }]
    },
    {
      elementType: 'labels.text.fill',
      stylers: [{ color: '#616161' }]
    },
    {
      elementType: 'labels.text.stroke',
      stylers: [{ color: '#f5f5f5' }]
    },
    {
      featureType: 'administrative.land_parcel',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#bdbdbd' }]
    },
    {
      featureType: 'poi',
      stylers: [{ visibility: 'off' }]
    },
    {
      featureType: 'poi.park',
      elementType: 'geometry',
      stylers: [{ color: '#c8e6c9' }]
    },
    {
      featureType: 'road',
      stylers: [{ visibility: 'off' }]
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#ffffff' }]
    },
    {
      featureType: 'road.arterial',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#757575' }]
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry',
      stylers: [{ color: '#dadada' }]
    },
    {
      featureType: 'road.highway',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#616161' }]
    },
    {
      featureType: 'transit',
      stylers: [{ visibility: 'off' }]
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#a5d6f0' }]
    },
    {
      featureType: 'water',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#9e9e9e' }]
    }
  ]

  // Dark theme map styles
  const darkMapStyles = [
    {
      elementType: 'geometry',
      stylers: [{ color: '#212121' }]
    },
    {
      elementType: 'geometry.stroke',
      stylers: [{ visibility: 'on' }]
    },
    {
      elementType: 'labels.icon',
      stylers: [{ visibility: 'off' }]
    },
    {
      elementType: 'labels.text.fill',
      stylers: [{ color: '#757575' }]
    },
    {
      elementType: 'labels.text.stroke',
      stylers: [{ color: '#212121' }]
    },
    {
      featureType: 'administrative',
      elementType: 'geometry',
      stylers: [{ color: '#757575' }, { visibility: 'off' }]
    },
    {
      featureType: 'administrative.country',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#9e9e9e' }]
    },
    {
      featureType: 'administrative.locality',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#bdbdbd' }]
    },
    {
      featureType: 'poi',
      stylers: [{ visibility: 'off' }]
    },
    {
      featureType: 'poi.park',
      elementType: 'geometry',
      stylers: [{ color: '#181818' }, { visibility: 'on' }]
    },
    {
      featureType: 'road',
      stylers: [{ visibility: 'off' }]
    },
    {
      featureType: 'transit',
      stylers: [{ visibility: 'off' }]
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#000000' }]
    },
    {
      featureType: 'water',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#3d3d3d' }]
    }
  ]

  return (
    <div className="relative w-full h-screen">
      {/* Filter Controls */}
      <div className="absolute top-6 md:top-20 left-4 md:left-20 z-10 flex flex-wrap gap-2">
        <div className="flex items-center gap-2 btn backdrop-blur-normal rounded-md p-2">
          <Icon path={mdiFilterOutline} size={0.8} className="text-zinc-300" />
          <select
            value={selectedTag || ''}
            onChange={(e) => setSelectedTag(e.target.value || null)}
            className="bg-transparent text-zinc-200 text-sm font-medium focus:outline-none cursor-pointer"
          >
            {genres.map((genre) => (
              <option
                key={genre.value || 'all'}
                value={genre.value || ''}
                className="bg-white dark:bg-zinc-900"
              >
                {genre.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={fetchStations}
          disabled={isLoading}
          className="flex items-center gap-2 btn backdrop-blur-normal rounded-md px-3 py-2 text-zinc-200 text-sm font-medium cursor-pointer disabled:opacity-50"
        >
          <Icon
            path={mdiRefresh}
            size={0.8}
            spin={isLoading}
            className={isLoading ? 'animate-spin' : ''}
          />
          Refresh
        </button>
      </div>

      {/* Station count indicator */}
      <div className="absolute top-20 right-4 md:right-8 z-10 raised-interface backdrop-blur-normal rounded-md px-3 py-2">
        <span className="text-zinc-200 text-sm font-medium">
          {isLoading ? 'Loading...' : `${radios.length} stations`}
        </span>
      </div>

      {isLoaded ? (
        <GoogleMap
          center={mapCenter}
          zoom={6}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={{
            colorScheme: isDarkMode ? 'dark' : 'light',
            disableDefaultUI: true,
            backgroundColor: isDarkMode ? '#000000' : '#f5f5f5',
            styles: isDarkMode ? darkMapStyles : lightMapStyles,
            zoomControl: true,
            zoomControlOptions: {
              position: google.maps.ControlPosition.RIGHT_CENTER
            }
          }}
          mapContainerStyle={{
            position: 'relative',
            zIndex: 0,
            width: '100%',
            height: '100vh'
          }}
        >
          {radios.map((radio, index) => {
            // Skip stations without valid coordinates
            if (!radio.geoLat || !radio.geoLong) return null

            return (
              <OverlayView
                key={radio.url + '_' + index}
                position={{ lat: radio.geoLat, lng: radio.geoLong }}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              >
                {radio.favicon && radio.favicon.startsWith('https') ? (
                  <ImagePin
                    imageUrl={radio.favicon}
                    size={40}
                    borderColor="white"
                    title={radio.name}
                    onClick={(e) => {
                      e.stopPropagation()
                      play(radio)
                    }}
                  />
                ) : (
                  <IconPin
                    icon={<Icon path={mdiRadio} size={1} color="black" />}
                    color="white"
                    size={40}
                    iconColor="white"
                    title={radio.name}
                    onClick={(e) => {
                      e.stopPropagation()
                      play(radio)
                    }}
                  />
                )}
              </OverlayView>
            )
          })}
        </GoogleMap>
      ) : (
        <div className="flex items-center justify-center w-full h-screen bg-[#f5f5f5] dark:bg-black">
          <div className="flex flex-col items-center gap-4">
            <Icon path={mdiRadio} size={3} className="use-theme-text animate-pulse" />
            <p className="use-theme-text">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  )
}
