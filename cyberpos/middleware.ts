import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // Public routes - allow access without login
  const publicRoutes = ['/', '/login', '/register']
  if (publicRoutes.includes(path)) {
    // If user is logged in and tries to access public routes, redirect to dashboard
    if (user && (path === '/login' || path === '/register')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      const role = profile?.role
      
      if (role === 'CUSTOMER') {
        return NextResponse.redirect(new URL('/customer/dashboard', request.url))
      } else if (role === 'CASHIER') {
        return NextResponse.redirect(new URL('/cashier/dashboard', request.url))
      } else if (role === 'OWNER' || role === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      }
      // If no valid role, stay on login/register page
    }
    return response
  }

  // Protected routes - require auth
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const role = profile?.role

  // Customer routes - CUSTOMER only
  if (path.startsWith('/customer')) {
    if (role !== 'CUSTOMER') {
      return NextResponse.redirect(new URL(role === 'CASHIER' ? '/cashier/dashboard' : '/admin/dashboard', request.url))
    }
    return response
  }

  // Cashier routes - CASHIER only
  if (path.startsWith('/cashier')) {
    if (role !== 'CASHIER') {
      if (role === 'CUSTOMER') {
        return NextResponse.redirect(new URL('/customer/dashboard', request.url))
      }
      if (role === 'OWNER' || role === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      }
    }
    return response
  }

  // Admin routes - OWNER and ADMIN only
  if (path.startsWith('/admin')) {
    if (role !== 'OWNER' && role !== 'ADMIN') {
      if (role === 'CUSTOMER') {
        return NextResponse.redirect(new URL('/customer/dashboard', request.url))
      }
      if (role === 'CASHIER') {
        return NextResponse.redirect(new URL('/cashier/dashboard', request.url))
      }
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return response
  }

  // Legacy staff routes - redirect to appropriate area
  if (path.startsWith('/staff')) {
    if (role === 'CUSTOMER') {
      return NextResponse.redirect(new URL('/customer/dashboard', request.url))
    }
    if (role === 'CASHIER') {
      return NextResponse.redirect(new URL('/cashier/dashboard', request.url))
    }
    if (role === 'OWNER' || role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
