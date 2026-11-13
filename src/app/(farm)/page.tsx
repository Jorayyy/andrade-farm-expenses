import Link from "next/link";
import { AlertTriangle, ArrowRight, Package, Scale, TrendingUp, Wallet } from "lucide-react";
import { ExpensePieChart, MonthlyTrendChart } from "@/components/dashboard-charts";
import { Badge, Card, EmptyState, PageHeader, StatCard, tdClass, thClass } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import {
  addMonths,
  endOfMonth,
  formatDate,
  formatNumber,
  formatPeso,
  monthKey,
  monthLabel,
  startOfMonth,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const trendStart = startOfMonth(addMonths(now, -5));

  const [
    expenseTotal,
    incomeTotal,
    inventoryItems,
    expensesByCategory,
    trendExpenses,
    trendIncome,
    recentExpenses,
    recentIncome,
  ] = await Promise.all([
    prisma.expense.aggregate({
      where: { date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.income.aggregate({
      where: { date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.inventoryItem.findMany({
      select: { id: true, name: true, unit: true, quantity: true, reorderLevel: true, unitCost: true },
    }),
    prisma.expense.groupBy({
      by: ["category"],
      where: { date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
    }),
    prisma.expense.findMany({
      where: { date: { gte: trendStart } },
      select: { date: true, amount: true },
    }),
    prisma.income.findMany({
      where: { date: { gte: trendStart } },
      select: { date: true, amount: true },
    }),
    prisma.expense.findMany({ orderBy: { date: "desc" }, take: 5 }),
    prisma.income.findMany({ orderBy: { date: "desc" }, take: 5 }),
  ]);

  const monthExpenses = Number(expenseTotal._sum.amount ?? 0);
  const monthIncome = Number(incomeTotal._sum.amount ?? 0);
  const net = monthIncome - monthExpenses;
  const inventoryValue = inventoryItems.reduce(
    (sum, item) => sum + item.quantity * Number(item.unitCost),
    0,
  );
  const lowStockAll = inventoryItems.filter((item) => item.quantity <= item.reorderLevel);
  const lowStock = lowStockAll.sort((a, b) => a.quantity - b.quantity).slice(0, 5);

  const categoryData = expensesByCategory.map((row) => ({
    name: row.category,
    value: Number(row._sum.amount ?? 0),
  }));

  const months = Array.from({ length: 6 }, (_, index) => addMonths(now, index - 5));
  const trendData = months.map((month) => {
    const key = monthKey(month);
    const expenses = trendExpenses
      .filter((row) => monthKey(row.date) === key)
      .reduce((sum, row) => sum + Number(row.amount), 0);
    const income = trendIncome
      .filter((row) => monthKey(row.date) === key)
      .reduce((sum, row) => sum + Number(row.amount), 0);
    return { month: monthLabel(month), expenses, income };
  });

  const activity = [
    ...recentExpenses.map((row) => ({
      id: `e-${row.id}`,
      type: "Expense" as const,
      description: row.description,
      amount: row.amount,
      date: row.date,
    })),
    ...recentIncome.map((row) => ({
      id: `i-${row.id}`,
      type: "Income" as const,
      description: row.description,
      amount: row.amount,
      date: row.date,
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 6);

  return (
    <>
      <PageHeader
        title="Farm overview"
        subtitle={`${formatDate(monthStart)} – ${formatDate(monthEnd)}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Expenses this month"
          value={formatPeso(monthExpenses)}
          icon={<Wallet className="h-5 w-5" />}
          tone="red"
        />
        <StatCard
          label="Income this month"
          value={formatPeso(monthIncome)}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="green"
        />
        <StatCard
          label="Net this month"
          value={formatPeso(net)}
          hint={net >= 0 ? "Profitable month" : "Spending exceeds income"}
          icon={<Scale className="h-5 w-5" />}
          tone={net >= 0 ? "green" : "red"}
        />
        <StatCard
          label="Inventory value"
          value={formatPeso(inventoryValue)}
          hint={`${lowStockAll.length} item(s) at or below reorder level`}
          icon={<Package className="h-5 w-5" />}
          tone="blue"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">
              Expenses vs income · last 6 months
            </h2>
          </div>
          <MonthlyTrendChart data={trendData} />
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">
              Spending by category
            </h2>
          </div>
          <ExpensePieChart data={categoryData} />
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">Recent activity</h2>
            <Link
              href="/reports"
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
            >
              Reports <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {activity.length === 0 ? (
            <EmptyState title="Nothing recorded yet" description="Start by adding an expense or income entry." />
          ) : (
            <ul className="divide-y divide-stone-100">
              {activity.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-stone-900">{item.description}</p>
                    <p className="text-xs text-stone-500">
                      {item.type} · {formatDate(item.date)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-semibold ${
                      item.type === "Income" ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {item.type === "Income" ? "+" : "−"}
                    {formatPeso(item.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">Low stock</h2>
            <Link
              href="/inventory?low=1"
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
            >
              Inventory <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <EmptyState title="Stock levels look good" description="No items are at their reorder level." />
          ) : (
            <ul className="divide-y divide-stone-100">
              {lowStock.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-stone-900">{item.name}</p>
                    <p className="text-xs text-stone-500">
                      Reorder at {formatNumber(item.reorderLevel)} {item.unit}
                    </p>
                  </div>
                  <Badge tone="red">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    {formatNumber(item.quantity)} {item.unit}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-stone-100 px-5 py-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">Latest expenses</h2>
        </div>
        {recentExpenses.length === 0 ? (
          <EmptyState title="No expenses yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200">
              <thead className="bg-stone-50">
                <tr>
                  <th className={thClass}>Date</th>
                  <th className={thClass}>Description</th>
                  <th className={thClass}>Category</th>
                  <th className={`${thClass} text-right`}>Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {recentExpenses.map((row) => (
                  <tr key={row.id}>
                    <td className={tdClass}>{formatDate(row.date)}</td>
                    <td className={tdClass}>{row.description}</td>
                    <td className={tdClass}>
                      <Badge tone="green">{row.category}</Badge>
                    </td>
                    <td className={`${tdClass} text-right font-semibold text-red-600`}>
                      {formatPeso(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
