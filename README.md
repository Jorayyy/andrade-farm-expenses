# Andrade Farm — Expenses & Inventory

A farm management dashboard for tracking expenses, income, inventory, livestock, and crops. Built with Next.js (App Router), TypeScript, Tailwind CSS, Prisma, and Neon Postgres.

## Features

- **Dashboard** — monthly expense/income totals, net profit, inventory value, 6-month trend chart, spending-by-category chart, low-stock alerts, and recent activity.
- **Expenses** — record purchases with category, vendor, payment method, notes, and an optional compressed receipt photo.
- **Income** — log sales and other revenue with buyer and category.
- **Inventory** — track stock on hand, reorder levels, unit costs, storage locations, and stock in/out/adjust movements.
- **Livestock** — keep records of animals by tag, species, breed, status, acquisition cost, and location.
- **Crops** — track plantings, plots, areas, planting/harvest dates, and status.
- **Reports** — date-range summaries, category breakdowns, CSV export for every module, and CSV import for expenses and inventory.
- **Search & filters** — every list supports text search, category/status filters, and date ranges where relevant.
- **Private access** — one shared farm password with a signed, HTTP-only session cookie and login rate limiting.
- **Exact money** — amounts are stored as Postgres `numeric(12,2)`, not binary floats.
- **Production safeguards** — database migrations, auth on every page/action/API route, paginated expense and income lists, and backup-friendly CSV exports.

All money is in Philippine pesos (₱).

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
| `npm test` | Run the unit tests (session, CSV, date/money helpers) |
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
