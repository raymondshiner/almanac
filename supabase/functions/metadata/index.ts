// Edge function: metadata — proxies the four external media APIs so keys stay
// server-side (one place for CORS + rate-limit etiquette). Invoked with:
//   { action: 'search', type: 'film'|'tv_show'|'game'|'book'|'album', query }
//   { action: 'seasons', showId }   // TMDB TV seasons for a show
// Secrets: TMDB_API_KEY, RAWG_API_KEY. OpenLibrary + MusicBrainz need none.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type SearchResult = {
  source: string
  externalId: string
  mediaType: string
  title: string
  year: number | null
  creator: string | null
  coverUrl: string | null
}

const TMDB_IMG = 'https://image.tmdb.org/t/p/w342'
const MB_UA = 'almanac/0.1 (https://github.com/raymondshiner/almanac)'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })

function need(name: string): string {
  const v = Deno.env.get(name)
  if (!v) throw new Error(`missing secret ${name}`)
  return v
}

async function getJSON(url: string, headers: Record<string, string> = {}) {
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`${url.split('?')[0]} responded ${res.status}`)
  return res.json()
}

const yearOf = (d?: string | null): number | null =>
  d && d.length >= 4 ? Number(d.slice(0, 4)) : null

// deno-lint-ignore no-explicit-any
type Raw = Record<string, any>

async function searchTmdb(kind: 'movie' | 'tv', query: string): Promise<SearchResult[]> {
  const key = need('TMDB_API_KEY')
  const data = await getJSON(
    `https://api.themoviedb.org/3/search/${kind}?api_key=${key}&query=${encodeURIComponent(query)}&include_adult=false`,
  )
  return ((data.results ?? []) as Raw[]).slice(0, 20).map((r) => ({
    source: 'tmdb',
    externalId: String(r.id),
    mediaType: kind === 'movie' ? 'film' : 'tv_show',
    title: kind === 'movie' ? r.title : r.name,
    year: yearOf(kind === 'movie' ? r.release_date : r.first_air_date),
    creator: null,
    coverUrl: r.poster_path ? TMDB_IMG + r.poster_path : null,
  }))
}

async function searchGames(query: string): Promise<SearchResult[]> {
  const key = need('RAWG_API_KEY')
  const data = await getJSON(
    `https://api.rawg.io/api/games?key=${key}&search=${encodeURIComponent(query)}&page_size=20`,
  )
  return ((data.results ?? []) as Raw[]).map((r) => ({
    source: 'rawg',
    externalId: String(r.id),
    mediaType: 'game',
    title: r.name,
    year: yearOf(r.released),
    creator: null,
    coverUrl: r.background_image ?? null,
  }))
}

async function searchBooks(query: string): Promise<SearchResult[]> {
  const data = await getJSON(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=20&fields=key,title,first_publish_year,author_name,cover_i`,
  )
  return ((data.docs ?? []) as Raw[]).map((d) => ({
    source: 'openlibrary',
    externalId: d.key,
    mediaType: 'book',
    title: d.title,
    year: d.first_publish_year ?? null,
    creator: d.author_name?.[0] ?? null,
    coverUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : null,
  }))
}

async function searchAlbums(query: string): Promise<SearchResult[]> {
  // MusicBrainz etiquette: identifying UA + ~1 req/s. The client debounces;
  // single-user traffic stays well under the limit.
  const lucene = `releasegroup:"${query.replaceAll('"', '')}" AND primarytype:album`
  const data = await getJSON(
    `https://musicbrainz.org/ws/2/release-group?query=${encodeURIComponent(lucene)}&fmt=json&limit=20`,
    { 'User-Agent': MB_UA },
  )
  return ((data['release-groups'] ?? []) as Raw[]).map((r) => ({
    source: 'musicbrainz',
    externalId: r.id,
    mediaType: 'album',
    title: r.title,
    year: yearOf(r['first-release-date']),
    creator: r['artist-credit']?.map((a: Raw) => a.name).join(' & ') ?? null,
    // Cover Art Archive may 404 for obscure releases — the client falls back.
    coverUrl: `https://coverartarchive.org/release-group/${r.id}/front-250`,
  }))
}

function search(type: string, query: string): Promise<SearchResult[]> {
  switch (type) {
    case 'film':
      return searchTmdb('movie', query)
    case 'tv_show':
      return searchTmdb('tv', query)
    case 'game':
      return searchGames(query)
    case 'book':
      return searchBooks(query)
    case 'album':
      return searchAlbums(query)
    default:
      throw new Error(`unknown search type ${type}`)
  }
}

async function tvSeasons(showId: string) {
  const key = need('TMDB_API_KEY')
  const data = await getJSON(`https://api.themoviedb.org/3/tv/${showId}?api_key=${key}`)
  return ((data.seasons ?? []) as Raw[]).map((s) => ({
    externalId: String(s.id),
    seasonNumber: s.season_number,
    title: s.name,
    year: yearOf(s.air_date),
    coverUrl: s.poster_path ? TMDB_IMG + s.poster_path : null,
  }))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const { action, type, query, showId } = await req.json()
    if (action === 'search' && typeof query === 'string' && query.trim())
      return json({ results: await search(type, query.trim()) })
    if (action === 'seasons' && showId)
      return json({ seasons: await tvSeasons(String(showId)) })
    return json({ error: 'bad request' }, 400)
  } catch (e) {
    return json({ error: String(e instanceof Error ? e.message : e) }, 500)
  }
})
