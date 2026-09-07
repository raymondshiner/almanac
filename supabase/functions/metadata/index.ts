// Edge function: metadata — proxies the four external media APIs so keys stay
// server-side (one place for CORS + rate-limit etiquette). Invoked with:
//   { action: 'search', type: 'film'|'tv_show'|'game'|'book'|'album', query }
//   { action: 'seasons', showId }   // TMDB TV seasons for a show
//   { action: 'details', type, externalId, showExternalId?, seasonNumber? }
// Secrets: TMDB_API_KEY, RAWG_API_KEY. OMDB_API_KEY optional — without it
// film/TV details still work, just no IMDb/Rotten Tomatoes ratings.
// OpenLibrary + MusicBrainz need none.

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

type ItemDetails = {
  description: string | null
  ratings: { source: string; value: string }[]
  backdropUrl: string | null
  coverUrl: string | null // only set when meaningfully better than the search-time cover
  genres: string[]
  fetchedAt: string
}

const TMDB_BACKDROP = 'https://image.tmdb.org/t/p/w1280'

// OMDb is the only free door to IMDb + Rotten Tomatoes numbers. Best-effort:
// missing key, missing imdb id, or an OMDb hiccup all degrade to no ratings.
async function omdbRatings(imdbId: string | null | undefined) {
  const key = Deno.env.get('OMDB_API_KEY')
  if (!key || !imdbId) return []
  try {
    const d = await getJSON(`https://www.omdbapi.com/?i=${imdbId}&apikey=${key}`)
    return ((d.Ratings ?? []) as Raw[]).map((r) => ({
      source: r.Source === 'Internet Movie Database' ? 'IMDb' : String(r.Source),
      value: String(r.Value),
    }))
  } catch {
    return []
  }
}

async function tmdbDetails(kind: 'movie' | 'tv', id: string): Promise<ItemDetails> {
  const key = need('TMDB_API_KEY')
  const d = await getJSON(
    `https://api.themoviedb.org/3/${kind}/${id}?api_key=${key}&append_to_response=external_ids`,
  )
  const imdbId = kind === 'movie' ? (d.imdb_id ?? d.external_ids?.imdb_id) : d.external_ids?.imdb_id
  return {
    description: d.overview || null,
    ratings: await omdbRatings(imdbId),
    backdropUrl: d.backdrop_path ? TMDB_BACKDROP + d.backdrop_path : null,
    coverUrl: null,
    genres: ((d.genres ?? []) as Raw[]).map((g) => String(g.name)),
    fetchedAt: new Date().toISOString(),
  }
}

async function seasonDetails(showId: string, seasonNumber: number): Promise<ItemDetails> {
  const key = need('TMDB_API_KEY')
  const d = await getJSON(
    `https://api.themoviedb.org/3/tv/${showId}/season/${seasonNumber}?api_key=${key}`,
  )
  return {
    description: d.overview || null,
    ratings: [],
    backdropUrl: null,
    coverUrl: null,
    genres: [],
    fetchedAt: new Date().toISOString(),
  }
}

async function gameDetails(id: string): Promise<ItemDetails> {
  const key = need('RAWG_API_KEY')
  const d = await getJSON(`https://api.rawg.io/api/games/${id}?key=${key}`)
  const ratings: ItemDetails['ratings'] = []
  if (d.metacritic) ratings.push({ source: 'Metacritic', value: `${d.metacritic}/100` })
  if (d.rating && d.ratings_count > 0) ratings.push({ source: 'RAWG', value: `${d.rating}/5` })
  return {
    description: d.description_raw?.trim() || null,
    ratings,
    backdropUrl: d.background_image_additional ?? null,
    coverUrl: null,
    genres: ((d.genres ?? []) as Raw[]).map((g) => String(g.name)),
    fetchedAt: new Date().toISOString(),
  }
}

async function bookDetails(workKey: string): Promise<ItemDetails> {
  const d = await getJSON(`https://openlibrary.org${workKey}.json`)
  const ratings: ItemDetails['ratings'] = []
  try {
    const r = await getJSON(`https://openlibrary.org${workKey}/ratings.json`)
    if (r.summary?.average)
      ratings.push({ source: 'Open Library', value: `${r.summary.average.toFixed(1)}/5` })
  } catch {
    // ratings endpoint is flaky for obscure works — fine without
  }
  return {
    description:
      (typeof d.description === 'string' ? d.description : d.description?.value) || null,
    ratings,
    backdropUrl: null,
    coverUrl: d.covers?.[0] ? `https://covers.openlibrary.org/b/id/${d.covers[0]}-L.jpg` : null,
    genres: ((d.subjects ?? []) as string[]).slice(0, 4),
    fetchedAt: new Date().toISOString(),
  }
}

async function albumDetails(rgid: string): Promise<ItemDetails> {
  // MusicBrainz has no prose; chase the Wikidata relation to a Wikipedia
  // summary. Any hop failing just means no description.
  const rg = await getJSON(
    `https://musicbrainz.org/ws/2/release-group/${rgid}?inc=url-rels+ratings+genres&fmt=json`,
    { 'User-Agent': MB_UA },
  )
  let description: string | null = null
  try {
    const wikidata = ((rg.relations ?? []) as Raw[]).find((r) => r.type === 'wikidata')
    const qid = wikidata?.url?.resource?.split('/').pop()
    if (qid) {
      const entity = await getJSON(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`)
      const title = entity.entities?.[qid]?.sitelinks?.enwiki?.title
      if (title) {
        const sum = await getJSON(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
        )
        description = sum.extract || null
      }
    }
  } catch {
    // no Wikipedia article — description stays null
  }
  const ratings: ItemDetails['ratings'] = []
  if (rg.rating?.value && rg.rating['votes-count'] > 0)
    ratings.push({ source: 'MusicBrainz', value: `${rg.rating.value}/5` })
  return {
    description,
    ratings,
    backdropUrl: null,
    coverUrl: `https://coverartarchive.org/release-group/${rgid}/front-500`,
    genres: ((rg.genres ?? []) as Raw[])
      .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
      .slice(0, 4)
      .map((g) => String(g.name)),
    fetchedAt: new Date().toISOString(),
  }
}

function details(
  type: string,
  externalId: string,
  showExternalId?: string,
  seasonNumber?: number,
): Promise<ItemDetails> {
  switch (type) {
    case 'film':
      return tmdbDetails('movie', externalId)
    case 'tv_show':
      return tmdbDetails('tv', externalId)
    case 'tv_season':
      if (!showExternalId || seasonNumber == null)
        throw new Error('tv_season details need showExternalId + seasonNumber')
      return seasonDetails(showExternalId, seasonNumber)
    case 'game':
      return gameDetails(externalId)
    case 'book':
      return bookDetails(externalId)
    case 'album':
      return albumDetails(externalId)
    default:
      throw new Error(`unknown details type ${type}`)
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
    const { action, type, query, showId, externalId, showExternalId, seasonNumber } =
      await req.json()
    if (action === 'search' && typeof query === 'string' && query.trim())
      return json({ results: await search(type, query.trim()) })
    if (action === 'seasons' && showId)
      return json({ seasons: await tvSeasons(String(showId)) })
    if (action === 'details' && externalId)
      return json({
        details: await details(
          type,
          String(externalId),
          showExternalId ? String(showExternalId) : undefined,
          seasonNumber != null ? Number(seasonNumber) : undefined,
        ),
      })
    return json({ error: 'bad request' }, 400)
  } catch (e) {
    return json({ error: String(e instanceof Error ? e.message : e) }, 500)
  }
})
