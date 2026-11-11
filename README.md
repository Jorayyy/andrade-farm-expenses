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
```

Push the schema to your database:

```bash
npm run db:push
```

Start the dev server:

```bash
npm run dev
```

Open http://localhost:3000.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Generate the Prisma client and build for production |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push the Prisma schema to the database |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:studio` | Open Prisma Studio |

## Deploying to Vercel

1. Push the repository to GitHub and import it in Vercel.
2. Add `DATABASE_URL` (pooled Neon connection string) as an environment variable. Optionally add `DIRECT_URL` if you plan to run schema commands.
3. Deploy. The build runs `prisma generate` automatically.

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
