/* Items the bakery cannot make on the spot.
 *
 * The 56 Bhog Thaali is 56 separate preparations — the shop needs a day's
 * notice. Nothing in the app previously stopped a customer choosing immediate
 * delivery for it, which the bakery simply could not fulfil.
 *
 * Keyed by product id rather than stored on the row because the catalog comes
 * from Supabase and has no lead-time column. Worth moving to the database
 * (and the inventory form) once the owner wants to set this himself.
 */

export const LEAD_TIME_DAYS: Record<string, number> = {
  'lb-thaali-56': 1,
};

/** Longest notice any item in the cart needs. 0 means same-day is fine. */
export function leadTimeForCart(productIds: string[]): number {
  return productIds.reduce((max, id) => Math.max(max, LEAD_TIME_DAYS[id] ?? 0), 0);
}

export function leadTimeForProduct(productId: string): number {
  return LEAD_TIME_DAYS[productId] ?? 0;
}

export function leadTimeLabel(days: number): string {
  if (days <= 0) return '';
  if (days === 1) return 'Order a day in advance';
  return `Order ${days} days in advance`;
}

/** Midnight on the first date the bakery can deliver this. */
export function earliestDate(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function dayLabel(days: number): string {
  if (days <= 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return earliestDate(days).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
