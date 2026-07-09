import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null
  try {
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser()
    user = supabaseUser
  } catch (err) {
    console.error('Supabase auth check failed in middleware (network/offline error):', err)
  }

  const path = request.nextUrl.pathname

  // 1. Allow access to auth callback and static assets
  if (path.startsWith('/auth') || path.startsWith('/_next') || path === '/favicon.ico') {
    return supabaseResponse
  }

  // 2. Redirect to /unauthorized if logged in but email is not authorized
  if (user && user.email !== 'tanmayraj1705@gmail.com') {
    if (path !== '/unauthorized') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
    return supabaseResponse
  }

  // 3. Prevent loop on /unauthorized
  if (path === '/unauthorized') {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (user && user.email === 'tanmayraj1705@gmail.com') {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return supabaseResponse
  }

  // 4. Redirect to /login if not authenticated
  if (!user && path !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 5. Redirect to / (dashboard) if authenticated and trying to access /login
  if (user && path === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images, icons, or static extensions (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
