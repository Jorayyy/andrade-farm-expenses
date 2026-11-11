"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatPeso } from "@/lib/format";

const COLORS = [
  "#059669",
  "#0d9488",
  "#0891b2",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#ca8a04",
  "#65a30d",
  "#78716c",
];

export type CategoryDatum = { name: string; value: number };
export type TrendDatum = { month: string; expenses: number; income: number };

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-stone-200 bg-stone-50/60 px-4 text-center text-sm text-stone-500">
      {message}
    </div>
  );
}

export function ExpensePieChart({ data }: { data: CategoryDatum[] }) {
  if (data.length === 0) return <EmptyChart message="No expenses recorded this month yet." />;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatPeso(Number(value))} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span className="text-xs text-stone-600">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MonthlyTrendChart({ data }: { data: TrendDatum[] }) {
  if (data.every((item) => item.expenses === 0 && item.income === 0)) {
    return <EmptyChart message="No transactions in the last 6 months." />;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#78716c" }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 12, fill: "#78716c" }}
            axisLine={false}
            tickLine={false}
            width={70}
            tickFormatter={(value: number) => `₱${new Intl.NumberFormat("en-PH").format(value)}`}
          />
          <Tooltip formatter={(value) => formatPeso(Number(value))} cursor={{ fill: "#f5f5f4" }} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span className="text-xs capitalize text-stone-600">{value}</span>}
          />
          <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
          <Bar dataKey="income" name="Income" fill="#059669" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
