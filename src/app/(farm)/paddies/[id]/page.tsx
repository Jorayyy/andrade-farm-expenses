import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  Check,
  Droplets,
  Pencil,
  Plus,
  Receipt,
  Ruler,
  Sprout,
  Trash2,
  TrendingUp,
  Wallet,
  Waves,
} from "lucide-react";
import { FormModal } from "@/components/paddies/form-modal";
import {
  HarvestFields,
  IssueFields,
  OperationFields,
  PaddyFields,
  SeasonFields,
  TaskFields,
  WaterFields,
} from "@/components/paddies/fields";
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
import {
  deleteIssue,
  deleteOperation,
  deletePaddy,
  deleteSeason,
  deleteTask,
  deleteWaterLog,
  generateSeasonTasks,
  recordHarvest,
  resolveIssue,
  saveIssue,
  saveOperation,
  savePaddy,
  saveSeason,
  saveTask,
  saveWaterLog,
  setTaskStatus,
} from "@/app/paddy-actions";
import {
  forecastSeason,
  projectWaterBalance,
  waterState,
  WATER_STATE_LABEL,
} from "@/lib/agronomy";
import { formatDate, formatNumber, formatPeso } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { fallbackForecast, getWeather, sprayWindow, weatherText } from "@/lib/weather";

export const dynamic = "force-dynamic";

type Params = { tab?: string; season?: string };

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "water", label: "Water" },
  { key: "operations", label: "Operations" },
  { key: "issues", label: "Pests & disease" },
  { key: "tasks", label: "Tasks" },
  { key: "seasons", label: "Seasons" },
  { key: "costs", label: "Costs & profit" },
] as const;

function sumAmount(rows: { amount: unknown }[]) {
  return rows.reduce((total, row) => total + Number(row.amount ?? 0), 0);
}

