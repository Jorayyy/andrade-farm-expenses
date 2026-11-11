import { ExpensesManager, type ExpenseRow } from "@/components/expenses-manager";
import { FilterField, FilterForm, filterInputClass } from "@/components/filters";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = {
  q?: string;
  category?: string;
  from?: string;
  to?: string;
};

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const category = params.category ?? "";
  const from = params.from ?? "";
  const to = params.to ?? "";

  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (from) dateFilter.gte = new Date(`${from}T00:00:00`);
  if (to) dateFilter.lte = new Date(`${to}T23:59:59`);

  const expenses = await prisma.expense.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { description: { contains: q, mode: "insensitive" as const } },
              { vendor: { contains: q, mode: "insensitive" as const } },
              { notes: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(category ? { category } : {}),
      ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const rows: ExpenseRow[] = expenses.map((row) => ({
    id: row.id,
    date: row.date.toISOString(),
    description: row.description,
    amount: row.amount,
    category: row.category,
    vendor: row.vendor,
    paymentMethod: row.paymentMethod,
    notes: row.notes,
    receiptId: row.receiptId,
  }));

  return (
    <ExpensesManager
      expenses={rows}
      filters={
        <FilterForm resetHref="/expenses">
          <FilterField label="Search" className="sm:w-56">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Description, vendor, notes"
              className={filterInputClass}
            />
          </FilterField>
          <FilterField label="Category">
            <select name="category" defaultValue={category} className={filterInputClass}>
              <option value="">All categories</option>
              {EXPENSE_CATEGORIES.map((item) => (
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
