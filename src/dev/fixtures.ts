// Deterministic seed data for mock mode — one item per media type plus a
// TV show/season pair, with a small diary. Covers stay null so mock mode makes
// zero network requests (CoverImage renders the type-icon fallback).
import { FAKE_UID } from './env'

type Row = Record<string, unknown>
export type MockDb = Record<string, Row[]>

const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10)
const nowISO = () => new Date().toISOString()

export function makeInitialDb(): MockDb {
  const media_items: Row[] = [
    {
      id: 'item-film-1',
      media_type: 'film',
      parent_id: null,
      external_source: 'tmdb',
      external_id: '335984',
      title: 'Blade Runner 2049',
      year: 2017,
      creator: null,
      cover_url: null,
      metadata: {},
      created_at: nowISO(),
    },
    {
      id: 'item-show-1',
      media_type: 'tv_show',
      parent_id: null,
      external_source: 'tmdb',
      external_id: '95396',
      title: 'Severance',
      year: 2022,
      creator: null,
      cover_url: null,
      metadata: {},
      created_at: nowISO(),
    },
    {
      id: 'item-season-1',
      media_type: 'tv_season',
      parent_id: 'item-show-1',
      external_source: 'tmdb',
      external_id: '134772',
      title: 'Severance — Season 1',
      year: 2022,
      creator: null,
      cover_url: null,
      metadata: { season_number: 1, show_external_id: '95396' },
      created_at: nowISO(),
    },
    {
      id: 'item-game-1',
      media_type: 'game',
      parent_id: null,
      external_source: 'rawg',
      external_id: '274755',
      title: 'Hades',
      year: 2020,
      creator: null,
      cover_url: null,
      metadata: {},
      created_at: nowISO(),
    },
    {
      id: 'item-book-1',
      media_type: 'book',
      parent_id: null,
      external_source: 'openlibrary',
      external_id: '/works/OL20876292W',
      title: 'Project Hail Mary',
      year: 2021,
      creator: 'Andy Weir',
      cover_url: null,
      metadata: {},
      created_at: nowISO(),
    },
    {
      id: 'item-album-1',
      media_type: 'album',
      parent_id: null,
      external_source: 'musicbrainz',
      external_id: '32c95b47-1f60-3ea6-82f2-1d29c4a175f1',
      title: 'In Rainbows',
      year: 2007,
      creator: 'Radiohead',
      cover_url: null,
      metadata: {},
      created_at: nowISO(),
    },
  ]

  const log_entries: Row[] = [
    {
      id: 'entry-1',
      item_id: 'item-game-1',
      user_id: FAKE_UID,
      logged_at: daysAgo(2),
      rating: null,
      review: null,
      status: 'in_progress',
      created_at: nowISO(),
    },
    {
      id: 'entry-2',
      item_id: 'item-film-1',
      user_id: FAKE_UID,
      logged_at: daysAgo(5),
      rating: 4.5,
      review: 'Somehow a worthy sequel. Deakins earned that Oscar.',
      status: 'done',
      created_at: nowISO(),
    },
    {
      id: 'entry-3',
      item_id: 'item-season-1',
      user_id: FAKE_UID,
      logged_at: daysAgo(12),
      rating: 5,
      review: null,
      status: 'done',
      created_at: nowISO(),
    },
    {
      id: 'entry-4',
      item_id: 'item-book-1',
      user_id: FAKE_UID,
      logged_at: daysAgo(30),
      rating: 4.5,
      review: 'Rocky is the best character in years.',
      status: 'done',
      created_at: nowISO(),
    },
    {
      id: 'entry-5',
      item_id: 'item-album-1',
      user_id: FAKE_UID,
      logged_at: daysAgo(45),
      rating: 5,
      review: null,
      status: 'done',
      created_at: nowISO(),
    },
  ]

  return { media_items, log_entries }
}
