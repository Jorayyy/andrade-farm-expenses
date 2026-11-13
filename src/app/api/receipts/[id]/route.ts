import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const receipt = await prisma.receipt.findUnique({ where: { id } });

  if (!receipt) {
    return new Response("Receipt not found", { status: 404 });
  }

  const base64 = receipt.data.includes(",") ? receipt.data.split(",")[1] : receipt.data;
  const buffer = Buffer.from(base64, "base64");
  const safeName = receipt.filename.replace(/["\r\n]/g, "");

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": receipt.mimeType,
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "private, max-age=31536000, immutable",
      "Content-Disposition": `inline; filename="${safeName}"`,
    },
  });
}
