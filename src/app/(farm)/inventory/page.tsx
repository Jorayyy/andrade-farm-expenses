import { FilterField, FilterForm, filterInputClass } from "@/components/filters";
import { InventoryManager, type InventoryRow } from "@/components/inventory-manager";
import { INVENTORY_CATEGORIES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = {
  q?: string;
  category?: string;
  low?: string;
};

export default async function InventoryPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const category = params.category ?? "";
  const lowOnly = params.low === "1";

  const items = await prisma.inventoryItem.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { location: { contains: q, mode: "insensitive" as const } },
              { notes: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(category ? { category } : {}),
    },
    orderBy: { name: "asc" },
  });

  const filtered = lowOnly ? items.filter((item) => item.quantity <= item.reorderLevel) : items;

  const rows: InventoryRow[] = filtered.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    unit: row.unit,
    quantity: row.quantity,
    reorderLevel: row.reorderLevel,
    unitCost: Number(row.unitCost),
    location: row.location,
    notes: row.notes,
  }));

  return (
    <InventoryManager
      items={rows}
      filters={
        <FilterForm resetHref="/inventory">
          <FilterField label="Search" className="sm:w-56">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Item, location, notes"
              className={filterInputClass}
            />
          </FilterField>
          <FilterField label="Category">
            <select name="category" defaultValue={category} className={filterInputClass}>
              <option value="">All categories</option>
              {INVENTORY_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Stock level">
            <select name="low" defaultValue={lowOnly ? "1" : ""} className={filterInputClass}>
              <option value="">All items</option>
              <option value="1">Low stock only</option>
            </select>
          </FilterField>
        </FilterForm>
      }
    />
  );
}
