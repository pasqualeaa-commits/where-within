# WhereWithin

Travel destination recommender: given a budget and date range, suggests the best destinations factoring in estimated flight costs, hotel prices, climate, and local events.

## Project philosophy
- No paid APIs until the project scales — everything must work for free
- No AI/LLM integration in the app itself (cost control)
- Self-hosted via Docker on a Linux server
- Step-by-step development: understand before building

## Stack
- **Framework**: Next.js 15 (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (Docker container)
- **Proxy**: Nginx (Docker container, SSL via Let's Encrypt)

## Free data sources
| Data | Source | Auth needed |
|------|--------|-------------|
| Climate | Open-Meteo API | No |
| City scores / cost of living | Teleport API | No |
| Airports + routes | OpenFlights dataset (static CSV) | No |
| Flights (dev/test) | Amadeus sandbox | Free account |
| Events | Wikipedia API + Eventbrite free tier | No / free |

## Flight pricing model
Prices are **estimated** (not real-time) using:
```
estimated_price = base_route_price × season_multiplier × advance_multiplier
```
Advance multipliers: 90d+ → 0.60, 60-90d → 0.75, 30-60d → 0.90, 15-30d → 1.20, <15d → 1.50

## Project structure
```
src/
  app/
    page.tsx              # Landing: budget + date form
    results/page.tsx      # Destination results list
    api/
      destinations/       # Query DB + Teleport scoring
      climate/            # Open-Meteo integration
      flights/            # Pricing model + Amadeus sandbox
      events/             # Wikipedia + Eventbrite
  components/             # Shared UI components
  lib/                    # Utilities, API clients, pricing logic
  types/                  # TypeScript interfaces
scripts/
  seed-destinations.ts    # Populate DB from Teleport + OpenFlights
```

## Development steps (in order)
1. [x] Project scaffold + CLAUDE.md
2. [ ] Docker setup (Next.js + PostgreSQL + Nginx)
3. [ ] Database schema + seed script
4. [ ] Climate feature (Open-Meteo)
5. [ ] Flight pricing model
6. [ ] Destination scoring + ranking
7. [ ] UI: form + results page
8. [ ] Nginx + SSL for production

## Commands
```bash
docker compose up -d        # start all services
docker compose logs -f app  # follow app logs
npm run dev                 # local dev (no Docker)
npm run build               # production build
```

## Key conventions
- API routes return `{ data, error }` shape consistently
- All monetary values stored/returned in EUR cents (integer)
- Dates are always ISO 8601 strings (YYYY-MM-DD)
- No `any` types — define interfaces in `src/types/`
