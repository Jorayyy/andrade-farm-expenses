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
        include: { paddy: { select: { code: true } }, season: { select: { label: true } } },
      });
      rows = [
        ["Date", "Description", "Category", "Amount", "Paddy", "Season", "Vendor", "Payment Method", "Notes"],
        ...expenses.map((row) => [
          toDateInput(row.date),
          row.description,
          row.category,
          Number(row.amount),
          row.paddy?.code ?? null,
          row.season?.label ?? null,
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
        include: { paddy: { select: { code: true } }, season: { select: { label: true } } },
      });
      rows = [
        ["Date", "Description", "Category", "Amount", "Paddy", "Season", "Buyer", "Notes"],
        ...income.map((row) => [
          toDateInput(row.date),
          row.description,
          row.category,
          Number(row.amount),
          row.paddy?.code ?? null,
          row.season?.label ?? null,
          row.buyer,
          row.notes,
        ]),
      ];
      break;
    }
    case "paddies": {
      const paddies = await prisma.paddy.findMany({
        orderBy: { code: "asc" },
        include: { seasons: { include: { variety: true }, orderBy: { plantingDate: "desc" }, take: 1 } },
      });
      rows = [
        [
          "Code",
          "Name",
          "Area (ha)",
          "Length (m)",
          "Width (m)",
          "Soil",
          "Irrigation",
          "Water Source",
          "Elevation (m)",
          "Latitude",
          "Longitude",
          "Status",
          "Latest Season",
          "Variety",
          "Planted",
          "Actual Yield (kg)",
          "Notes",
        ],
        ...paddies.map((row) => {
          const season = row.seasons[0];
          return [
            row.code,
            row.name,
            Number(row.areaHa),
            row.lengthM,
            row.widthM,
            row.soilType,
            row.irrigationType,
            row.waterSource,
            row.elevationM,
            row.latitude,
            row.longitude,
            row.status,
            season?.label ?? null,
            season?.variety?.name ?? null,
            season?.plantingDate ? toDateInput(season.plantingDate) : null,
            season?.actualYieldKg === null || season?.actualYieldKg === undefined
              ? null
              : Number(season.actualYieldKg),
            row.notes,
          ];
        }),
      ];
      break;
    }
    case "seasons": {
      const seasons = await prisma.season.findMany({
        orderBy: { plantingDate: "desc" },
        include: { paddy: { select: { code: true, areaHa: true } }, variety: { select: { name: true } } },
      });
      rows = [
        [
          "Paddy",
          "Season",
          "Type",
          "Method",
          "Variety",
          "Status",
          "Planted",
          "Expected Harvest",
          "Harvested",
          "Area (ha)",
          "Actual Yield (kg)",
          "Yield (t/ha)",
          "Moisture (%)",
          "Price (PHP/kg)",
          "N (kg/ha)",
          "P2O5 (kg/ha)",
          "K2O (kg/ha)",
        ],
        ...seasons.map((row) => {
          const area = Number(row.paddy.areaHa);
          const kg = row.actualYieldKg === null ? null : Number(row.actualYieldKg);
          return [
            row.paddy.code,
            row.label,
            row.seasonType,
            row.method,
            row.variety?.name ?? null,
            row.status,
            row.plantingDate ? toDateInput(row.plantingDate) : null,
            row.expectedHarvestDate ? toDateInput(row.expectedHarvestDate) : null,
            row.harvestDate ? toDateInput(row.harvestDate) : null,
            area,
            kg,
            kg === null || area <= 0 ? null : kg / 1000 / area,
            row.grainMoisturePct,
            row.pricePerKg === null ? null : Number(row.pricePerKg),
            row.nAppliedKg,
            row.pAppliedKg,
            row.kAppliedKg,
          ];
        }),
      ];
      break;
    }
    case "water": {
      const logs = await prisma.waterLog.findMany({
        orderBy: { date: "asc" },
        include: { paddy: { select: { code: true } }, season: { select: { label: true } } },
        take: 5000,
      });
      rows = [
        ["Date", "Paddy", "Season", "Depth (cm)", "Irrigation (mm)", "Rain (mm)", "Drainage (mm)", "Note"],
        ...logs.map((row) => [
          toDateInput(row.date),
          row.paddy.code,
          row.season?.label ?? null,
          row.waterDepthCm,
          row.irrigationMm,
          row.rainfallMm,
          row.drainageMm,
          row.note,
        ]),
      ];
      break;
    }
    case "operations": {
      const operations = await prisma.fieldOperation.findMany({
        orderBy: { date: "asc" },
        include: { paddy: { select: { code: true } }, season: { select: { label: true } } },
        take: 5000,
      });
      rows = [
        ["Date", "Paddy", "Season", "Type", "Description", "Quantity", "Unit", "Cost (PHP)", "Notes"],
        ...operations.map((row) => [
          toDateInput(row.date),
          row.paddy.code,
          row.season?.label ?? null,
          row.type,
          row.description,
          row.quantity,
          row.unit,
          row.cost === null ? null : Number(row.cost),
          row.notes,
        ]),
      ];
      break;
    }
    case "tasks": {
      const tasks = await prisma.task.findMany({
        orderBy: { dueDate: "asc" },
        include: { paddy: { select: { code: true } }, season: { select: { label: true } } },
        take: 5000,
      });
      rows = [
        ["Due Date", "Paddy", "Season", "Task", "Type", "Priority", "Status", "Notes"],
        ...tasks.map((row) => [
          toDateInput(row.dueDate),
          row.paddy?.code ?? null,
          row.season?.label ?? null,
          row.title,
          row.type,
          row.priority,
          row.status,
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
