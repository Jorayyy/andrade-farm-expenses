import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.DATABASE_URL ?? "";
  let host: string | null = null;
  try {
    host = new URL(url).host;
  } catch {
    host = null;
  }

  const base = {
    hasDatabaseUrl: Boolean(url),
    hasDirectUrl: Boolean(process.env.DIRECT_URL),
    databaseHost: host,
    node: process.version,
  };

  try {
    const [expenses, income, items] = await Promise.all([
      prisma.expense.count(),
      prisma.income.count(),
      prisma.inventoryItem.count(),
    ]);
    return Response.json({ ok: true, ...base, counts: { expenses, income, items } });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        ...base,
        error: error instanceof Error ? { name: error.name, message: error.message } : String(error),
      },
      { status: 500 },
    );
  }
}
