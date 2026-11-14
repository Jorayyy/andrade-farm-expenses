import Link from "next/link";
import { addMonths, monthKey, startOfMonth, toDateInput } from "@/lib/format";
import { btn, inputClass } from "@/components/ui";

type CalendarTask = {
  id: string;
  title: string;
  type: string;
  dueDate: Date;
  status: string;
  notes?: string | null;
  paddy?: { code: string } | null;
};

type CalendarPaddy = { id: string; code: string; name: string };

const TONES: Record<string, string> = {
  Fertilizer: "border-emerald-400 bg-emerald-50 text-emerald-800",
  Irrigation: "border-blue-400 bg-blue-50 text-blue-800",
  Scouting: "border-amber-400 bg-amber-50 text-amber-800",
  Harvest: "border-purple-400 bg-purple-50 text-purple-800",
  Spray: "border-orange-400 bg-orange-50 text-orange-800",
  Weeding: "border-lime-400 bg-lime-50 text-lime-800",
  Maintenance: "border-stone-300 bg-stone-50 text-stone-700",
  Other: "border-stone-300 bg-stone-50 text-stone-700",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthName = (date: Date) =>
  new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric" }).format(date);

export function FarmCalendar({
  tasks,
  paddies,
  paddyId,
}: {
  tasks: CalendarTask[];
  paddies: CalendarPaddy[];
  paddyId: string | null;
}) {
  const today = toDateInput(new Date());
  const current = startOfMonth(new Date());

  let first = current;
  let last = current;
  for (const task of tasks) {
    const month = startOfMonth(task.dueDate);
    if (month < first) first = month;
    if (month > last) last = month;
  }
  const months: Date[] = [];
  for (let month = first; month <= last; month = addMonths(month, 1)) months.push(month);

  const byDate = new Map<string, CalendarTask[]>();
  for (const task of tasks) {
    const key = toDateInput(task.dueDate);
    byDate.set(key, [...(byDate.get(key) ?? []), task]);
  }

  const tone = (type: string) => TONES[type] ?? TONES.Other;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">Crop calendar</h2>
          <Link href={`#month-${monthKey(current)}`} className={btn.ghost}>
            Today
          </Link>
        </div>
        <form method="get" action="/planner" className="flex items-end gap-2">
          <select name="paddy" defaultValue={paddyId ?? ""} className={`${inputClass} w-auto py-1.5 text-sm`}>
            <option value="">All paddies</option>
            {paddies.map((paddy) => (
              <option key={paddy.id} value={paddy.id}>
                {paddy.code} — {paddy.name}
              </option>
            ))}
          </select>
          <button type="submit" className={btn.secondary}>
            Show
          </button>
        </form>
      </div>

      <div className="max-h-[70vh] overflow-y-auto">
        {months.map((month) => {
          const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
          const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
          const cells: (number | null)[] = Array.from({ length: firstDay.getDay() }, () => null);
          for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
          while (cells.length % 7 !== 0) cells.push(null);

          return (
            <section key={monthKey(month)} id={`month-${monthKey(month)}`} className="scroll-mt-12">
              <h3 className="sticky top-0 z-10 border-y border-stone-200 bg-white px-5 py-2 text-sm font-bold text-stone-700">
                {monthName(month)}
              </h3>
              <div className="grid grid-cols-7 bg-stone-50 text-center">
                {WEEKDAYS.map((day) => (
                  <div key={day} className="py-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {cells.map((day, index) => {
                  if (day === null) {
                    return <div key={`blank-${index}`} className="min-h-20 border border-stone-100 bg-stone-50/40" />;
                  }
                  const date = new Date(month.getFullYear(), month.getMonth(), day);
                  const key = toDateInput(date);
                  const dayTasks = byDate.get(key) ?? [];
                  return (
                    <div key={key} className="min-h-20 border border-stone-100 p-1.5">
                      <p className={`text-xs font-semibold ${key === today ? "text-emerald-600" : "text-stone-400"}`}>
                        {day}
                      </p>
                      <div className="mt-1 space-y-1">
                        {dayTasks.slice(0, 3).map((task) => (
                          <div
                            key={task.id}
                            title={[task.title, task.notes].filter(Boolean).join(" — ")}
                            className={`truncate rounded border-l-2 px-1.5 py-0.5 text-[11px] font-medium ${tone(
                              task.type,
                            )} ${task.status === "Open" ? "" : "line-through opacity-60"}`}
                          >
                            {task.paddy ? `${task.paddy.code}: ` : ""}
                            {task.title}
                          </div>
                        ))}
                        {dayTasks.length > 3 ? (
                          <p className="text-[11px] font-medium text-stone-500">+{dayTasks.length - 3} more</p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-stone-100 px-5 py-3 text-[11px] text-stone-500">
        {["Fertilizer", "Irrigation", "Scouting", "Harvest", "Other"].map((type) => (
          <span key={type} className="inline-flex items-center gap-1">
            <span className={`inline-block h-2.5 w-2.5 rounded-sm border-l-2 ${tone(type)}`} />
            {type}
          </span>
        ))}
        <span className="ml-auto">Scroll up or down for more months. Hover a task to read the rate and instruction.</span>
      </div>
    </>
  );
}
