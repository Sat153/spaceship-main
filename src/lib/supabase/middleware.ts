import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const { pathname } = request.nextUrl

  // Routes that should bypass all auth checks (still in process of authenticating)
  const bypassAuthRoutes = ['/auth/callback', '/auth/set-password', '/auth/auth-code-error']

  // If this is a bypass route, just pass through without checking auth
  if (bypassAuthRoutes.some(route => pathname.startsWith(route))) {
    return supabaseResponse
  }

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

  // Read session from cookie — no network call, fast on every request
  let user = null
  try {
    const { data } = await supabase.auth.getSession()
    user = data.session?.user ?? null
  } catch {
    user = null
  }

  // Route definitions
  const publicRoutes = ['/auth/login', '/auth/signup', '/auth/confirm-email', '/auth/forgot-password', '/auth/reset-password', '/']
  const authRoutes = ['/auth/login', '/auth/signup']
  const protectedRoutes = ['/dashboard', '/admin', '/client']

  const isPublicRoute = publicRoutes.includes(pathname)
  const isAuthRoute = authRoutes.includes(pathname)
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isAdminRoute = pathname.startsWith('/admin')
  const isClientRoute = pathname.startsWith('/client')

  // Redirect unauthenticated users to login
  if (!user && isProtectedRoute && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // Handle authenticated users
  if (user) {
    const role = user.user_metadata?.role
    const isAdmin = role === 'admin'
    const isClientRole = role === 'client'

    // Redirect authenticated users away from auth pages
    if (isAuthRoute) {
      const url = request.nextUrl.clone()
      url.pathname = isAdmin ? '/admin' : isClientRole ? '/client' : '/dashboard'
      return NextResponse.redirect(url)
    }

    // Client-role users can only access /client
    if (isClientRole && !isClientRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/client'
      return NextResponse.redirect(url)
    }

    // Non-client users cannot access /client
    if (isClientRoute && !isClientRole) {
      const url = request.nextUrl.clone()
      url.pathname = isAdmin ? '/admin' : '/dashboard'
      return NextResponse.redirect(url)
    }

    // Redirect regular users accessing dashboard to admin if they're admin
    if (pathname === '/dashboard' && isAdmin) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }

    // Protect admin routes
    if (isAdminRoute && !isAdmin) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}