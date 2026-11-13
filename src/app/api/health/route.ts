import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Public uptime probe: reports reachability, never farm data.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
