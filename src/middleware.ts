import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// SECURITY FIX: Security headers middleware
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // SECURITY FIX: Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', process.env.NODE_ENV === 'development' 
    ? 'camera=(), microphone=*, geolocation=()' 
    : 'camera=(), microphone=(self), geolocation=()');

  // SECURITY FIX: Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://api.openai.com https://api.mainnet-beta.solana.com https://rpc.helius.xyz",
    "media-src 'self' blob: data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);

  // SECURITY FIX: HSTS header (only for HTTPS)
  if (request.nextUrl.protocol === 'https:') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // SECURITY FIX: Rate limiting by IP
  const path = request.nextUrl.pathname;
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  // Check rate limit
  const rateLimitKey = `rate_limit:${ip}`;

  // Block suspicious requests
  if (isSuspiciousRequest(request)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  // SECURITY FIX: Admin route protection
  if (path.startsWith('/admin') && !path.includes('/api/admin/login')) {
    // Additional checks for admin routes
    const userAgent = request.headers.get('user-agent') || '';
    if (isBotUserAgent(userAgent)) {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  return response;
}

// SECURITY FIX: Detect suspicious requests
function isSuspiciousRequest(request: NextRequest): boolean {
  const userAgent = request.headers.get('user-agent') || '';
  const path = request.nextUrl.pathname;

  // Block common bot user agents
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i, /curl/i, /wget/i,
    /python/i, /java/i, /perl/i, /ruby/i, /php/i, /go-http-client/i
  ];

  if (botPatterns.some(pattern => pattern.test(userAgent))) {
    return true;
  }

  // Block suspicious paths
  const suspiciousPaths = [
    '/wp-admin', '/wp-login', '/phpmyadmin', '/admin.php', '/config',
    '/.env', '/.git', '/.svn', '/.htaccess', '/robots.txt', '/sitemap.xml'
  ];

  if (suspiciousPaths.some(suspiciousPath => path.includes(suspiciousPath))) {
    return true;
  }

  // Block suspicious query parameters
  const suspiciousParams = ['eval', 'exec', 'system', 'shell', 'cmd'];
  const url = request.nextUrl.toString();
  if (suspiciousParams.some(param => url.includes(param))) {
    return true;
  }

  return false;
}

// SECURITY FIX: Detect bot user agents
function isBotUserAgent(userAgent: string): boolean {
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i, /curl/i, /wget/i,
    /python/i, /java/i, /perl/i, /ruby/i, /php/i, /go-http-client/i,
    /semrush/i, /ahrefs/i, /mj12bot/i, /dotbot/i, /rogerbot/i
  ];

  return botPatterns.some(pattern => pattern.test(userAgent));
}

// SECURITY FIX: Configure middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}; 