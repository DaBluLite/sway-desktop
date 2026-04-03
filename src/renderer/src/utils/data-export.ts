import { Station } from 'radio-browser-api'
import { Playlist } from '../contexts/playlists-context'
import { HistoryEntry } from '../contexts/history-context'

// Version for data format compatibility
const EXPORT_VERSION = 2

export interface ExportData {
  version: number
  exportedAt: string
  appName: string
  data: {
    favourites?: Station[]
    playlists?: Playlist[]
    history?: HistoryEntry[]
    settings?: {
      theme?: 'light' | 'dark' | 'system'
    }
  }
}

export interface ImportResult {
  success: boolean
  message: string
  imported: {
    favourites: number
    playlists: number
    savedStations: number
    historyEntries: number
    settings: boolean
  }
  errors: string[]
}

/**
 * Creates an export data object from user data
 */
export function createExportData(options: {
  favourites?: Station[]
  playlists?: Playlist[]
  history?: HistoryEntry[]
  settings?: {
    theme?: 'light' | 'dark' | 'system'
  }
}): ExportData {
  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    appName: 'Sway Radio',
    data: {
      ...(options.favourites && { favourites: options.favourites }),
      ...(options.playlists && { playlists: options.playlists }),
      ...(options.history && { history: options.history }),
      ...(options.settings && { settings: options.settings })
    }
  }
}

/**
 * Converts export data to a JSON string
 */
export function exportToJson(data: ExportData): string {
  return JSON.stringify(data, null, 2)
}

/**
 * Downloads export data as a JSON file
 */
export function downloadExport(data: ExportData, filename?: string): void {
  const json = exportToJson(data)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const date = new Date().toISOString().split('T')[0]
  const defaultFilename = `sway-radio-backup-${date}.json`

  const link = document.createElement('a')
  link.href = url
  link.download = filename || defaultFilename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Parses import data from a JSON string
 */
export function parseImportData(jsonString: string): ExportData | null {
  try {
    const data = JSON.parse(jsonString)

    // Validate basic structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data format')
    }

    // Check version compatibility
    if (data.version && data.version > EXPORT_VERSION) {
      throw new Error(`Data version ${data.version} is not supported. Please update the app.`)
    }

    return data as ExportData
  } catch (error) {
    console.error('Failed to parse import data:', error)
    return null
  }
}

/**
 * Reads a file and returns its content as a string
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

/**
 * Validates station data
 */
export function isValidStation(station: unknown): station is Station {
  if (!station || typeof station !== 'object') return false
  const s = station as Record<string, unknown>
  return typeof s.name === 'string' && typeof s.url === 'string' && s.url.length > 0
}

/**
 * Validates playlist data
 */
function isValidPlaylist(playlist: unknown): playlist is Playlist {
  if (!playlist || typeof playlist !== 'object') return false
  const p = playlist as Record<string, unknown>
  return typeof p.id === 'string' && typeof p.name === 'string' && Array.isArray(p.stations)
}

/**
 * Validates history entry data
 */
function isValidHistoryEntry(entry: unknown): entry is HistoryEntry {
  if (!entry || typeof entry !== 'object') return false
  const e = entry as Record<string, unknown>
  return typeof e.playedAt === 'string' && isValidStation(e.station)
}

/**
 * Validates and sanitizes import data
 */
export function validateImportData(data: ExportData): {
  isValid: boolean
  errors: string[]
  sanitized: ExportData['data']
} {
  const errors: string[] = []
  const sanitized: ExportData['data'] = {}

  // Validate favourites
  if (data.data.favourites) {
    if (!Array.isArray(data.data.favourites)) {
      errors.push('Favourites data is not an array')
    } else {
      sanitized.favourites = data.data.favourites.filter((station) => {
        if (!isValidStation(station)) {
          errors.push(`Invalid station in favourites: ${JSON.stringify(station).slice(0, 50)}`)
          return false
        }
        return true
      })
    }
  }

  // Validate playlists
  if (data.data.playlists) {
    if (!Array.isArray(data.data.playlists)) {
      errors.push('Playlists data is not an array')
    } else {
      sanitized.playlists = data.data.playlists
        .filter((playlist) => {
          if (!isValidPlaylist(playlist)) {
            errors.push(`Invalid playlist: ${JSON.stringify(playlist).slice(0, 50)}`)
            return false
          }
          return true
        })
        .map((playlist) => ({
          ...playlist,
          stations: playlist.stations.filter(isValidStation)
        }))
    }
  }

  // Validate history
  if (data.data.history) {
    if (!Array.isArray(data.data.history)) {
      errors.push('History data is not an array')
    } else {
      sanitized.history = data.data.history.filter((entry) => {
        if (!isValidHistoryEntry(entry)) {
          errors.push(`Invalid history entry: ${JSON.stringify(entry).slice(0, 50)}`)
          return false
        }
        return true
      })
    }
  }

  // Validate settings
  if (data.data.settings) {
    const validThemes = ['light', 'dark', 'system']
    if (data.data.settings.theme && validThemes.includes(data.data.settings.theme)) {
      sanitized.settings = { theme: data.data.settings.theme }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  }
}

/**
 * Generates a shareable URL for a station using the station UUID
 */
export function generateStationShareUrl(station: Station): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  // Use the station UUID (id) for a clean, simple URL
  if (station.id) {
    return `${baseUrl}/station/${station.id}`
  }

  // Fallback: encode minimal station info if no UUID available
  const params = new URLSearchParams({
    name: station.name,
    url: station.urlResolved || station.url
  })

  return `${baseUrl}/station?${params.toString()}`
}

/**
 * Parses a station UUID from a share URL path
 */
export function parseStationIdFromPath(path: string): string | null {
  // Match /station/[uuid] pattern
  const match = path.match(/\/station\/([a-f0-9-]+)$/i)
  return match ? match[1] : null
}

/**
 * Parses station info from legacy share URL parameters (fallback)
 */
export function parseStationFromShareParams(params: URLSearchParams): Partial<Station> | null {
  const name = params.get('name')
  const url = params.get('url')

  if (!name || !url) return null

  return {
    name,
    url,
    urlResolved: url
  }
}

/**
 * Copies text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }

    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    const result = document.execCommand('copy')
    document.body.removeChild(textArea)
    return result
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}

/**
 * Generates a QR code data URL for a given text
 * Uses a public QR code API
 */
export function generateQRCodeUrl(text: string, size: number = 200): string {
  const encodedText = encodeURIComponent(text)
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedText}`
}
