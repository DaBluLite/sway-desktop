import { Station } from 'radio-browser-api'

/**
 * Configuration for similar stations search
 */
export interface SimilarStationsConfig {
  maxResults?: number
  minTagOverlap?: number
  includeCountryMatch?: boolean
  includeBitrateMatch?: boolean
}

const DEFAULT_CONFIG: Required<SimilarStationsConfig> = {
  maxResults: 20,
  minTagOverlap: 1,
  includeCountryMatch: true,
  includeBitrateMatch: false
}

/**
 * Parses tags from a station's tags (handles both string and string[] formats)
 */
export function parseStationTags(tags: string | string[] | undefined | null): string[] {
  if (!tags) return []

  // If already an array, normalize and return
  if (Array.isArray(tags)) {
    return tags.map((tag) => tag.toLowerCase().trim()).filter((tag) => tag.length > 0)
  }

  // If string, split by comma
  return tags
    .toLowerCase()
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
}

/**
 * Normalizes language field which can be string or string[]
 */
function normalizeLanguage(language: string | string[] | undefined | null): string[] {
  if (!language) return []
  if (Array.isArray(language)) {
    return language.map((l) => l.toLowerCase().trim()).filter((l) => l.length > 0)
  }
  return language
    .toLowerCase()
    .split(',')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
}

/**
 * Calculates a similarity score between two stations
 * Higher score = more similar
 */
export function calculateSimilarityScore(
  sourceStation: Station,
  candidateStation: Station,
  config: Required<SimilarStationsConfig>
): number {
  let score = 0

  // Don't match the same station
  if (sourceStation.url === candidateStation.url || sourceStation.id === candidateStation.id) {
    return -1
  }

  // Tag similarity (most important factor)
  const sourceTags = parseStationTags(sourceStation.tags)
  const candidateTags = parseStationTags(candidateStation.tags)

  if (sourceTags.length > 0 && candidateTags.length > 0) {
    const tagOverlap = sourceTags.filter((tag) => candidateTags.includes(tag)).length

    if (tagOverlap < config.minTagOverlap) {
      return -1 // Not enough tag overlap
    }

    // Score based on tag overlap percentage
    const maxPossibleOverlap = Math.min(sourceTags.length, candidateTags.length)
    score += (tagOverlap / maxPossibleOverlap) * 50

    // Bonus for exact genre match (first tag is often the primary genre)
    if (sourceTags[0] === candidateTags[0]) {
      score += 10
    }
  }

  // Country match (using countryCode - the normalized property name)
  if (config.includeCountryMatch && sourceStation.countryCode) {
    if (sourceStation.countryCode === candidateStation.countryCode) {
      score += 15
    }
    // Bonus for same state/region
    if (
      sourceStation.state &&
      candidateStation.state &&
      sourceStation.state === candidateStation.state
    ) {
      score += 5
    }
  }

  // Language match (language can be string or string[])
  const sourceLanguages = normalizeLanguage(sourceStation.language)
  const candidateLanguages = normalizeLanguage(candidateStation.language)

  if (sourceLanguages.length > 0 && candidateLanguages.length > 0) {
    const hasCommonLanguage = sourceLanguages.some((lang) => candidateLanguages.includes(lang))
    if (hasCommonLanguage) {
      score += 10
    }
  }

  // Codec match (users might prefer same audio format)
  if (
    sourceStation.codec &&
    candidateStation.codec &&
    sourceStation.codec === candidateStation.codec
  ) {
    score += 3
  }

  // Bitrate similarity (within 32kbps)
  if (config.includeBitrateMatch && sourceStation.bitrate && candidateStation.bitrate) {
    const bitrateDiff = Math.abs(sourceStation.bitrate - candidateStation.bitrate)
    if (bitrateDiff <= 32) {
      score += 5
    }
  }

  // Popularity factor (slightly prefer popular stations)
  if (candidateStation.clickCount) {
    // Logarithmic scaling to prevent very popular stations from dominating
    score += Math.min(Math.log10(candidateStation.clickCount + 1) * 2, 10)
  }

  // Quality factor (prefer verified/working stations)
  if (candidateStation.lastCheckOk) {
    score += 3
  }

  return score
}

/**
 * Builds search parameters for finding similar stations via the API
 */
export function buildSimilarStationsSearchParams(
  station: Station,
  config: SimilarStationsConfig = {}
): URLSearchParams {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }
  const params = new URLSearchParams()

  // Get primary tags (up to 3 most relevant)
  const tags = parseStationTags(station.tags).slice(0, 3)

  if (tags.length > 0) {
    // Search by the primary tag
    params.set('tag', tags[0])
  }

  // Optionally filter by country for more relevant results
  if (mergedConfig.includeCountryMatch && station.countryCode) {
    params.set('countrycode', station.countryCode)
  }

  // Order by popularity to get quality results
  params.set('order', 'clickcount')
  params.set('reverse', 'true')

  // Request more than needed so we can filter and score
  params.set('limit', String(mergedConfig.maxResults * 3))
  params.set('offset', '0')

  return params
}

/**
 * Filters and ranks similar stations from API results
 */
export function rankSimilarStations(
  sourceStation: Station,
  candidates: Station[],
  config: SimilarStationsConfig = {}
): Station[] {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }

  // Calculate scores and filter out non-matches
  const scoredStations = candidates
    .map((candidate) => ({
      station: candidate,
      score: calculateSimilarityScore(sourceStation, candidate, mergedConfig)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)

  // Return top results
  return scoredStations.slice(0, mergedConfig.maxResults).map((item) => item.station)
}

/**
 * Gets the primary genre/tag for display purposes
 */
export function getPrimaryGenre(station: Station): string | null {
  const tags = parseStationTags(station.tags)
  if (tags.length === 0) return null

  // Capitalize first letter
  return tags[0].charAt(0).toUpperCase() + tags[0].slice(1)
}

/**
 * Gets a list of common genres between two stations
 */
export function getCommonGenres(station1: Station, station2: Station): string[] {
  const tags1 = parseStationTags(station1.tags)
  const tags2 = parseStationTags(station2.tags)

  return tags1
    .filter((tag) => tags2.includes(tag))
    .map((tag) => tag.charAt(0).toUpperCase() + tag.slice(1))
}

/**
 * Determines why two stations are similar (for UI display)
 */
export function getSimilarityReasons(sourceStation: Station, similarStation: Station): string[] {
  const reasons: string[] = []

  // Common tags
  const commonTags = getCommonGenres(sourceStation, similarStation)
  if (commonTags.length > 0) {
    if (commonTags.length === 1) {
      reasons.push(`${commonTags[0]} music`)
    } else {
      reasons.push(`${commonTags.slice(0, 2).join(', ')}`)
    }
  }

  // Same country
  if (sourceStation.countryCode && sourceStation.countryCode === similarStation.countryCode) {
    if (sourceStation.country) {
      reasons.push(similarStation.country || 'Same country')
    }
  }

  // Same language
  const sourceLanguages = normalizeLanguage(sourceStation.language)
  const similarLanguages = normalizeLanguage(similarStation.language)

  if (sourceLanguages.length > 0 && similarLanguages.length > 0) {
    const commonLanguage = sourceLanguages.find((lang) => similarLanguages.includes(lang))
    if (commonLanguage) {
      // Capitalize the language name
      reasons.push(commonLanguage.charAt(0).toUpperCase() + commonLanguage.slice(1))
    }
  }

  return reasons.slice(0, 2) // Return max 2 reasons
}
