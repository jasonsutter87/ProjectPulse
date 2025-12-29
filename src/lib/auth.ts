import { auth } from '@clerk/nextjs/server';

// Check if auth is disabled (single-user mode) or Clerk not configured
export function isAuthDisabled(): boolean {
  return process.env.DISABLE_AUTH === 'true' || !process.env.CLERK_SECRET_KEY;
}

// Get the current user ID from Clerk, or null if auth is disabled
export async function getUserId(): Promise<string | null> {
  if (isAuthDisabled()) {
    return null;
  }

  try {
    const { userId } = await auth();
    return userId;
  } catch {
    // Clerk not configured or error - fall back to single-user mode
    return null;
  }
}

// Require authentication - returns userId or throws
export async function requireAuth(): Promise<string> {
  if (isAuthDisabled()) {
    throw new Error('Auth is disabled but requireAuth was called');
  }

  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error('Unauthorized');
    }
    return userId;
  } catch {
    throw new Error('Unauthorized');
  }
}
