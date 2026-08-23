# Grocewell — Agentic Coding Instructions

Grocewell is a grocery delivery Android app, built with React Native.
UI/UX inspiration: Swiggy Instamart and Blinkit (fast grocery delivery apps) —
category grids, quick-add cards, sticky cart bar, fast checkout flow.

## Current Phase: FRONTEND ONLY

- No backend, no real API calls, no database in this phase.
- Use static/mock data (local JSON or constants files) to simulate products,
  categories, cart, and orders.
- Screens should be built so a backend can be wired in later without major
  rewrites (e.g. data fetching isolated in simple service/hook files, not
  scattered inline), but DO NOT build actual backend infrastructure,
  auth, or persistence now.
- No payment gateway integration — checkout screen is UI-only (mock "Place Order").

## How work must proceed (step-by-step, confirm-each-step)

1. Work is broken into small, single-purpose steps (e.g. "scaffold project",
   "build Home screen UI", "build Product listing screen", "build Cart screen").
2. After completing each step, STOP and present what was done (briefly,
   plus how to view/test it). Wait for explicit user confirmation before
   starting the next step.
3. Do not bundle multiple unrelated screens/features into one step.
4. If a step reveals the plan should change, flag it and ask before deviating.

## Code style & scope rules

- Keep code simple. No premature abstractions, no extra libraries unless
  needed for the current step.
- No backend/auth/state-persistence libraries (Redux/Zustand are OK only
  if state genuinely gets too complex for props/Context — ask before adding).
- Functional components + hooks only. No class components.
- Use React Navigation for screen navigation (standard for RN apps).
- Use a simple, consistent design system: shared color palette, spacing,
  and reusable basic components (Button, Card, Badge) — kept minimal.
- Visual theme: light, airy, fresh-grocery feel. Light backgrounds (white/
  off-white/soft cream), with green as the primary accent (fresh produce)
  and warm secondary accents (orange/yellow, like ripe fruit) used sparingly
  for CTAs/badges/discounts. Avoid dark or heavy colors. Generous white
  space, rounded cards, soft shadows — not cluttered.
- Imagery: product cards should read clearly as fruits/vegetables/grocery
  items (use placeholder images/emoji representative of real produce in
  this mock-data phase, not generic icons).
- Responsive layout: UI must adapt cleanly across different Android screen
  sizes (phones small/large, tablets) — use flexbox, percentage/flex-based
  sizing and `Dimensions`/`useWindowDimensions` instead of hardcoded pixel
  widths, and test grid columns adapt to screen width.
- Mock data lives in a clearly separated folder (e.g. `src/data/`) so it's
  obvious what to replace when backend integration begins.
- No comments explaining what code does; only comment non-obvious "why".

## Definition of done for a step

- Screen/component renders correctly on Android (or Expo Go / emulator).
- No console errors/warnings introduced.
- Visually consistent with the grocery-app reference style (clean, card-based,
  bright accent color, large tappable areas, minimal text).
