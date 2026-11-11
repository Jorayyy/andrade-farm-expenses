import { FilterField, FilterForm, filterInputClass } from "@/components/filters";
import { IncomeManager, type IncomeRow } from "@/components/income-manager";
import { INCOME_CATEGORIES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = {
  q?: string;
  category?: string;
  from?: string;
  to?: string;
};

export default async function IncomePage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const category = params.category ?? "";
  const from = params.from ?? "";
  const to = params.to ?? "";

  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (from) dateFilter.gte = new Date(`${from}T00:00:00`);
  if (to) dateFilter.lte = new Date(`${to}T23:59:59`);

  const income = await prisma.income.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { description: { contains: q, mode: "insensitive" as const } },
              { buyer: { contains: q, mode: "insensitive" as const } },
              { notes: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(category ? { category } : {}),
      ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const rows: IncomeRow[] = income.map((row) => ({
    id: row.id,
    date: row.date.toISOString(),
    description: row.description,
    amount: row.amount,
    category: row.category,
    buyer: row.buyer,
    notes: row.notes,
  }));

  return (
    <IncomeManager
      income={rows}
      filters={
        <FilterForm resetHref="/income">
          <FilterField label="Search" className="sm:w-56">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Description, buyer, notes"
              className={filterInputClass}
            />
          </FilterField>
          <FilterField label="Category">
            <select name="category" defaultValue={category} className={filterInputClass}>
              <option value="">All categories</option>
              {INCOME_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="From">
            <input type="date" name="from" defaultValue={from} className={filterInputClass} />
          </FilterField>
          <FilterField label="To">
            <input type="date" name="to" defaultValue={to} className={filterInputClass} />
          </FilterField>
        </FilterForm>
      }
    />
  );
}
