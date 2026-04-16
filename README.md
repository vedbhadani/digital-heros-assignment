# Fair Chance Club

Fair Chance Club is a mobile-first full-stack assignment project built from the PRD in `PRD_Full_Stack_Training.pdf`. It combines:

- A charity-led public marketing site
- Subscriber authentication and dashboard flows
- Stableford score management with the latest-five rolling window
- Monthly draw simulation and publication
- Charity selection and contribution management
- Winner verification and payout tracking
- Admin tools for users, charities, scores, draws, and analytics

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- JSON-backed local data layer in `data/store.json`
- Supabase-ready relational schema in `supabase/schema.sql`

## Local run

1. Install dependencies:

```bash
npm install
```

2. Set a session secret:

```bash
cp .env.example .env.local
```

3. Start the app:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Verification

```bash
npm run build
npm run validate
```

## Demo credentials

- Subscriber: `sophie@fairchance.club` / `DemoPass123!`
- Subscriber with pending proof: `riley@fairchance.club` / `RileyPass123!`
- Admin: `admin@fairchance.club` / `AdminPass123!`

## What matches the PRD

- Public visitor flows: concept, charities, draw explanation, subscription CTA
- Registered subscriber flows: profile data, score entry and edit, charity selection, participation summary, winnings overview, proof upload
- Admin flows: user management, score editing, subscription control, draw simulation and publish, charity CRUD, winner verification and payout, analytics
- Subscription lifecycle states: active, inactive, cancelled, lapsed
- Score rules: 1-45 Stableford range, latest 5 retained, newest-first display, unique date enforcement
- Draw engine: random or algorithmic, monthly cadence, simulation before publish, 3/4/5 tier logic, jackpot rollover
- Charity experience: directory, profiles, search-friendly structure, featured and spotlight content
- Technical requirements: responsive layout, session auth, email-style notification queue, clean code structure, deployment notes

## Assumptions resolved from PRD ambiguity

- Currency is modeled in USD for the local assignment environment.
- The yearly subscription contributes to the monthly prize pool on an amortized monthly-equivalent basis.
- A fixed 35% of active subscription value feeds the prize pool.
- Charity contribution is calculated from the same monthly-equivalent subscription value.
- Email notifications are represented as a platform notification queue in local mode; the schema is ready to back an external provider in deployment.
- Local runtime persistence uses JSON so the full assignment works without external credentials, while `supabase/schema.sql` provides a deployment-ready relational model.

## Important files

- `app/` for pages, route handlers, and global styling
- `components/` for the public site, auth, subscriber dashboard, and admin dashboard shells
- `lib/` for auth, sessions, business rules, display helpers, and data access
- `data/store.json` for seeded local data and demo accounts
- `supabase/schema.sql` for the production database model
- `scripts/validate-business-rules.mjs` for seed and rule verification
