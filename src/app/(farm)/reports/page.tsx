import Link from "next/link";
import { Download } from "lucide-react";
import { ImportForm } from "@/components/import-form";
import { FilterField, FilterForm, filterInputClass } from "@/components/filters";
import { Card, PageHeader, StatCard, tdClass, thClass, btn } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { endOfDay, formatDate, formatPeso, parseDateOnly, startOfMonth, toDateInput } from "@/lib/format";

export const dynamic = "force-dynamic";

type Params = { from?: string; to?: string };

const exportLinks = [
  { type: "expenses", label: "Expenses", dated: true },
  { type: "income", label: "Income", dated: true },
  { type: "inventory", label: "Inventory", dated: false },
  { type: "livestock", label: "Livestock", dated: false },
  { type: "crops", label: "Other crops", dated: false },
  { type: "paddies", label: "Paddies", dated: false },
  { type: "seasons", label: "Rice seasons", dated: false },
  { type: "water", label: "Water logs", dated: false },
  { type: "operations", label: "Field operations", dated: false },
  { type: "tasks", label: "Tasks", dated: false },
];

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const today = new Date();
  const from = params.from ?? toDateInput(startOfMonth(today));
  const to = params.to ?? toDateInput(today);

  const fromDate = parseDateOnly(from) ?? startOfMonth(today);
  const toDate = parseDateOnly(to) ?? today;
  const range = { gte: fromDate, lte: endOfDay(toDate) };

  const [expenseAgg, incomeAgg, expenseCats, incomeCats, expenseCount, incomeCount, riceSeasons, riceCosts] =
    await Promise.all([
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
      prisma.season.findMany({
        where: { harvestDate: range, actualYieldKg: { not: null } },
        orderBy: { harvestDate: "desc" },
        include: { paddy: { select: { code: true, areaHa: true } }, variety: { select: { name: true } } },
      }),
      prisma.expense.groupBy({
        by: ["paddyId"],
        where: { date: range, paddyId: { not: null } },
        _sum: { amount: true },
      }),
    ]);

  const totalExpenses = Number(expenseAgg._sum.amount ?? 0);
  const totalIncome = Number(incomeAgg._sum.amount ?? 0);
  const net = totalIncome - totalExpenses;
  const exportQuery = `?from=${toDateInput(fromDate)}&to=${toDateInput(toDate)}`;

  const harvestedKg = riceSeasons.reduce((total, row) => total + Number(row.actualYieldKg ?? 0), 0);
  const harvestedArea = riceSeasons.reduce((total, row) => total + Number(row.paddy.areaHa), 0);
  const averageYieldTha = harvestedArea > 0 ? harvestedKg / 1000 / harvestedArea : 0;
  const riceCost = riceCosts.reduce((total, row) => total + Number(row._sum.amount ?? 0), 0);
  const costPerKg = harvestedKg > 0 ? riceCost / harvestedKg : 0;

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

      <div className="mt-6">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">Rice season performance</h2>
          <p className="text-xs text-stone-500">Seasons harvested inside the selected range.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Harvested"
            value={`${(harvestedKg / 1000).toFixed(2)} t`}
            hint={`${riceSeasons.length} season${riceSeasons.length === 1 ? "" : "s"} · ${harvestedArea.toFixed(2)} ha`}
            tone="green"
          />
          <StatCard
            label="Average yield"
            value={`${averageYieldTha.toFixed(2)} t/ha`}
            hint="At 14% moisture"
            tone="amber"
          />
          <StatCard
            label="Paddy-linked cost"
            value={formatPeso(riceCost)}
            hint="Expenses tied to a paddy in this range"
            tone="red"
          />
          <StatCard
            label="Cost per kg"
            value={`₱${costPerKg.toFixed(2)}`}
            hint={harvestedKg > 0 ? "Paddy cost ÷ harvested kg" : "Record a harvest to compute"}
            tone="blue"
          />
        </div>

        <Card className="mt-4 overflow-hidden">
          {riceSeasons.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-stone-500">
              No harvested rice seasons in this range. Record a harvest from a paddy page to see yields here.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-stone-200">
                <thead className="bg-stone-50">
                  <tr>
                    <th className={thClass}>Paddy</th>
                    <th className={thClass}>Season</th>
                    <th className={thClass}>Variety</th>
                    <th className={thClass}>Harvested</th>
                    <th className={`${thClass} text-right`}>Area</th>
                    <th className={`${thClass} text-right`}>Yield</th>
                    <th className={`${thClass} text-right`}>t/ha</th>
                    <th className={`${thClass} text-right`}>Moisture</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {riceSeasons.map((row) => {
                    const kg = Number(row.actualYieldKg ?? 0);
                    const area = Number(row.paddy.areaHa);
                    return (
                      <tr key={row.id}>
                        <td className={tdClass}>{row.paddy.code}</td>
                        <td className={tdClass}>{row.label}</td>
                        <td className={tdClass}>{row.variety?.name ?? "—"}</td>
                        <td className={tdClass}>{formatDate(row.harvestDate)}</td>
                        <td className={`${tdClass} text-right`}>{area.toFixed(2)} ha</td>
                        <td className={`${tdClass} text-right font-medium`}>{(kg / 1000).toFixed(2)} t</td>
                        <td className={`${tdClass} text-right`}>{area > 0 ? (kg / 1000 / area).toFixed(2) : "—"}</td>
                        <td className={`${tdClass} text-right text-stone-500`}>
                          {row.grainMoisturePct === null ? "—" : `${row.grainMoisturePct}%`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
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
                  const amount = Number(row._sum.amount ?? 0);
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
                  const amount = Number(row._sum.amount ?? 0);
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
            Expense and income exports follow the selected date range. Paddy, season, water, operation and
            task exports include every record.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {exportLinks.map((link) => (
              <Link
                key={link.type}
                href={`/api/export/${link.type}${link.dated ? exportQuery : ""}`}
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