export default async function PaddyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Params>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const tab = TABS.some((item) => item.key === query.tab) ? (query.tab as string) : "overview";

  const paddy = await prisma.paddy.findUnique({
    where: { id },
    include: {
      seasons: {
        include: { variety: true },
        orderBy: [{ plantingDate: "desc" }, { createdAt: "desc" }],
      },
      waterLogs: { orderBy: { date: "desc" }, take: 150 },
      operations: { orderBy: { date: "desc" }, take: 120 },
      issues: { orderBy: { date: "desc" }, take: 120 },
      tasks: { orderBy: [{ status: "asc" }, { dueDate: "asc" }], take: 300 },
      expenses: { orderBy: { date: "desc" }, take: 400 },
      incomes: { orderBy: { date: "desc" }, take: 400 },
    },
  });

  if (!paddy) notFound();

  const paddyId = paddy.id;

  const varieties = await prisma.riceVariety.findMany({ orderBy: { name: "asc" } });
  const activeSeason =
    paddy.seasons.find((season) => season.status !== "Harvested" && season.status !== "Failed") ??
    paddy.seasons[0] ??
    null;
  const selectedSeason =
    paddy.seasons.find((season) => season.id === query.season) ?? activeSeason;

  const areaHa = Number(paddy.areaHa);
  const seasonWaterLogs = selectedSeason
    ? paddy.waterLogs.filter((log) => log.seasonId === selectedSeason.id || log.seasonId === null)
    : paddy.waterLogs;
  const latestWater = seasonWaterLogs.find((log) => log.waterDepthCm !== null) ?? null;
  const depth = latestWater?.waterDepthCm ?? null;
  const state = waterState(depth);

  const openIssues = paddy.issues.filter(
    (issue) => !issue.resolved && (!selectedSeason || issue.seasonId === selectedSeason.id || issue.seasonId === null),
  );

  const weather = await getWeather({
    latitude: paddy.latitude,
    longitude: paddy.longitude,
    plantingDate: selectedSeason?.plantingDate ?? null,
  });
  const forecastDays = weather?.forecast.length ? weather.forecast : fallbackForecast(7);

  const forecast = forecastSeason({
    areaHa,
    maturityDays: selectedSeason?.variety?.maturityDays ?? null,
    potentialYieldTha: selectedSeason?.variety ? Number(selectedSeason.variety.potentialYieldTha) : null,
    targetYieldTha: selectedSeason?.targetYieldTha ? Number(selectedSeason.targetYieldTha) : null,
    nRequirementKgHa: selectedSeason?.variety?.nRequirementKgHa ?? null,
    nAppliedKg: selectedSeason?.nAppliedKg ?? null,
    plantingDate: selectedSeason?.plantingDate ?? null,
    expectedHarvestDate: selectedSeason?.expectedHarvestDate ?? null,
    harvestDate: selectedSeason?.harvestDate ?? null,
    method: selectedSeason?.method ?? null,
    irrigationType: paddy.irrigationType,
    water: selectedSeason ? state : "unknown",
    seasonRainMm: weather?.seasonRainMm ?? null,
    openIssues,
    pricePerKg: selectedSeason?.pricePerKg ? Number(selectedSeason.pricePerKg) : null,
  });

  const balance = projectWaterBalance({
    latestDepthCm: depth,
    targetDepthCm: 5,
    forecast: forecastDays.map((day) => ({ date: day.date, rainMm: day.rainMm, et0Mm: day.et0Mm })),
  });

  const seasonExpenses = selectedSeason
    ? paddy.expenses.filter(
        (expense) =>
          expense.seasonId === selectedSeason.id ||
          (expense.seasonId === null &&
            selectedSeason.plantingDate &&
            expense.date >= selectedSeason.plantingDate &&
            (!selectedSeason.harvestDate || expense.date <= selectedSeason.harvestDate)),
      )
    : [];
  const seasonIncomes = selectedSeason
    ? paddy.incomes.filter(
        (income) =>
          income.seasonId === selectedSeason.id ||
          (income.seasonId === null &&
            selectedSeason.plantingDate &&
            income.date >= selectedSeason.plantingDate &&
            (!selectedSeason.harvestDate || income.date <= selectedSeason.harvestDate)),
      )
    : [];

  const seasonCost = sumAmount(seasonExpenses);
  const seasonRevenue = sumAmount(seasonIncomes);
  const seasonNet = seasonRevenue - seasonCost;
  const harvestedKg = selectedSeason?.actualYieldKg ? Number(selectedSeason.actualYieldKg) : null;
  const expectedKg = harvestedKg ?? forecast.forecastKg;
  const costPerKg = expectedKg > 0 ? seasonCost / expectedKg : 0;
  const breakEvenPrice = expectedKg > 0 ? seasonCost / expectedKg : 0;
  const pricePerKg = selectedSeason?.pricePerKg ? Number(selectedSeason.pricePerKg) : 21;
  const projectedRevenue = forecast.forecastKg * pricePerKg;

  const openTasks = paddy.tasks.filter((task) => task.status === "Open");
  const dueTasks = openTasks.slice(0, 5);
  const seasonTasks = selectedSeason
    ? paddy.tasks.filter((task) => task.seasonId === selectedSeason.id || task.seasonId === null)
    : paddy.tasks;
  const seasonOperations = selectedSeason
    ? paddy.operations.filter((op) => op.seasonId === selectedSeason.id || op.seasonId === null)
    : paddy.operations;
  const seasonIssues = selectedSeason
    ? paddy.issues.filter((issue) => issue.seasonId === selectedSeason.id || issue.seasonId === null)
    : paddy.issues;

  const varietyOptions = varieties.map((variety) => ({
    id: variety.id,
    label: `${variety.name} · ${variety.maturityDays} d · ${Number(variety.potentialYieldTha).toFixed(1)} t/ha`,
  }));

  function href(nextTab: string) {
    const search = new URLSearchParams();
    if (nextTab !== "overview") search.set("tab", nextTab);
    if (selectedSeason) search.set("season", selectedSeason.id);
    const queryString = search.toString();
    const path = queryString ? `/paddies/${paddyId}?${queryString}` : `/paddies/${paddyId}`;
    return `${path}#paddy-tabs`;
  }

  return (
    <>
      <Link href="/paddies" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-stone-500 hover:text-stone-800">
        <ArrowLeft className="h-4 w-4" /> All paddies
      </Link>

      <PageHeader
        title={`${paddy.code} · ${paddy.name}`}
        subtitle={`${formatNumber(areaHa, 2)} ha · ${paddy.irrigationType}${paddy.soilType ? ` · ${paddy.soilType}` : ""}${paddy.waterSource ? ` · ${paddy.waterSource}` : ""}`}
        actions={
          <>
            <Badge tone={paddy.status === "Active" ? "green" : "stone"}>{paddy.status}</Badge>
            <FormModal
              action={saveWaterLog}
              title="Log water depth"
              subtitle={`${paddy.code}${selectedSeason ? ` · ${selectedSeason.label}` : ""}`}
              trigger={
                <>
                  <Droplets className="h-4 w-4" /> Log water
                </>
              }
              submitLabel="Save reading"
              wide
            >
              <input type="hidden" name="paddyId" value={paddy.id} />
              {selectedSeason ? <input type="hidden" name="seasonId" value={selectedSeason.id} /> : null}
              <WaterFields />
            </FormModal>
            <FormModal
              action={savePaddy}
              title={`Edit ${paddy.code}`}
              trigger={
                <>
                  <Pencil className="h-4 w-4" /> Edit paddy
                </>
              }
              triggerClass={btn.secondary}
              submitLabel="Save paddy"
              wide
            >
              <input type="hidden" name="id" value={paddy.id} />
              <PaddyFields
                defaults={{
                  code: paddy.code,
                  name: paddy.name,
                  areaHa: Number(paddy.areaHa),
                  lengthM: paddy.lengthM,
                  widthM: paddy.widthM,
                  soilType: paddy.soilType,
                  irrigationType: paddy.irrigationType,
                  waterSource: paddy.waterSource,
                  elevationM: paddy.elevationM,
                  latitude: paddy.latitude,
                  longitude: paddy.longitude,
                  status: paddy.status,
                  notes: paddy.notes,
                }}
              />
            </FormModal>
            <form action={deletePaddy}>
              <input type="hidden" name="id" value={paddy.id} />
              <ConfirmButton
                className={btn.secondary}
                message={`Delete ${paddy.code}? Its seasons, water logs, operations, issues and tasks will be deleted. Linked expenses and income are kept.`}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </ConfirmButton>
            </form>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Growth stage"
          value={selectedSeason ? forecast.stage.label : "Not planted"}
          hint={
            selectedSeason && forecast.daysAfterPlanting !== null
              ? `${forecast.daysAfterPlanting} days after planting · ${forecast.maturityDays} day variety`
              : "Add a season to start tracking"
          }
          icon={<Sprout className="h-5 w-5" />}
          tone="green"
        />
        <StatCard
          label="Forecast yield"
          value={`${formatNumber(forecast.forecastKg / 1000, 2)} t`}
          hint={`${formatNumber(forecast.forecastYieldTha, 2)} t/ha ±${forecast.confidencePct}% · ${formatNumber(forecast.lowKg / 1000, 1)}–${formatNumber(forecast.highKg / 1000, 1)} t`}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          label="Water depth"
          value={depth === null ? "No reading" : `${formatNumber(depth, 1)} cm`}
          hint={WATER_STATE_LABEL[state]}
          icon={<Waves className="h-5 w-5" />}
          tone={state === "critical" || state === "low" ? "red" : "blue"}
        />
        <StatCard
          label="Season net"
          value={formatPeso(seasonNet)}
          hint={`${formatPeso(seasonCost)} cost · ${formatPeso(seasonRevenue)} revenue`}
          icon={<Wallet className="h-5 w-5" />}
          tone={seasonNet >= 0 ? "green" : "red"}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {paddy.seasons.length > 1 ? (
          <form className="flex items-center gap-2">
            <input type="hidden" name="tab" value={tab} />
            <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">Season</label>
            <select name="season" defaultValue={selectedSeason?.id ?? ""} className={`${inputClass} w-auto`}>
              {paddy.seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.label}
                </option>
              ))}
            </select>
            <button type="submit" className={btn.secondary}>
              Switch
            </button>
          </form>
        ) : null}
        {selectedSeason ? (
          <FormModal
            action={saveSeason}
            title="Edit season"
            subtitle={`${paddy.code} · ${selectedSeason.label}`}
            trigger={
              <>
                <Pencil className="h-4 w-4" /> Edit season
              </>
            }
            triggerClass={btn.secondary}
            submitLabel="Save season"
            wide
          >
            <input type="hidden" name="id" value={selectedSeason.id} />
            <input type="hidden" name="paddyId" value={paddy.id} />
            <SeasonFields
              varieties={varietyOptions}
              defaults={{
                label: selectedSeason.label,
                seasonType: selectedSeason.seasonType,
                method: selectedSeason.method,
                status: selectedSeason.status,
                nurseryDate: selectedSeason.nurseryDate,
                plantingDate: selectedSeason.plantingDate,
                expectedHarvestDate: selectedSeason.expectedHarvestDate,
                harvestDate: selectedSeason.harvestDate,
                seedRateKgHa: selectedSeason.seedRateKgHa,
                targetYieldTha: selectedSeason.targetYieldTha ? Number(selectedSeason.targetYieldTha) : null,
                actualYieldKg: selectedSeason.actualYieldKg ? Number(selectedSeason.actualYieldKg) : null,
                grainMoisturePct: selectedSeason.grainMoisturePct,
                pricePerKg: selectedSeason.pricePerKg ? Number(selectedSeason.pricePerKg) : null,
                nAppliedKg: selectedSeason.nAppliedKg,
                pAppliedKg: selectedSeason.pAppliedKg,
                kAppliedKg: selectedSeason.kAppliedKg,
                notes: selectedSeason.notes,
                varietyId: selectedSeason.varietyId,
              }}
            />
          </FormModal>
        ) : null}
        <FormModal
          action={saveSeason}
          title="Add a season"
          subtitle="Planting date + variety drive the forecast and crop calendar."
          trigger={
            <>
              <Plus className="h-4 w-4" /> Add season
            </>
          }
          triggerClass={btn.secondary}
          submitLabel="Save season"
          wide
        >
          <input type="hidden" name="paddyId" value={paddy.id} />
          <SeasonFields varieties={varietyOptions} />
        </FormModal>
        {selectedSeason ? (
          <FormModal
            action={recordHarvest}
            title="Record harvest"
            subtitle="We convert wet weight to 14% moisture so yields stay comparable."
            trigger={
              <>
                <Check className="h-4 w-4" /> Record harvest
              </>
            }
            triggerClass={btn.secondary}
            submitLabel="Save harvest"
          >
            <HarvestFields seasonId={selectedSeason.id} />
          </FormModal>
        ) : null}
      </div>

      <div id="paddy-tabs" className="mt-6 flex scroll-mt-28 gap-1 overflow-x-auto border-b border-stone-200 pb-px">
        {TABS.map((item) => (
          <Link
            key={item.key}
            href={href(item.key)}
            className={`shrink-0 rounded-t-lg px-3 py-2 text-sm font-semibold transition ${
              tab === item.key
                ? "border-b-2 border-emerald-600 text-emerald-700"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">Yield forecast</h2>
                {selectedSeason ? (
                  <Badge tone="green">±{forecast.confidencePct}% confidence</Badge>
                ) : null}
              </div>
              {!selectedSeason ? (
                <EmptyState title="No season yet" description="Add a season with a planting date and variety to forecast yield." />
              ) : (
                <>
                  <div className="flex flex-wrap items-end gap-6">
                    <div>
                      <p className="text-3xl font-bold tracking-tight text-stone-900">
                        {formatNumber(forecast.forecastKg / 1000, 2)} t
                      </p>
                      <p className="text-sm text-stone-500">
                        {formatNumber(forecast.forecastYieldTha, 2)} t/ha · range{" "}
                        {formatNumber(forecast.lowKg / 1000, 1)}–{formatNumber(forecast.highKg / 1000, 1)} t
                      </p>
                    </div>
                    <div className="text-sm text-stone-600">
                      <p>
                        Harvest around <span className="font-semibold">{formatDate(forecast.harvestDate)}</span>
                      </p>
                      <p className="text-stone-500">
                        {forecast.daysToHarvest !== null
                          ? `${Math.max(0, forecast.daysToHarvest)} days to go`
                          : "Add a planting date for a harvest estimate"}
                      </p>
                    </div>
                    <div className="min-w-[180px] flex-1">
                      <div className="mb-1 flex justify-between text-xs text-stone-500">
                        <span>{forecast.stage.label}</span>
                        <span>{Math.round(forecast.progress * 100)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-stone-200">
                        <div
                          className="h-2 rounded-full bg-emerald-600"
                          style={{ width: `${Math.min(100, Math.round(forecast.progress * 100))}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 space-y-2">
                    {forecast.factors.map((factor) => (
                      <div key={factor.label} className="rounded-lg bg-stone-50 px-3 py-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold text-stone-700">{factor.label}</span>
                          <span className="font-mono text-stone-900">×{factor.value.toFixed(2)}</span>
                        </div>
                        <p className="text-xs text-stone-500">{factor.detail}</p>
                      </div>
                    ))}
                  </div>

                  {forecast.warnings.length ? (
                    <ul className="mt-4 space-y-1">
                      {forecast.warnings.map((warning) => (
                        <li key={warning} className="flex items-start gap-2 text-xs text-amber-800">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {warning}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              )}
            </Card>

            <Card className="p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">Water advice</h2>
              <p className="mt-3 text-2xl font-bold text-stone-900">
                {balance.daysUntilCritical === null
                  ? "No shortfall"
                  : balance.daysUntilCritical === 0
                    ? "Irrigate now"
                    : `${balance.daysUntilCritical} day${balance.daysUntilCritical === 1 ? "" : "s"} to critical`}
              </p>
              <p className="mt-1 text-sm text-stone-500">
                Projected depth {formatNumber(balance.projectedDepthCm, 1)} cm after 10 days of rain and ET.
              </p>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-stone-500">Irrigation to reach 5 cm</dt>
                  <dd className="font-semibold text-stone-900">{Math.round(balance.irrigationNeededMm)} mm</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-500">Forecast rain</dt>
                  <dd className="font-semibold text-stone-900">{Math.round(balance.totalRainMm)} mm</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-500">Forecast ET</dt>
                  <dd className="font-semibold text-stone-900">{Math.round(balance.totalEtMm)} mm</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-500">Season rainfall so far</dt>
                  <dd className="font-semibold text-stone-900">
                    {weather?.seasonRainMm === null || weather?.seasonRainMm === undefined
                      ? "—"
                      : `${Math.round(weather.seasonRainMm)} mm`}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-xs text-stone-400">
                Water balance = depth + rain + irrigation − ET − seepage. 10 mm = 1 cm.
              </p>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">10-day field forecast</h2>
                <p className="text-xs text-stone-500">
                  {paddy.latitude !== null ? "Paddy coordinates" : "Add paddy coordinates for accuracy"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {forecastDays.slice(0, 10).map((day) => {
                  const spray = sprayWindow(day);
                  return (
                    <div key={day.date} className="rounded-lg border border-stone-200 px-2.5 py-2">
                      <p className="text-xs font-semibold text-stone-500">
                        {formatDate(new Date(`${day.date}T12:00:00`))}
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-stone-900">{weatherText(day.code)}</p>
                      <p className="text-xs text-stone-500">{Math.round(day.rainMm)} mm rain</p>
                      <p className={`mt-1 text-[11px] font-semibold ${spray.suitable ? "text-emerald-600" : "text-amber-600"}`}>
                        {spray.suitable ? "Spray OK" : spray.reason}
                      </p>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">Due tasks</h2>
                <Link href={href("tasks")} className="text-xs font-semibold text-emerald-700 hover:underline">
                  All tasks
                </Link>
              </div>
              {dueTasks.length === 0 ? (
                <EmptyState title="No open tasks" description="Generate the crop calendar from the Tasks tab." />
              ) : (
                <ul className="mt-3 divide-y divide-stone-100">
                  {dueTasks.map((task) => (
                    <li key={task.id} className="flex items-start justify-between gap-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-stone-900">{task.title}</p>
                        <p className="text-xs text-stone-500">
                          {formatDate(task.dueDate)} · {task.type}
                        </p>
                      </div>
                      <Badge tone={task.priority === "Urgent" || task.priority === "High" ? "red" : "stone"}>
                        {task.priority}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">Paddy profile</h2>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-stone-500">Area</dt>
                  <dd className="font-semibold text-stone-900">{formatNumber(areaHa, 2)} ha</dd>
                </div>
                <div>
                  <dt className="text-stone-500">Area in m²</dt>
                  <dd className="font-semibold text-stone-900">{formatNumber(areaHa * 10_000, 0)} m²</dd>
                </div>
                <div>
                  <dt className="text-stone-500">Dimensions</dt>
                  <dd className="font-semibold text-stone-900">
                    {paddy.lengthM && paddy.widthM
                      ? `${formatNumber(paddy.lengthM, 0)} × ${formatNumber(paddy.widthM, 0)} m`
                      : "Not measured"}
                  </dd>
                </div>
                <div>
                  <dt className="text-stone-500">Elevation</dt>
                  <dd className="font-semibold text-stone-900">
                    {paddy.elevationM === null ? "—" : `${formatNumber(paddy.elevationM, 0)} m`}
                  </dd>
                </div>
                <div>
                  <dt className="text-stone-500">Coordinates</dt>
                  <dd className="font-semibold text-stone-900">
                    {paddy.latitude === null || paddy.longitude === null
                      ? "Not set"
                      : `${paddy.latitude.toFixed(4)}, ${paddy.longitude.toFixed(4)}`}
                  </dd>
                </div>
                <div>
                  <dt className="text-stone-500">Soil</dt>
                  <dd className="font-semibold text-stone-900">{paddy.soilType ?? "—"}</dd>
                </div>
              </dl>
              {paddy.notes ? <p className="mt-3 text-sm text-stone-600">{paddy.notes}</p> : null}
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">Open field issues</h2>
                <Link href={href("issues")} className="text-xs font-semibold text-emerald-700 hover:underline">
                  Manage
                </Link>
              </div>
              {openIssues.length === 0 ? (
                <EmptyState title="No open issues" description="Log pests, disease, weeds or nutrient problems as you scout." />
              ) : (
                <ul className="mt-3 divide-y divide-stone-100">
                  {openIssues.slice(0, 5).map((issue) => (
                    <li key={issue.id} className="flex items-center justify-between gap-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-stone-900">{issue.name}</p>
                        <p className="text-xs text-stone-500">
                          {issue.type} · severity {issue.severity}/5 · {formatDate(issue.date)}
                        </p>
                      </div>
                      <Badge tone={issue.severity >= 4 ? "red" : issue.severity >= 3 ? "amber" : "stone"}>
                        {issue.severity}/5
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      ) : null}

      {tab === "water" ? (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Latest depth" value={depth === null ? "—" : `${formatNumber(depth, 1)} cm`} hint={WATER_STATE_LABEL[state]} icon={<Ruler className="h-5 w-5" />} />
            <StatCard label="Irrigation needed" value={`${Math.round(balance.irrigationNeededMm)} mm`} hint="To reach a 5 cm target" icon={<Droplets className="h-5 w-5" />} tone="blue" />
            <StatCard label="Days to critical" value={balance.daysUntilCritical === null ? "None in 10 d" : String(balance.daysUntilCritical)} hint="Using the 10-day forecast" icon={<Activity className="h-5 w-5" />} tone={balance.daysUntilCritical !== null && balance.daysUntilCritical <= 2 ? "red" : "green"} />
          </div>

          <Card className="p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">Water log</h2>
            <p className="mt-1 text-xs text-stone-500">
              Record a depth reading with a ruler or marked stake. Add irrigation and rain in millimetres.
            </p>
            {seasonWaterLogs.length === 0 ? (
              <EmptyState title="No water readings" description="Log the first depth to activate irrigation advice." />
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-stone-200">
                  <thead className="bg-stone-50">
                    <tr>
                      <th className={thClass}>Date</th>
                      <th className={thClass}>Depth</th>
                      <th className={thClass}>Irrigation</th>
                      <th className={thClass}>Rain</th>
                      <th className={thClass}>Drainage</th>
                      <th className={thClass}>Note</th>
                      <th className={thClass} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {seasonWaterLogs.slice(0, 30).map((log) => (
                      <tr key={log.id}>
                        <td className={tdClass}>{formatDate(log.date)}</td>
                        <td className={tdClass}>{log.waterDepthCm === null ? "—" : `${formatNumber(log.waterDepthCm, 1)} cm`}</td>
                        <td className={tdClass}>{formatNumber(log.irrigationMm, 0)} mm</td>
                        <td className={tdClass}>{formatNumber(log.rainfallMm, 0)} mm</td>
                        <td className={tdClass}>{formatNumber(log.drainageMm, 0)} mm</td>
                        <td className={tdClass}>{log.note ?? "—"}</td>
                        <td className={tdClass}>
                          <form action={deleteWaterLog}>
                            <input type="hidden" name="id" value={log.id} />
                            <ConfirmButton className={btn.ghost} message="Delete this water log?">
                              <Trash2 className="h-3.5 w-3.5" />
                            </ConfirmButton>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      ) : null}

      {tab === "operations" ? (
        <div className="mt-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-stone-500">
              {seasonOperations.length} operation{seasonOperations.length === 1 ? "" : "s"} recorded
              {selectedSeason ? ` for ${selectedSeason.label}` : ""}.
            </p>
            <FormModal
              action={saveOperation}
              title="Record field operation"
              subtitle={`${paddy.code}${selectedSeason ? ` · ${selectedSeason.label}` : ""}`}
              trigger={
                <>
                  <Plus className="h-4 w-4" /> Add operation
                </>
              }
              submitLabel="Save operation"
              wide
            >
              <input type="hidden" name="paddyId" value={paddy.id} />
              {selectedSeason ? <input type="hidden" name="seasonId" value={selectedSeason.id} /> : null}
              <OperationFields />
            </FormModal>
          </div>

          {seasonOperations.length === 0 ? (
            <Card>
              <EmptyState title="No operations yet" description="Record land preparation, fertilizer, spraying, weeding and harvest." />
            </Card>
          ) : (
            <Card>
              <ul className="divide-y divide-stone-100">
                {seasonOperations.map((op) => (
                  <li key={op.id} className="flex items-start justify-between gap-4 px-5 py-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                        <Sprout className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-stone-900">{op.description}</p>
                        <p className="text-xs text-stone-500">
                          {formatDate(op.date)} · {op.type}
                          {op.quantity ? ` · ${formatNumber(op.quantity)} ${op.unit ?? ""}` : ""}
                          {op.cost ? ` · ${formatPeso(op.cost)}` : ""}
                        </p>
                        {op.notes ? <p className="text-xs text-stone-400">{op.notes}</p> : null}
                      </div>
                    </div>
                    <form action={deleteOperation}>
                      <input type="hidden" name="id" value={op.id} />
                      <ConfirmButton className={btn.ghost} message="Delete this operation?">
                        <Trash2 className="h-3.5 w-3.5" />
                      </ConfirmButton>
                    </form>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      ) : null}

      {tab === "issues" ? (
        <div className="mt-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-stone-500">Scout at least weekly and log what you see. Open issues reduce the yield forecast.</p>
            <FormModal
              action={saveIssue}
              title="Log pest or disease"
              subtitle={`${paddy.code}${selectedSeason ? ` · ${selectedSeason.label}` : ""}`}
              trigger={
                <>
                  <Plus className="h-4 w-4" /> Add issue
                </>
              }
              submitLabel="Save issue"
              wide
            >
              <input type="hidden" name="paddyId" value={paddy.id} />
              {selectedSeason ? <input type="hidden" name="seasonId" value={selectedSeason.id} /> : null}
              <IssueFields />
            </FormModal>
          </div>

          {seasonIssues.length === 0 ? (
            <Card>
              <EmptyState title="No pest or disease records" description="Good news — or start scouting. Log anything that could cut yield." />
            </Card>
          ) : (
            <div className="space-y-3">
              {seasonIssues.map((issue) => (
                <Card key={issue.id} className={`p-4 ${issue.resolved ? "opacity-70" : ""}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-stone-900">{issue.name}</p>
                        <Badge tone={issue.type === "Pest" ? "amber" : issue.type === "Disease" ? "red" : "stone"}>
                          {issue.type}
                        </Badge>
                        {issue.resolved ? <Badge tone="green">Resolved</Badge> : null}
                        <Badge tone={issue.severity >= 4 ? "red" : issue.severity >= 3 ? "amber" : "stone"}>
                          Severity {issue.severity}/5
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-stone-500">
                        {formatDate(issue.date)}
                        {issue.affectedPct !== null ? ` · ${formatNumber(issue.affectedPct, 0)}% of area` : ""}
                      </p>
                      {issue.treatment ? (
                        <p className="mt-1 text-sm text-stone-600">Treatment: {issue.treatment}</p>
                      ) : null}
                      {issue.notes ? <p className="text-xs text-stone-400">{issue.notes}</p> : null}
                    </div>
                    <div className="flex items-center gap-1">
                      {!issue.resolved ? (
                        <form action={resolveIssue}>
                          <input type="hidden" name="id" value={issue.id} />
                          <button type="submit" className={btn.secondary}>
                            <Check className="h-3.5 w-3.5" /> Resolve
                          </button>
                        </form>
                      ) : null}
                      <form action={deleteIssue}>
                        <input type="hidden" name="id" value={issue.id} />
                        <ConfirmButton className={btn.ghost} message="Delete this issue record?">
                          <Trash2 className="h-3.5 w-3.5" />
                        </ConfirmButton>
                      </form>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {tab === "tasks" ? (
        <div className="mt-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-stone-500">
              {openTasks.length} open task{openTasks.length === 1 ? "" : "s"} for this paddy.
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedSeason ? (
                <form action={generateSeasonTasks}>
                  <input type="hidden" name="seasonId" value={selectedSeason.id} />
                  <button type="submit" className={btn.secondary}>
                    <CalendarClock className="h-4 w-4" /> Generate crop calendar
                  </button>
                </form>
              ) : null}
              <FormModal
                action={saveTask}
                title="Add task"
                trigger={
                  <>
                    <Plus className="h-4 w-4" /> Add task
                  </>
                }
                submitLabel="Save task"
              >
                <input type="hidden" name="paddyId" value={paddy.id} />
                {selectedSeason ? <input type="hidden" name="seasonId" value={selectedSeason.id} /> : null}
                <TaskFields />
              </FormModal>
            </div>
          </div>

          {seasonTasks.length === 0 ? (
            <Card>
              <EmptyState title="No tasks yet" description="Generate a rice crop calendar from the planting date, or add a custom task." />
            </Card>
          ) : (
            <div className="space-y-6">
              <TaskGroup title="Open" tasks={seasonTasks.filter((task) => task.status === "Open")} />
              <TaskGroup title="Closed" tasks={seasonTasks.filter((task) => task.status !== "Open")} />
            </div>
          )}
        </div>
      ) : null}

      {tab === "seasons" ? (
        <div className="mt-6">
          {paddy.seasons.length === 0 ? (
            <Card>
              <EmptyState title="No seasons yet" description="Add a season to record variety, dates, inputs and yield." />
            </Card>
          ) : (
            <TableShell>
              <table className="min-w-full divide-y divide-stone-200">
                <thead className="bg-stone-50">
                  <tr>
                    <th className={thClass}>Season</th>
                    <th className={thClass}>Variety</th>
                    <th className={thClass}>Planted</th>
                    <th className={thClass}>Harvest</th>
                    <th className={thClass}>Yield</th>
                    <th className={thClass}>Status</th>
                    <th className={thClass} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {paddy.seasons.map((season) => {
                    const kg = season.actualYieldKg ? Number(season.actualYieldKg) : null;
                    return (
                      <tr key={season.id} className="hover:bg-stone-50">
                        <td className={tdClass}>
                          <Link href={`/paddies/${paddy.id}?season=${season.id}#paddy-tabs`} className="font-semibold text-stone-900 hover:text-emerald-700">
                            {season.label}
                          </Link>
                          <p className="text-xs text-stone-500">
                            {season.seasonType} · {season.method}
                          </p>
                        </td>
                        <td className={tdClass}>{season.variety?.name ?? "—"}</td>
                        <td className={tdClass}>{formatDate(season.plantingDate)}</td>
                        <td className={tdClass}>{formatDate(season.harvestDate)}</td>
                        <td className={tdClass}>
                          {kg === null ? (
                            "—"
                          ) : (
                            <>
                              <p className="font-semibold text-stone-900">{formatNumber(kg / 1000, 2)} t</p>
                              <p className="text-xs text-stone-500">
                                {formatNumber(kg / 1000 / areaHa, 2)} t/ha
                              </p>
                            </>
                          )}
                        </td>
                        <td className={tdClass}>
                          <Badge tone={season.status === "Harvested" ? "green" : season.status === "Failed" ? "red" : "amber"}>
                            {season.status}
                          </Badge>
                        </td>
                        <td className={tdClass}>
                          <form action={deleteSeason}>
                            <input type="hidden" name="id" value={season.id} />
                            <ConfirmButton className={btn.ghost} message="Delete this season? Linked logs keep their paddy but lose the season link.">
                              <Trash2 className="h-3.5 w-3.5" />
                            </ConfirmButton>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableShell>
          )}
        </div>
      ) : null}

      {tab === "costs" ? (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Season cost" value={formatPeso(seasonCost)} hint={`${seasonExpenses.length} expense(s)`} icon={<Receipt className="h-5 w-5" />} tone="red" />
            <StatCard label="Season revenue" value={formatPeso(seasonRevenue)} hint={`${seasonIncomes.length} income record(s)`} icon={<TrendingUp className="h-5 w-5" />} tone="green" />
            <StatCard label="Cost per kg" value={formatPeso(costPerKg)} hint={`Break-even ${formatPeso(breakEvenPrice)}/kg`} icon={<Wallet className="h-5 w-5" />} tone="amber" />
            <StatCard label="Projected revenue" value={formatPeso(projectedRevenue)} hint={`At ${formatPeso(pricePerKg)}/kg for ${formatNumber(forecast.forecastKg / 1000, 2)} t`} icon={<TrendingUp className="h-5 w-5" />} tone={projectedRevenue > seasonCost ? "green" : "red"} />
          </div>

          <Card className="p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">Season profitability</h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg bg-stone-50 p-3">
                <dt className="text-stone-500">Net so far</dt>
                <dd className={`mt-1 text-lg font-bold ${seasonNet >= 0 ? "text-emerald-700" : "text-red-600"}`}>{formatPeso(seasonNet)}</dd>
              </div>
              <div className="rounded-lg bg-stone-50 p-3">
                <dt className="text-stone-500">Harvested</dt>
                <dd className="mt-1 text-lg font-bold text-stone-900">{harvestedKg === null ? "Not yet" : `${formatNumber(harvestedKg, 0)} kg`}</dd>
              </div>
              <div className="rounded-lg bg-stone-50 p-3">
                <dt className="text-stone-500">Forecast yield</dt>
                <dd className="mt-1 text-lg font-bold text-stone-900">{formatNumber(forecast.forecastKg, 0)} kg</dd>
              </div>
              <div className="rounded-lg bg-stone-50 p-3">
                <dt className="text-stone-500">Projected net</dt>
                <dd className={`mt-1 text-lg font-bold ${projectedRevenue - seasonCost >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                  {formatPeso(projectedRevenue - seasonCost)}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-stone-400">
              Expenses and income are counted when linked to this season, or dated inside the season when unlinked.
              Projected revenue uses the season price and the mid-point yield forecast.
            </p>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <div className="border-b border-stone-100 px-5 py-4">
                <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">Expenses</h2>
              </div>
              {seasonExpenses.length === 0 ? (
                <EmptyState title="No expenses linked" description="Add expenses and choose this paddy or season." />
              ) : (
                <ul className="max-h-96 divide-y divide-stone-100 overflow-y-auto">
                  {seasonExpenses.map((expense) => (
                    <li key={expense.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-stone-900">{expense.description}</p>
                        <p className="text-xs text-stone-500">{formatDate(expense.date)} · {expense.category}</p>
                      </div>
                      <span className="text-sm font-semibold text-red-600">{formatPeso(expense.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <div className="border-b border-stone-100 px-5 py-4">
                <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">Income</h2>
              </div>
              {seasonIncomes.length === 0 ? (
                <EmptyState title="No income linked" description="Record a harvest with income, or link an income entry." />
              ) : (
                <ul className="max-h-96 divide-y divide-stone-100 overflow-y-auto">
                  {seasonIncomes.map((income) => (
                    <li key={income.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-stone-900">{income.description}</p>
                        <p className="text-xs text-stone-500">{formatDate(income.date)} · {income.category}</p>
                      </div>
                      <span className="text-sm font-semibold text-emerald-600">{formatPeso(income.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      ) : null}
    </>
  );
}

function TaskGroup({
  title,
  tasks,
}: {
  title: string;
  tasks: {
    id: string;
    title: string;
    type: string;
    dueDate: Date;
    priority: string;
    status: string;
    notes: string | null;
  }[];
}) {
  if (tasks.length === 0) return null;
  return (
    <Card>
      <div className="border-b border-stone-100 px-5 py-3">
        <h3 className="text-sm font-bold uppercase tracking-wide text-stone-500">{title}</h3>
      </div>
      <ul className="divide-y divide-stone-100">
        {tasks.map((task) => (
          <li key={task.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div className="flex items-start gap-3">
              <span
                className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                  task.status === "Done" ? "bg-emerald-500" : task.status === "Skipped" ? "bg-stone-300" : "bg-amber-500"
                }`}
              />
              <div>
                <p className={`text-sm font-medium ${task.status === "Open" ? "text-stone-900" : "text-stone-500 line-through"}`}>
                  {task.title}
                </p>
                <p className="text-xs text-stone-500">
                  {formatDate(task.dueDate)} · {task.type} · {task.priority}
                </p>
                {task.notes ? <p className="text-xs text-stone-400">{task.notes}</p> : null}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {task.status !== "Done" ? (
                <form action={setTaskStatus}>
                  <input type="hidden" name="id" value={task.id} />
                  <input type="hidden" name="status" value="Done" />
                  <button type="submit" className={btn.ghost}>
                    <Check className="h-3.5 w-3.5" /> Done
                  </button>
                </form>
              ) : null}
              {task.status === "Open" ? (
                <form action={setTaskStatus}>
                  <input type="hidden" name="id" value={task.id} />
                  <input type="hidden" name="status" value="Skipped" />
                  <button type="submit" className={btn.ghost}>
                    Skip
                  </button>
                </form>
              ) : null}
              <form action={deleteTask}>
                <input type="hidden" name="id" value={task.id} />
                <ConfirmButton className={btn.ghost} message="Delete this task?">
                  <Trash2 className="h-3.5 w-3.5" />
                </ConfirmButton>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
