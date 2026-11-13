# Andrade Farm — Rice Paddy Management

A rice-paddy-first farm management dashboard. Track every paddy's measurements, water, crop stage, yield forecast, field work and profit — alongside expenses, income, inventory, livestock, and other crops. Built with Next.js (App Router), TypeScript, Tailwind CSS, Prisma, and Neon Postgres.

## Features

- **Rice paddies** — one record per field with area, length × width, soil, irrigation type, water source, elevation, coordinates, and status. A proportional field map sizes and colours each block by area and water status.
- **Seasons** — variety, wet/dry season, transplanted or direct-seeded, nursery/planting/harvest dates, seed rate, target yield, NPK applied, and grain moisture.
- **Yield forecast** — explainable estimate: variety potential × water × nitrogen × pest/disease × establishment, with a confidence band, growth stage, days to harvest, and the factors behind the number.
- **Water balance** — log measured depth (cm), irrigation, rain, and drainage. Advice projects depth 10 days ahead using evapotranspiration, seepage, and the weather forecast (10 mm = 1 cm).
- **Weather** — free Open-Meteo forecast and archive data (no API key) for field work, spray windows, seasonal rainfall, and growing-degree-day tracking. Falls back gracefully when offline.
- **Pests, disease & operations** — scout and log issues with severity and affected area, record treatments, and keep a field-operation history with quantities and costs. Open issues reduce the yield forecast.
- **Crop calendar & tasks** — generate a full rice calendar (land prep, basal fertilizer, topdress, scouting, drainage, harvest) from the planting date and variety maturity. The planner shows overdue work, the next 30 days, and irrigation alerts.
- **Per-field profit** — link expenses and income to a paddy and season to see cost, revenue, net, cost per kg, break-even price, and projected revenue.
- **Dashboard** — monthly expense/income totals, net profit, inventory value, 6-month trend chart, spending-by-category chart, low-stock alerts, and recent activity.
- **Expenses** — record purchases with category, vendor, payment method, notes, an optional compressed receipt photo, and an optional paddy/season link.
- **Income** — log sales and other revenue with buyer, category, and an optional paddy/season link.
- **Inventory** — track stock on hand, reorder levels, unit costs, storage locations, and stock in/out/adjust movements.
- **Livestock** — keep records of animals by tag, species, breed, status, acquisition cost, and location.
- **Other crops** — track non-rice plantings, plots, areas, planting/harvest dates, and status.
- **Reports** — date-range summaries, rice-season yield performance, category breakdowns, CSV export for every module (including paddies, seasons, water, operations, and tasks), and CSV import for expenses and inventory.
- **Search & filters** — every list supports text search, category/status filters, and date ranges where relevant.
- **Private access** — one shared farm password with a signed, HTTP-only session cookie and login rate limiting.
- **Exact money** — amounts are stored as Postgres `numeric(12,2)`, not binary floats.
- **Production safeguards** — database migrations, auth on every page/action/API route, paginated expense and income lists, and backup-friendly CSV exports.

All money is in Philippine pesos (₱). Yield forecasts and water advice are decision aids, not guarantees; confirm with your own field observations.

## Getting started

```bash
npm install
```

Create `.env` from `.env.example` and fill in your Neon connection strings:

```bash
cp .env.example .env
```

```env
DATABASE_URL="postgresql://user:password@host-pooler.region.aws.neon.tech/dbname?sslmode=require"
DIRECT_URL="postgresql://user:password@host.region.aws.neon.tech/dbname?sslmode=require"
AUTH_PASSWORD="a-long-shared-farm-password"
SESSION_SECRET="at-least-32-random-characters"
TZ="Asia/Manila"

# Optional: default farm coordinates for Open-Meteo weather
FARM_LAT="15.486"
FARM_LNG="120.973"
```

Generate a session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(36).toString('base64url'))"
```

Apply the database migrations:

```bash
npm run db:deploy
```

Start the dev server:

```bash
npm run dev
```

Open http://localhost:3000 and sign in with `AUTH_PASSWORD`.

## Authentication

There is no public sign-up. The whole dashboard is protected by one shared password stored in `AUTH_PASSWORD`. Login creates a signed, HTTP-only cookie (`SESSION_SECRET`) that lasts 30 days; “Sign out” clears it.

- Change `AUTH_PASSWORD` to rotate the password. Existing sessions stay valid until they expire, so also change `SESSION_SECRET` to sign everyone out.
- Server actions and `/api/receipts/*`, `/api/export/*` check the session too, not just the pages.
- Login attempts are limited to 10 per IP per 10 minutes in memory. On serverless hosting this limit is per instance — enough for a family farm, not a public site.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Generate the Prisma client and build for production |
| `npm run start` | Start the production server |
| `npm test` | Run the unit tests (session, CSV, date/money, agronomy) |
| `npm run lint` | Run ESLint |
| `npm run db:migrate` | Create a migration after changing `schema.prisma` |
| `npm run db:deploy` | Apply pending migrations (use this in production) |
| `npm run db:push` | Push the schema without a migration (local prototyping only) |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:studio` | Open Prisma Studio |

## Deploying to Vercel

1. Push the repository to GitHub and import it in Vercel.
2. Add these environment variables in **Project → Settings → Environment Variables**:
   - `DATABASE_URL` — pooled Neon connection string.
   - `DIRECT_URL` — direct Neon connection string (used by migrations).
   - `AUTH_PASSWORD` — the shared farm password.
   - `SESSION_SECRET` — 32+ random characters.
   - `TZ` — `Asia/Manila`.
   - `FARM_LAT` / `FARM_LNG` — optional default farm coordinates for weather (each paddy can override them).
3. Before deploying a schema change, run migrations from a trusted machine against the direct URL:

   ```bash
   npm run db:deploy
   ```

   Then deploy normally. Keeping migrations out of the Vercel build avoids failures when the Neon URL contains `channel_binding=require`, which Prisma’s migration engine does not accept.
4. Open the deployment, sign in, and keep the URL private. Health checks are at `/api/health` (returns only `{ "ok": true }` or a 503).

Neon keeps automated backups/PITR depending on your plan. In addition, use **Reports → Export CSV** regularly as an independent, human-readable backup.

Receipt images are compressed in the browser and stored as base64 in Postgres, so no extra file storage service is required. For very high volumes, consider moving receipts to Vercel Blob or S3.

## CSV import formats

Expenses — header row required:

```csv
date,description,amount,category,vendor,paymentMethod,notes
2026-11-02,2 sacks urea fertilizer,3500,Fertilizer,Agri Supply Co.,Cash,
```

Inventory — header row required:

```csv
name,category,unit,quantity,reorderLevel,unitCost,location,notes
Urea fertilizer,Fertilizer,sack,4,5,1750,Barn shelf A,
```

Dates use `YYYY-MM-DD`. Amounts may include commas and the ₱ symbol.
