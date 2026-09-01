/* `err instanceof Error` is false for everything supabase-js rejects with.
   PostgrestError, AuthError and the rest are plain objects carrying a
   `message`, so the usual `err instanceof Error ? err.message : fallback`
   throws away the only text that explains what went wrong and shows the
   generic fallback instead.

   That is how a checkout refused with "Coupon FIRST50 is valid on your first
   order only" reached the customer as "Could not place order. Please try
   again." -- a message that invites the retry that cannot possibly work. */
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim() !== '') return err.message;

  if (typeof err === 'object' && err !== null && 'message' in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim() !== '') return message;
  }

  return fallback;
}
