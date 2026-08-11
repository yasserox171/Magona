# Magona — Ground Transportation Booking Platform

Magona is a full-stack, production-oriented platform for booking airport transfers, private
chauffeurs, taxis and corporate ground transportation — comparable to Talixo/Blacklane. It covers
the customer booking flow, driver and fleet-partner operations, corporate accounts, and an admin
back office, on top of a real-time tracking and notifications layer.

## Monorepo layout

```
apps/
  web/        Next.js 14 (App Router) customer site + driver/fleet/corporate/admin portals
  api/        NestJS 10 REST + WebSocket API, Prisma ORM, PostgreSQL
  mobile/     Expo/React Native demo app (core customer booking flow) — see apps/mobile/README.md
packages/
  shared/     Shared TypeScript types, enums, and pricing constants used by both web and api
docker-compose.yml   Local Postgres + Mailhog (SMTP test inbox) for development
```

Package management for `apps/web`, `apps/api` and `packages/shared` is via **pnpm workspaces**
(`pnpm-workspace.yaml`). `apps/mobile` is a standalone Expo project managed with npm — see
`apps/mobile/README.md` for why, and for how to build it into an installable Android APK (that
build step needs a machine with normal internet access; it can't be produced from this repo alone).

## Feature coverage

- Customer registration/login (email+password and Google OAuth), JWT access + refresh tokens
- Search & quote by pickup/destination, date/time, ride type (point-to-point, airport pickup/
  dropoff with flight number, hourly charter)
- Real-time fare calculation engine (base fare + distance + duration + night surcharge + promo
  codes + corporate discounts), configurable per vehicle category and city from the admin dashboard
- Vehicle categories: Economy, Business, Premium, Van
- Booking lifecycle: pending → confirmed → driver assigned → en route → arrived → in progress →
  completed/cancelled/no-show, with a full status-event audit trail
- Booking modification and cancellation with a configurable free-cancellation window and fee
- Driver/vehicle assignment, fleet & driver availability management
- Live ride tracking over WebSockets (driver GPS pings + booking status broadcast to the rider)
- Email notifications for every booking milestone (dev-mode console/DB logging when SMTP isn't
  configured; drop-in for a real SMTP provider or SES)
- Stripe payments (PaymentIntents + webhook confirmation), invoice-based and corporate-account
  payment methods, refunds on cancellation
- Driver payouts with configurable per-fleet platform commission
- Driver / fleet-partner dashboard: assigned rides, ride status actions, earnings, vehicle &
  driver management, fleet performance
- Admin dashboard: bookings, customers, drivers, fleets (approval workflow), pricing rules,
  commissions, corporate accounts
- Corporate accounts: employee management, per-account discount, monthly auto-generated invoices
  (scheduled job)
- Ratings & reviews (rider → driver, feeds the driver's average rating)
- Multi-language UI (English, German, French, Spanish, Arabic incl. RTL) via next-intl
- Multi-currency display (EUR, USD, GBP, AED)
- GDPR-oriented data handling: explicit consent capture at signup, self-service data-deletion
  request, security headers (Helmet), rate limiting

## Architecture

- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS, Zustand for client state
  (auth session, booking draft, currency), SWR for data fetching, `next-intl` for i18n,
  Stripe Elements for card payment, `socket.io-client` for live tracking.
- **Backend**: NestJS 10, modular by domain (`auth`, `users`, `vehicles`, `drivers`, `fleets`,
  `pricing`, `bookings`, `payments`, `invoices`, `notifications`, `reviews`, `corporate`,
  `tracking`, `admin`). Guarded by JWT + role-based `RolesGuard`; a global rate limiter
  (`@nestjs/throttler`) and Helmet are applied to every request.
- **Database**: PostgreSQL via Prisma ORM — see `apps/api/prisma/schema.prisma` for the full data
  model (users, drivers, fleets, vehicles, bookings, payments, invoices, reviews, corporate
  accounts, pricing rules, promo codes, notifications).
- **Maps/geocoding**: pluggable — Mapbox or Google Maps if an API key is configured
  (`MAPS_PROVIDER`, `MAPBOX_ACCESS_TOKEN` / `GOOGLE_MAPS_API_KEY`); falls back to a haversine
  distance/ETA estimate so the booking flow works out of the box without external credentials.
  The location search box uses the same provider when configured, and a small curated list of
  major airports/cities otherwise (`apps/web/src/lib/places.ts`).
- **Payments**: Stripe PaymentIntents; a mock PaymentIntent + dev-confirm endpoint is used when
  `STRIPE_SECRET_KEY` isn't set, so checkout completes end-to-end locally without a Stripe account.
- **Real-time**: a Socket.IO `/tracking` namespace on the API; the API also emits domain events
  internally (`@nestjs/event-emitter`) so the tracking gateway, and any future consumer, can react
  to booking-status and driver-location changes without tight coupling.
- **Scheduled jobs**: `@nestjs/schedule` generates monthly corporate invoices on the 1st of each
  month from completed bookings in the prior period.

## Getting started

### Prerequisites

- Node.js 20+
- pnpm 9+ (`corepack enable` or `npm i -g pnpm`)
- Docker (for local Postgres + Mailhog), or your own PostgreSQL 14+ instance

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start local infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL on `localhost:5432` (db/user/pass: `magona`/`magona`/`magona`) and Mailhog
(SMTP on `1025`, web UI at `http://localhost:8025`) so outgoing emails are visible without a real
mail provider.

### 3. Configure environment variables

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

The defaults work against the Docker Compose services above with no further changes. To enable
real integrations, set:

- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` (API) and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  (web) for real card payments
- `MAPBOX_ACCESS_TOKEN` or `GOOGLE_MAPS_API_KEY` (API) and the matching `NEXT_PUBLIC_*` variable
  (web) for live geocoding/routing and address autocomplete
- `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` for "Continue with Google"
- `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS` to send real email (defaults to Mailhog locally)

### 4. Set up the database

```bash
cd apps/api
pnpm prisma:migrate    # creates the initial migration and applies it
pnpm prisma:seed       # seeds demo accounts, a demo fleet/vehicles, and default pricing rules
```

Demo accounts seeded (password for all: `Password123!`):

| Role | Email |
| --- | --- |
| Admin | admin@magona.com |
| Customer | customer@magona.com |
| Fleet admin | fleet@magona.com |
| Driver | driver@magona.com |
| Corporate admin | corporate@magona.com |

### 5. Run the apps

```bash
# from the repo root
pnpm dev:api   # http://localhost:4000  (Swagger docs at /api/docs)
pnpm dev:web   # http://localhost:3000
```

Or `pnpm dev` to run both concurrently.

### Tests

```bash
cd apps/api
pnpm test        # unit tests (pricing engine, etc.)
pnpm test:e2e     # end-to-end (requires the database from step 4)
```

## Notable design decisions & production-hardening notes

- **Pricing** lives in `apps/api/src/pricing` with DB-backed `PricingRule`s (editable from the
  admin dashboard) and a shared fallback table in `packages/shared/src/pricing.ts` so the same
  defaults are visible to the frontend before a quote is fetched.
- **Quotes are short-lived and persisted** (`Quote` table, 15-minute TTL) rather than trusted from
  the client, so a booking is always created from a price the server already computed.
- **Refresh tokens are hashed at rest** (SHA-256) and rotated on every refresh.
- **Money is stored in minor units (cents)** throughout to avoid floating-point rounding issues.
- This build focuses on a correct, coherent end-to-end architecture over exhaustive polish in
  every corner. Before a real production launch you'd want to add: object storage for
  driver/vehicle documents and photos, a real push-notification provider (FCM/APNs — the
  `NotificationsService` has a clear extension point), a proper background job queue instead of
  in-process `@nestjs/schedule` for invoicing at scale, structured logging/observability
  (e.g. OpenTelemetry), CI with automated migrations, and a CDN/edge deployment (the stack is
  ready for Vercel for `apps/web` and AWS ECS/Fargate or Render/Fly.io for `apps/api` + RDS
  Postgres).

## Deployment sketch

- **`apps/web`** → Vercel (or any Next.js-compatible host). Set the `NEXT_PUBLIC_*` env vars in
  the hosting provider's dashboard.
- **`apps/api`** → any Node host (AWS ECS/Fargate, Render, Fly.io, Railway). Run
  `pnpm --filter api build && pnpm --filter api prisma:deploy` then `pnpm --filter api start`.
  Point `DATABASE_URL` at a managed PostgreSQL instance (RDS/Aurora/Cloud SQL/Neon).
- Put the API behind HTTPS with your platform's load balancer/ingress; `WEB_URL` controls CORS and
  the OAuth/redirect origin.
