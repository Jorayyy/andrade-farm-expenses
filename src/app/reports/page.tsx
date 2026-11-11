import Link from "next/link";
import { Download } from "lucide-react";
import { ImportForm } from "@/components/import-form";
import { FilterField, FilterForm, filterInputClass } from "@/components/filters";
import { Card, PageHeader, StatCard, tdClass, thClass, btn } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { formatPeso, startOfMonth, toDateInput } from "@/lib/format";

export const dynamic = "force-dynamic";

type Params = { from?: string; to?: string };

const exportLinks = [
  { type: "expenses", label: "Expenses" },
  { type: "income", label: "Income" },
  { type: "inventory", label: "Inventory" },
  { type: "livestock", label: "Livestock" },
  { type: "crops", label: "Crops" },
];

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const today = new Date();
  const from = params.from ?? toDateInput(startOfMonth(today));
  const to = params.to ?? toDateInput(today);

  const fromDate = new Date(`${from}T00:00:00`);
  const toDate = new Date(`${to}T23:59:59`);
  const range = { gte: fromDate, lte: toDate };

  const [expenseAgg, incomeAgg, expenseCats, incomeCats, expenseCount, incomeCount] = await Promise.all([
    prisma.expense.aggregate({ where: { date: range }, _sum: { amount: true } }),
    prisma.income.aggregate({ where: { date: range }, _sum: { amount: true } }),
    prisma.expense.groupBy({
      by: ["category"],
      where: { date: range },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
    }),
    prisma.income.groupBy({
      by: ["category"],
      where: { date: range },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
    }),
    prisma.expense.count({ where: { date: range } }),
    prisma.income.count({ where: { date: range } }),
  ]);

  const totalExpenses = expenseAgg._sum.amount ?? 0;
  const totalIncome = incomeAgg._sum.amount ?? 0;
  const net = totalIncome - totalExpenses;
  const exportQuery = `?from=${from}&to=${to}`;

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Summaries, CSV exports, and bulk imports."
      />

      <FilterForm resetHref="/reports">
        <FilterField label="From">
          <input type="date" name="from" defaultValue={from} className={filterInputClass} />
        </FilterField>
        <FilterField label="To">
          <input type="date" name="to" defaultValue={to} className={filterInputClass} />
        </FilterField>
      </FilterForm>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total expenses" value={formatPeso(totalExpenses)} tone="red" />
        <StatCard label="Total income" value={formatPeso(totalIncome)} tone="green" />
        <StatCard
          label="Net"
          value={formatPeso(net)}
          tone={net >= 0 ? "green" : "red"}
          hint={net >= 0 ? "Profit for selected range" : "Loss for selected range"}
        />
        <StatCard
          label="Transactions"
          value={`${expenseCount + incomeCount}`}
          hint={`${expenseCount} expenses · ${incomeCount} income`}
          tone="blue"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b border-stone-100 px-5 py-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">
              Expenses by category
            </h2>
          </div>
          {expenseCats.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-stone-500">No expenses in this range.</p>
          ) : (
            <table className="min-w-full divide-y divide-stone-200">
              <thead className="bg-stone-50">
                <tr>
                  <th className={thClass}>Category</th>
                  <th className={`${thClass} text-right`}>Amount</th>
                  <th className={`${thClass} text-right`}>Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {expenseCats.map((row) => {
                  const amount = row._sum.amount ?? 0;
                  const share = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
                  return (
                    <tr key={row.category}>
                      <td className={tdClass}>{row.category}</td>
                      <td className={`${tdClass} text-right font-medium`}>{formatPeso(amount)}</td>
                      <td className={`${tdClass} text-right text-stone-500`}>{share.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-stone-100 px-5 py-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">
              Income by category
            </h2>
          </div>
          {incomeCats.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-stone-500">No income in this range.</p>
          ) : (
            <table className="min-w-full divide-y divide-stone-200">
              <thead className="bg-stone-50">
                <tr>
                  <th className={thClass}>Category</th>
                  <th className={`${thClass} text-right`}>Amount</th>
                  <th className={`${thClass} text-right`}>Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {incomeCats.map((row) => {
                  const amount = row._sum.amount ?? 0;
                  const share = totalIncome > 0 ? (amount / totalIncome) * 100 : 0;
                  return (
                    <tr key={row.category}>
                      <td className={tdClass}>{row.category}</td>
                      <td className={`${tdClass} text-right font-medium`}>{formatPeso(amount)}</td>
                      <td className={`${tdClass} text-right text-stone-500`}>{share.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">Export CSV</h2>
          <p className="mt-1 text-sm text-stone-500">
            Expenses and income exports use the selected date range.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {exportLinks.map((link) => (
              <Link
                key={link.type}
                href={`/api/export/${link.type}${exportQuery}`}
                className={btn.secondary}
                prefetch={false}
              >
                <Download className="h-4 w-4" /> {link.label}
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">Import CSV</h2>
          <p className="mt-1 text-sm text-stone-500">
            Expected columns — expenses: <code className="text-xs">date, description, amount, category,
            vendor, paymentMethod, notes</code>. Inventory: <code className="text-xs">name, category, unit,
            quantity, reorderLevel, unitCost, location, notes</code>.
          </p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <ImportForm kind="expenses" />
            <ImportForm kind="inventory" />
          </div>
        </Card>
      </div>
    </>
  );
}
