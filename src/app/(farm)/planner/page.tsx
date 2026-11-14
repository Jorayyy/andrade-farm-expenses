import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  Check,
  Droplets,
  Plus,
  Sprout,
  Trash2,
} from "lucide-react";
import { FormModal } from "@/components/paddies/form-modal";
import { TaskFields } from "@/components/paddies/fields";
import { FarmCalendar } from "@/components/farm-calendar";
import { ConfirmButton } from "@/components/modal";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  StatCard,
  TableShell,
  btn,
  inputClass,
  tdClass,
  thClass,
} from "@/components/ui";
import { deleteTask, generateSeasonTasks, saveTask, setTaskStatus } from "@/app/paddy-actions";
import { daysBetween, forecastSeason, projectWaterBalance, waterState } from "@/lib/agronomy";
import { formatDate, formatNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { fallbackForecast, getWeather, sprayWindow, weatherText } from "@/lib/weather";

export const dynamic = "force-dynamic";

type PlannerParams = { paddy?: string };

export default async function PlannerPage({ searchParams }: { searchParams: Promise<PlannerParams> }) {
  const params = await searchParams;

  const paddies = await prisma.paddy.findMany({
    orderBy: { code: "asc" },
    include: {
      seasons: { include: { variety: true }, orderBy: [{ plantingDate: "desc" }] },
      waterLogs: { orderBy: { date: "desc" }, take: 20 },
    },
  });

  const openTasks = await prisma.task.findMany({
    where: { status: "Open" },
    orderBy: [{ dueDate: "asc" }],
    take: 200,
    include: { paddy: { select: { code: true, name: true } }, season: { select: { label: true } } },
  });

  const paddyFilter = params.paddy && paddies.some((paddy) => paddy.id === params.paddy) ? params.paddy : null;
  const calendarTasks = await prisma.task.findMany({
    where: paddyFilter ? { paddyId: paddyFilter } : {},
    orderBy: [{ dueDate: "asc" }],
    include: { paddy: { select: { code: true } } },
  });

  const geo = paddies.find((paddy) => paddy.latitude !== null && paddy.longitude !== null);
  const weather = await getWeather({ latitude: geo?.latitude ?? null, longitude: geo?.longitude ?? null });
  const forecastDays = weather?.forecast.length ? weather.forecast : fallbackForecast(7);

  const active = paddies
    .map((paddy) => {
      const season =
        paddy.seasons.find((row) => row.status !== "Harvested" && row.status !== "Failed") ??
        paddy.seasons[0] ??
        null;
      if (!season) return null;
      const latestWater = paddy.waterLogs.find((log) => log.waterDepthCm !== null) ?? null;
      const depth = latestWater?.waterDepthCm ?? null;
      const state = waterState(depth);
      const forecast = forecastSeason({
        areaHa: Number(paddy.areaHa),
        maturityDays: season.variety?.maturityDays ?? null,
        potentialYieldTha: season.variety ? Number(season.variety.potentialYieldTha) : null,
        targetYieldTha: season.targetYieldTha ? Number(season.targetYieldTha) : null,
        nRequirementKgHa: season.variety?.nRequirementKgHa ?? null,
        nAppliedKg: season.nAppliedKg,
        plantingDate: season.plantingDate,
        expectedHarvestDate: season.expectedHarvestDate,
        method: season.method,
        irrigationType: paddy.irrigationType,
        water: state,
        seasonRainMm: weather?.seasonRainMm ?? null,
        openIssues: [],
      });
      const balance = projectWaterBalance({
        latestDepthCm: depth,
        forecast: forecastDays.map((day) => ({ date: day.date, rainMm: day.rainMm, et0Mm: day.et0Mm })),
      });
      return { paddy, season, depth, state, forecast, balance };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const today = new Date();
  const overdue = openTasks.filter((task) => daysBetween(today, task.dueDate) < 0);
  const todayTasks = openTasks.filter((task) => daysBetween(today, task.dueDate) === 0);
  const thisWeek = openTasks.filter((task) => {
    const gap = daysBetween(today, task.dueDate);
    return gap > 0 && gap <= 7;
  });
  const waterAlerts = active.filter(
    (row) => row.balance.daysUntilCritical !== null && row.balance.daysUntilCritical <= 3,
  );

  const paddyOptions = paddies.map((paddy) => ({ id: paddy.id, label: `${paddy.code} — ${paddy.name}` }));

  return (
    <>
      <PageHeader
        title="Farm planner"
        subtitle="Weather, irrigation advice, crop calendar and the work queue for every paddy."
        actions={
          <FormModal
            action={saveTask}
            title="Add a task"
            trigger={
              <>
                <Plus className="h-4 w-4" /> Add task
              </>
            }
            submitLabel="Save task"
          >
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500">
              Paddy
            </label>
            <select name="paddyId" className={`${inputClass} mb-4`} defaultValue="">
              <option value="">Farm-wide</option>
              {paddyOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <TaskFields />
          </FormModal>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Overdue tasks"
          value={String(overdue.length)}
          hint={overdue.length ? "Clear these first" : "Nothing overdue"}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone={overdue.length ? "red" : "green"}
        />
        <StatCard
          label="Due today"
          value={String(todayTasks.length)}
          hint={`${thisWeek.length} more this week`}
          icon={<CalendarClock className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          label="Water alerts"
          value={String(waterAlerts.length)}
          hint={waterAlerts.length ? "Critical within 3 days" : "No paddy critical in 3 days"}
          icon={<Droplets className="h-5 w-5" />}
          tone={waterAlerts.length ? "red" : "blue"}
        />
        <StatCard
          label="Active seasons"
          value={String(active.length)}
          hint={`${formatNumber(active.reduce((sum, row) => sum + Number(row.paddy.areaHa), 0), 2)} ha planted`}
          icon={<Sprout className="h-5 w-5" />}
          tone="green"
        />
      </div>

      <div className="mt-6 grid gap-4">
        <Card>
          <div className="border-b border-stone-100 px-5 py-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">Work queue</h2>
          </div>
          {openTasks.length === 0 ? (
            <EmptyState title="No open tasks" description="Generate a crop calendar from an active season below." />
          ) : (
            <ul className="max-h-[28rem] divide-y divide-stone-100 overflow-y-auto">
              {openTasks.slice(0, 40).map((task) => {
                const gap = daysBetween(today, task.dueDate);
                return (
                  <li key={task.id} className="flex items-start justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-900">{task.title}</p>
                      <p className="text-xs text-stone-500">
                        {task.paddy ? `${task.paddy.code} · ` : ""}
                        {formatDate(task.dueDate)} · {task.type}
                        {gap < 0 ? ` · ${Math.abs(gap)} d late` : gap === 0 ? " · today" : ` · in ${gap} d`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Badge tone={task.priority === "Urgent" || task.priority === "High" ? "red" : gap < 0 ? "amber" : "stone"}>
                        {task.priority}
                      </Badge>
                      <form action={setTaskStatus}>
                        <input type="hidden" name="id" value={task.id} />
                        <input type="hidden" name="status" value="Done" />
                        <button type="submit" className={btn.ghost} title="Mark done">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      </form>
                      <form action={deleteTask}>
                        <input type="hidden" name="id" value={task.id} />
                        <ConfirmButton className={btn.ghost} message="Delete this task?">
                          <Trash2 className="h-3.5 w-3.5" />
                        </ConfirmButton>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card id="crop-calendar" className="scroll-mt-28 overflow-hidden">
          <FarmCalendar
            tasks={calendarTasks}
            paddies={paddies.map((paddy) => ({ id: paddy.id, code: paddy.code, name: paddy.name }))}
            paddyId={paddyFilter}
          >
            {weather ? (
              <>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">10-day work weather</h2>
                  <p className="text-xs text-stone-500">
                    {weather.isDefaultLocation
                      ? "Set coordinates on a paddy for a local forecast"
                      : `${weather.location.latitude.toFixed(3)}, ${weather.location.longitude.toFixed(3)}`}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                  {forecastDays.map((day) => {
                    const spray = sprayWindow(day);
                    return (
                      <div key={day.date} className="rounded-lg border border-stone-200 px-3 py-2">
                        <p className="text-xs font-semibold text-stone-500">
                          {formatDate(new Date(`${day.date}T12:00:00`))}
                        </p>
                        <p className="mt-0.5 text-sm font-bold text-stone-900">{weatherText(day.code)}</p>
                        <p className="text-xs text-stone-500">
                          {Math.round(day.tempMin)}–{Math.round(day.tempMax)}°C
                        </p>
                        <p className="text-xs text-stone-500">{Math.round(day.rainMm)} mm rain</p>
                        <p
                          className={`mt-1 text-[11px] font-semibold ${
                            spray.suitable ? "text-emerald-600" : "text-amber-600"
                          }`}
                        >
                          {spray.suitable ? "Spray / fertilize OK" : spray.reason}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : null}
          </FarmCalendar>
        </Card>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-stone-500">Active seasons & irrigation</h2>
        {active.length === 0 ? (
          <Card>
            <EmptyState
              title="No active seasons"
              description="Add a season to a paddy to see growth stage, harvest date and irrigation advice here."
            />
          </Card>
        ) : (
          <TableShell>
            <table className="min-w-full divide-y divide-stone-200">
              <thead className="bg-stone-50">
                <tr>
                  <th className={thClass}>Paddy</th>
                  <th className={thClass}>Season</th>
                  <th className={thClass}>Stage</th>
                  <th className={thClass}>Days to harvest</th>
                  <th className={thClass}>Water</th>
                  <th className={thClass}>Irrigation</th>
                  <th className={thClass} />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {active.map(({ paddy, season, depth, state, forecast, balance }) => (
                  <tr key={season.id} className="hover:bg-stone-50">
                    <td className={tdClass}>
                      <Link href={`/paddies/${paddy.id}?season=${season.id}`} className="font-semibold text-stone-900 hover:text-emerald-700">
                        {paddy.code}
                      </Link>
                    </td>
                    <td className={tdClass}>
                      <p className="font-medium text-stone-800">{season.label}</p>
                      <p className="text-xs text-stone-500">{season.variety?.name ?? "No variety"}</p>
                    </td>
                    <td className={tdClass}>
                      <Badge tone={forecast.stage.key === "mature" ? "amber" : "green"}>{forecast.stage.label}</Badge>
                    </td>
                    <td className={tdClass}>
                      {forecast.daysToHarvest === null ? "—" : `${Math.max(0, forecast.daysToHarvest)} d`}
                    </td>
                    <td className={tdClass}>
                      <Badge
                        tone={
                          state === "critical" || state === "low"
                            ? "red"
                            : state === "excess"
                              ? "blue"
                              : state === "optimal"
                                ? "green"
                                : "stone"
                        }
                      >
                        {depth === null ? "No reading" : `${formatNumber(depth, 1)} cm`}
                      </Badge>
                    </td>
                    <td className={tdClass}>
                      {balance.daysUntilCritical === null ? (
                        <span className="text-stone-500">No shortfall in 10 d</span>
                      ) : balance.daysUntilCritical === 0 ? (
                        <span className="font-semibold text-red-600">Irrigate now · {Math.round(balance.irrigationNeededMm)} mm</span>
                      ) : (
                        <span className="text-amber-700">
                          In {balance.daysUntilCritical} d · {Math.round(balance.irrigationNeededMm)} mm
                        </span>
                      )}
                    </td>
                    <td className={tdClass}>
                      <form action={generateSeasonTasks}>
                        <input type="hidden" name="seasonId" value={season.id} />
                        <button type="submit" className={btn.ghost}>Generate calendar</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        )}
      </div>

      <Card className="mt-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">How the advice works</h2>
          <Link href="/paddies" className="text-xs font-semibold text-emerald-700 hover:underline">
            Manage paddies
          </Link>
        </div>
        <div className="mt-3 grid gap-4 text-sm text-stone-600 sm:grid-cols-3">
          <div>
            <p className="font-semibold text-stone-900">Water balance</p>
            <p className="mt-1 text-xs text-stone-500">
              Depth + rain + irrigation − evapotranspiration − seepage, projected 10 days ahead. 10 mm = 1 cm.
            </p>
          </div>
          <div>
            <p className="font-semibold text-stone-900">Yield forecast</p>
            <p className="mt-1 text-xs text-stone-500">
              Variety potential reduced by water, nitrogen, pest pressure and establishment, with a confidence range.
            </p>
          </div>
          <div>
            <p className="font-semibold text-stone-900">Crop calendar</p>
            <p className="mt-1 text-xs text-stone-500">
              Generated from the planting date and variety maturity: basal fertilizer, topdress, scouting, drainage and harvest.
            </p>
          </div>
        </div>
      </Card>
    </>
  );
}
