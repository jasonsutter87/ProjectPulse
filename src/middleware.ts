import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse, NextRequest } from 'next/server';

// Routes that require authentication (when auth is enabled)
const isProtectedRoute = createRouteMatcher([
  '/',
  '/projects(.*)',
  '/api/(.*)',
]);

// Routes that should be publicly accessible even with auth enabled
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

// Check if auth should be skipped
const shouldSkipAuth = () => {
  return process.env.DISABLE_AUTH === 'true' || !process.env.CLERK_SECRET_KEY;
};

// Wrapper middleware that conditionally uses Clerk
async function middleware(req: NextRequest) {
  // If auth is disabled or Clerk not configured, skip authentication
  if (shouldSkipAuth()) {
    return NextResponse.next();
  }

  // Use Clerk middleware for authentication
  return clerkMiddleware(async (auth, request) => {
    // Protect routes that require authentication
    if (isProtectedRoute(request) && !isPublicRoute(request)) {
      await auth.protect();
    }
  })(req, {} as never);
}

export default middleware;

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
