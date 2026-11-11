import { FilterField, FilterForm, filterInputClass } from "@/components/filters";
import { LivestockManager, type LivestockRow } from "@/components/livestock-manager";
import { LIVESTOCK_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { q?: string; status?: string };

export default async function LivestockPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = params.status ?? "";

  const livestock = await prisma.livestock.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { tag: { contains: q, mode: "insensitive" as const } },
              { breed: { contains: q, mode: "insensitive" as const } },
              { location: { contains: q, mode: "insensitive" as const } },
              { notes: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(status ? { status } : {}),
    },
    orderBy: [{ status: "asc" }, { tag: "asc" }],
  });

  const rows: LivestockRow[] = livestock.map((row) => ({
    id: row.id,
    tag: row.tag,
    species: row.species,
    breed: row.breed,
    sex: row.sex,
    birthDate: row.birthDate ? row.birthDate.toISOString() : null,
    acquiredDate: row.acquiredDate ? row.acquiredDate.toISOString() : null,
    acquisitionCost: row.acquisitionCost,
    status: row.status,
    location: row.location,
    notes: row.notes,
  }));

  return (
    <LivestockManager
      livestock={rows}
      filters={
        <FilterForm resetHref="/livestock">
          <FilterField label="Search" className="sm:w-56">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Tag, breed, location"
              className={filterInputClass}
            />
          </FilterField>
          <FilterField label="Status">
            <select name="status" defaultValue={status} className={filterInputClass}>
              <option value="">All statuses</option>
              {LIVESTOCK_STATUSES.map((item) => (
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
