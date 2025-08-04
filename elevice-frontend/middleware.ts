import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Define valid routes - add new routes here as they're created
  const validRoutes = [
    '/',
    '/interview-setup',
    '/interview-history', 
    '/jobs',
    '/interview-session', // This covers /interview-session/[id] as well
  ]

  // Check if the pathname starts with any valid route
  const isValidRoute = validRoutes.some(route => {
    if (route === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(route)
  })

  // Check for static assets (images, favicon, etc.)
  const isStaticAsset = pathname.startsWith('/_next') || 
                       pathname.startsWith('/api') || 
                       pathname.includes('.') ||
                       pathname.startsWith('/favicon')

  // If it's not a valid route and not a static asset, redirect to home
  if (!isValidRoute && !isStaticAsset) {
    console.log(`🔄 Redirecting invalid route "${pathname}" to home page`)
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Continue with the request
  return NextResponse.next()
}

export const config = {
  // Match all paths except static assets and API routes
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
