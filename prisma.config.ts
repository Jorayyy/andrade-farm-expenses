import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma CLI commands need a datasource URL, but `prisma generate` does not
// connect to the database. Vercel runs `prisma generate` during install before
// all env vars are guaranteed to be present, so fall back to a placeholder.
const datasourceUrl =
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL ??
  "postgresql://placeholder:placeholder@localhost:5432/placeholder";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: datasourceUrl,
  },
});
