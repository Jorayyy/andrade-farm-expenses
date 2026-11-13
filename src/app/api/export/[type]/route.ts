import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";
import { endOfDay, parseDateOnly, toDateInput } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ type: string }> }) {
  if (!(await isAuthenticated())) return new Response("Unauthorized", { status: 401 });

  const { type } = await params;
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const fromDate = parseDateOnly(from);
  const toDate = parseDateOnly(to);
  if ((from && !fromDate) || (to && !toDate)) {
    return new Response("Invalid date range", { status: 400 });
  }

  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (fromDate) dateFilter.gte = fromDate;
  if (toDate) dateFilter.lte = endOfDay(toDate);
  const hasRange = Object.keys(dateFilter).length > 0;

  let rows: (string | number | null)[][] = [];

  switch (type) {
    case "expenses": {
      const expenses = await prisma.expense.findMany({
        where: hasRange ? { date: dateFilter } : undefined,
        orderBy: { date: "asc" },
      });
      rows = [
        ["Date", "Description", "Category", "Amount", "Vendor", "Payment Method", "Notes"],
        ...expenses.map((row) => [
          toDateInput(row.date),
          row.description,
          row.category,
          Number(row.amount),
          row.vendor,
          row.paymentMethod,
          row.notes,
        ]),
      ];
      break;
    }
    case "income": {
      const income = await prisma.income.findMany({
        where: hasRange ? { date: dateFilter } : undefined,
        orderBy: { date: "asc" },
      });
      rows = [
        ["Date", "Description", "Category", "Amount", "Buyer", "Notes"],
        ...income.map((row) => [
          toDateInput(row.date),
          row.description,
          row.category,
          Number(row.amount),
          row.buyer,
          row.notes,
        ]),
      ];
      break;
    }
    case "inventory": {
      const items = await prisma.inventoryItem.findMany({ orderBy: { name: "asc" } });
      rows = [
        ["Name", "Category", "Unit", "Quantity", "Reorder Level", "Unit Cost", "Value", "Location", "Notes"],
        ...items.map((row) => [
          row.name,
          row.category,
          row.unit,
          row.quantity,
          row.reorderLevel,
          Number(row.unitCost),
          row.quantity * Number(row.unitCost),
          row.location,
          row.notes,
        ]),
      ];
      break;
    }
    case "livestock": {
      const livestock = await prisma.livestock.findMany({ orderBy: { tag: "asc" } });
      rows = [
        [
          "Tag",
          "Species",
          "Breed",
          "Sex",
          "Birth Date",
          "Acquired Date",
          "Acquisition Cost",
          "Status",
          "Location",
          "Notes",
        ],
        ...livestock.map((row) => [
          row.tag,
          row.species,
          row.breed,
          row.sex,
          row.birthDate ? toDateInput(row.birthDate) : null,
          row.acquiredDate ? toDateInput(row.acquiredDate) : null,
          row.acquisitionCost === null ? null : Number(row.acquisitionCost),
          row.status,
          row.location,
          row.notes,
        ]),
      ];
      break;
    }
    case "crops": {
      const crops = await prisma.crop.findMany({ orderBy: { name: "asc" } });
      rows = [
        ["Name", "Variety", "Plot", "Area", "Area Unit", "Planted Date", "Expected Harvest", "Status", "Notes"],
        ...crops.map((row) => [
          row.name,
          row.variety,
          row.plot,
          row.area,
          row.areaUnit,
          row.plantedDate ? toDateInput(row.plantedDate) : null,
          row.expectedHarvestDate ? toDateInput(row.expectedHarvestDate) : null,
          row.status,
          row.notes,
        ]),
      ];
      break;
    }
    default:
      return new Response("Unknown export type", { status: 404 });
  }

  const csv = toCsv(rows);
  const filename = `${type}-${toDateInput(new Date())}.csv`;

  return new Response("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
