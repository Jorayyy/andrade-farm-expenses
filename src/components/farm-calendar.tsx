import Link from "next/link";
import type { ReactNode } from "react";
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

const DOTS: Record<string, string> = {
  Fertilizer: "bg-emerald-500",
  Irrigation: "bg-blue-500",
  Scouting: "bg-amber-500",
  Harvest: "bg-purple-500",
  Spray: "bg-orange-500",
  Weeding: "bg-lime-500",
  Maintenance: "bg-stone-400",
  Other: "bg-stone-400",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthName = (date: Date) =>
  new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric" }).format(date);
const weekdayName = (date: Date) => new Intl.DateTimeFormat("en-PH", { weekday: "short" }).format(date);

export function FarmCalendar({
  tasks,
  paddies,
  paddyId,
  children,
}: {
  tasks: CalendarTask[];
  paddies: CalendarPaddy[];
  paddyId: string | null;
  children?: ReactNode;
}) {
  const today = toDateInput(new Date());
  const current = startOfMonth(new Date());

  let first = addMonths(current, -6);
  let last = addMonths(current, 6);
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
  const dot = (type: string) => DOTS[type] ?? DOTS.Other;

  const agenda = months
    .map((month) => ({
      month,
      tasks: tasks
        .filter((task) => monthKey(task.dueDate) === monthKey(month))
        .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()),
    }))
    .filter((entry) => entry.tasks.length > 0);

  const currentKey = monthKey(current);
  const agendaAnchor =
    agenda.find((entry) => monthKey(entry.month) === currentKey)?.month ??
    agenda.find((entry) => entry.month > current)?.month ??
    agenda[agenda.length - 1]?.month ??
    null;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">Crop calendar</h2>
          {agendaAnchor ? (
            <span className="sm:hidden">
              <Link href={`#agenda-month-${monthKey(agendaAnchor)}`} className={btn.ghost}>
                Today
              </Link>
            </span>
          ) : null}
          <span className="hidden sm:inline">
            <Link href={`#month-${currentKey}`} className={btn.ghost}>
              Today
            </Link>
          </span>
        </div>
        <form method="get" action="/planner" className="flex w-full items-end gap-2 sm:w-auto">
          <div className="min-w-0 flex-1 sm:flex-none">
            <select name="paddy" defaultValue={paddyId ?? ""} className={`${inputClass} py-1.5 text-sm`}>
              <option value="">All paddies</option>
              {paddies.map((paddy) => (
                <option key={paddy.id} value={paddy.id}>
                  {paddy.code} — {paddy.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className={btn.secondary}>
            Show
          </button>
        </form>
      </div>

      {children ? <div className="border-b border-stone-100 px-5 py-4">{children}</div> : null}

      <div className="max-h-[70vh] overflow-y-auto">
        <div className="sm:hidden">
          {agenda.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-stone-500">
              No tasks scheduled yet. Generate a crop calendar from a season.
            </p>
          ) : (
            agenda.map(({ month, tasks: monthTasks }) => (
              <section key={monthKey(month)} id={`agenda-month-${monthKey(month)}`} className="scroll-mt-12">
                <h3 className="sticky top-0 z-10 border-y border-stone-200 bg-white px-4 py-2 text-sm font-bold text-stone-700">
                  {monthName(month)}
                </h3>
                <ul className="divide-y divide-stone-100">
                  {monthTasks.map((task) => (
                    <li
                      key={task.id}
                      className={`flex gap-3 px-4 py-3 ${task.status === "Open" ? "" : "opacity-60"}`}
                    >
                      <div className="w-11 shrink-0 text-center">
                        <p className="text-base font-bold leading-none text-stone-900">{task.dueDate.getDate()}</p>
                        <p className="mt-1 text-[10px] font-semibold uppercase text-stone-500">
                          {weekdayName(task.dueDate)}
                        </p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-semibold text-stone-900 ${
                            task.status === "Open" ? "" : "line-through"
                          }`}
                        >
                          {task.paddy ? `${task.paddy.code}: ` : ""}
                          {task.title}
                        </p>
                        {task.notes ? <p className="mt-0.5 text-xs leading-snug text-stone-500">{task.notes}</p> : null}
                        <span className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-stone-500">
                          <span className={`h-2 w-2 rounded-full ${dot(task.type)}`} />
                          {task.status === "Open" ? task.type : task.status}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>

        <div className="hidden sm:block">
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
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-stone-100 px-5 py-3 text-[11px] text-stone-500">
        {["Fertilizer", "Irrigation", "Scouting", "Harvest", "Other"].map((type) => (
          <span key={type} className="inline-flex items-center gap-1">
            <span className={`inline-block h-2.5 w-2.5 rounded-sm border-l-2 ${tone(type)}`} />
            {type}
          </span>
        ))}
        <span className="ml-auto hidden sm:inline">Hover a task to read the rate and instruction.</span>
      </div>
    </>
  );
}
