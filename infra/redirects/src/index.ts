const APP = 'https://almanac.sirlexicon.com'

const PATHS: Record<string, string> = {
  movies: '/movies',
  shows: '/shows',
  games: '/games',
  books: '/books',
  music: '/music',
}

export default {
  fetch(request: Request): Response {
    const url = new URL(request.url)
    const [subdomain] = url.hostname.split('.')
    const path = PATHS[subdomain] ?? '/'
    return Response.redirect(`${APP}${path}${url.search}`, 301)
  },
}
