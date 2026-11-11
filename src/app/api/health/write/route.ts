import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const created = await prisma.income.create({
      data: {
        date: new Date(),
        description: "healthcheck-write",
        amount: 0,
        category: "Other",
      },
    });
    await prisma.income.delete({ where: { id: created.id } });
    return Response.json({ ok: true, wrote: true, deleted: true });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? { name: error.name, message: error.message } : String(error),
      },
      { status: 500 },
    );
  }
}
