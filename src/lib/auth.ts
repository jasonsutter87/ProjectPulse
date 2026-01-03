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

// ===========================================
// ORCHESTRATOR API KEY SECURITY
// ===========================================
// These endpoints are accessed by Claude agents and need extra protection

const ORCHESTRATOR_API_KEY = process.env.ORCHESTRATOR_API_KEY;

/**
 * Validate orchestrator API key from request headers
 * Requires: Authorization: Bearer <ORCHESTRATOR_API_KEY>
 */
export function validateOrchestratorApiKey(authHeader: string | null): boolean {
  if (!ORCHESTRATOR_API_KEY) {
    // If no key configured, orchestrator endpoints are disabled
    console.warn('ORCHESTRATOR_API_KEY not configured - orchestrator endpoints disabled');
    return false;
  }

  if (!authHeader) {
    return false;
  }

  const [type, key] = authHeader.split(' ');
  if (type !== 'Bearer' || !key) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  if (key.length !== ORCHESTRATOR_API_KEY.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < key.length; i++) {
    result |= key.charCodeAt(i) ^ ORCHESTRATOR_API_KEY.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Check if orchestrator is configured and available
 */
export function isOrchestratorConfigured(): boolean {
  return !!ORCHESTRATOR_API_KEY;
}
