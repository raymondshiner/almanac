// Mock search/seasons results for mock mode — deterministic, offline.
// Covers stay null so tests never hit the network.
import type { ItemDetails, MediaType, SearchResult, SearchType, SeasonResult } from '@/lib/types'

const r = (
  mediaType: SearchType,
  source: string,
  externalId: string,
  title: string,
  year: number | null,
  creator: string | null = null,
): SearchResult => ({ source, externalId, mediaType, title, year, creator, coverUrl: null })

const RESULTS: Record<SearchType, SearchResult[]> = {
  film: [
    r('film', 'tmdb', '335984', 'Blade Runner 2049', 2017),
    r('film', 'tmdb', '78', 'Blade Runner', 1982),
    r('film', 'tmdb', '329865', 'Arrival', 2016),
  ],
  tv_show: [
    r('tv_show', 'tmdb', '95396', 'Severance', 2022),
    r('tv_show', 'tmdb', '1438', 'The Wire', 2002),
  ],
  game: [
    r('game', 'rawg', '274755', 'Hades', 2020),
    r('game', 'rawg', '303576', 'Hades II', 2024),
    r('game', 'rawg', '50734', 'Celeste', 2018),
  ],
  book: [
    r('book', 'openlibrary', '/works/OL21745884W', 'Project Hail Mary', 2021, 'Andy Weir'),
    r('book', 'openlibrary', '/works/OL17091839W', 'The Martian', 2011, 'Andy Weir'),
  ],
  album: [
    r('album', 'musicbrainz', '32c95b47-1f60-3ea6-82f2-1d29c4a175f1', 'In Rainbows', 2007, 'Radiohead'),
    r('album', 'musicbrainz', 'b1392450-e666-3926-a536-22c65f834433', 'OK Computer', 1997, 'Radiohead'),
  ],
}

const SEASONS: Record<string, SeasonResult[]> = {
  '95396': [
    { externalId: '134772', seasonNumber: 1, title: 'Season 1', year: 2022, coverUrl: null },
    { externalId: '379481', seasonNumber: 2, title: 'Season 2', year: 2025, coverUrl: null },
  ],
  '1438': [
    { externalId: '4494', seasonNumber: 1, title: 'Season 1', year: 2002, coverUrl: null },
    { externalId: '4495', seasonNumber: 2, title: 'Season 2', year: 2003, coverUrl: null },
  ],
}

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms))

export async function mockSearch(type: SearchType, query: string): Promise<SearchResult[]> {
  await delay(120)
  const q = query.toLowerCase()
  return RESULTS[type].filter((x) => x.title.toLowerCase().includes(q))
}

export async function mockSeasons(showExternalId: string): Promise<SeasonResult[]> {
  await delay(120)
  return SEASONS[showExternalId] ?? []
}

const DETAIL_RATINGS: Partial<Record<MediaType, ItemDetails['ratings']>> = {
  film: [
    { source: 'IMDb', value: '8.0/10' },
    { source: 'Rotten Tomatoes', value: '88%' },
  ],
  tv_show: [{ source: 'IMDb', value: '8.7/10' }],
  game: [
    { source: 'Metacritic', value: '93/100' },
    { source: 'RAWG', value: '4.4/5' },
  ],
  book: [{ source: 'Open Library', value: '4.3/5' }],
}

export async function mockDetails(type: MediaType): Promise<ItemDetails> {
  await delay(120)
  return {
    description:
      'A mock synopsis long enough to exercise the description block: two sentences of plot summary, deterministic and offline, so tests never hit the network.',
    ratings: DETAIL_RATINGS[type] ?? [],
    backdropUrl: null,
    coverUrl: null,
    genres: type === 'album' ? ['Art Rock'] : ['Science Fiction', 'Drama'],
    fetchedAt: '2026-01-01T00:00:00.000Z',
  }
}
