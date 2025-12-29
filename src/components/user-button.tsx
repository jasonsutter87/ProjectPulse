'use client';

import { UserButton as ClerkUserButton } from '@clerk/nextjs';

// Check if auth is disabled OR if Clerk keys are not configured
const isAuthDisabled = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';
const hasClerkKeys = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export function UserButton() {
  // Don't render anything if auth is disabled or Clerk not configured
  if (isAuthDisabled || !hasClerkKeys) {
    return null;
  }

  return (
    <ClerkUserButton
      afterSignOutUrl="/"
      appearance={{
        elements: {
          avatarBox: 'w-8 h-8',
        },
      }}
    />
  );
}
