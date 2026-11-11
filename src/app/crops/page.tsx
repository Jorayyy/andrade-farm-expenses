import { CropsManager, type CropRow } from "@/components/crops-manager";
import { FilterField, FilterForm, filterInputClass } from "@/components/filters";
import { CROP_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { q?: string; status?: string };

export default async function CropsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = params.status ?? "";

  const crops = await prisma.crop.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { variety: { contains: q, mode: "insensitive" as const } },
              { plot: { contains: q, mode: "insensitive" as const } },
              { notes: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(status ? { status } : {}),
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  const rows: CropRow[] = crops.map((row) => ({
    id: row.id,
    name: row.name,
    variety: row.variety,
    plot: row.plot,
    area: row.area,
    areaUnit: row.areaUnit,
    plantedDate: row.plantedDate ? row.plantedDate.toISOString() : null,
    expectedHarvestDate: row.expectedHarvestDate ? row.expectedHarvestDate.toISOString() : null,
    status: row.status,
    notes: row.notes,
  }));

  return (
    <CropsManager
      crops={rows}
      filters={
        <FilterForm resetHref="/crops">
          <FilterField label="Search" className="sm:w-56">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Crop, variety, plot"
              className={filterInputClass}
            />
          </FilterField>
          <FilterField label="Status">
            <select name="status" defaultValue={status} className={filterInputClass}>
              <option value="">All statuses</option>
              {CROP_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </FilterField>
        </FilterForm>
      }
    />
  );
}
