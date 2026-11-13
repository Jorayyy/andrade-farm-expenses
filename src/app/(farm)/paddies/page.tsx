import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  ChevronRight,
  Droplets,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  TrendingUp,
  Waves,
} from "lucide-react";
import { FormModal } from "@/components/paddies/form-modal";
import { PaddyFields, SeasonFields } from "@/components/paddies/fields";
import { PaddyMap, type MapPaddy } from "@/components/paddies/paddy-map";
import { ConfirmButton } from "@/components/modal";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  StatCard,
  TableShell,
  btn,
  tdClass,
  thClass,
} from "@/components/ui";
import { deletePaddy, savePaddy, saveSeason } from "@/app/paddy-actions";
import { forecastSeason, waterState, WATER_STATE_LABEL } from "@/lib/agronomy";
import { formatDate, formatNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getWeather, weatherText } from "@/lib/weather";
import { IRRIGATION_TYPES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function PaddiesPage() {
  const paddies = await prisma.paddy.findMany({
    orderBy: { code: "asc" },
    include: {
      seasons: { include: { variety: true }, orderBy: [{ plantingDate: "desc" }, { createdAt: "desc" }] },
    },
  });

  const paddyIds = paddies.map((paddy) => paddy.id);
  const [waterLogs, openIssues, varieties] = await Promise.all([
    paddyIds.length
      ? prisma.waterLog.findMany({
          where: { paddyId: { in: paddyIds } },
          orderBy: { date: "desc" },
          take: 400,
        })
      : Promise.resolve([]),
    paddyIds.length
      ? prisma.fieldIssue.findMany({
          where: { paddyId: { in: paddyIds }, resolved: false },
          select: { paddyId: true, seasonId: true, severity: true, affectedPct: true },
        })
      : Promise.resolve([]),
    prisma.riceVariety.findMany({ orderBy: { name: "asc" } }),
  ]);

  const latestWater = new Map<string, number | null>();
  for (const log of waterLogs) {
    if (!latestWater.has(log.paddyId) && log.waterDepthCm !== null) {
      latestWater.set(log.paddyId, log.waterDepthCm);
    }
  }

  const geo = paddies.find((paddy) => paddy.latitude !== null && paddy.longitude !== null);
  const currentSeasons = paddies.map((paddy) => paddy.seasons.find((s) => s.status !== "Harvested" && s.status !== "Failed") ?? paddy.seasons[0] ?? null);
  const weather = await getWeather({
    latitude: geo?.latitude ?? null,
    longitude: geo?.longitude ?? null,
    plantingDate: currentSeasons.find((s) => s?.plantingDate)?.plantingDate ?? null,
  });

  const rows = paddies.map((paddy, index) => {
    const season = currentSeasons[index];
    const depth = latestWater.get(paddy.id) ?? null;
    const state = waterState(depth);
    const issues = openIssues.filter((issue) => issue.paddyId === paddy.id);
    const forecast = forecastSeason({
      areaHa: Number(paddy.areaHa),
      maturityDays: season?.variety?.maturityDays ?? null,
      potentialYieldTha: season?.variety ? Number(season.variety.potentialYieldTha) : null,
      targetYieldTha: season?.targetYieldTha ? Number(season.targetYieldTha) : null,
      nRequirementKgHa: season?.variety?.nRequirementKgHa ?? null,
      nAppliedKg: season?.nAppliedKg ?? null,
      plantingDate: season?.plantingDate ?? null,
      expectedHarvestDate: season?.expectedHarvestDate ?? null,
      harvestDate: season?.harvestDate ?? null,
      method: season?.method ?? null,
      irrigationType: paddy.irrigationType,
      water: season ? state : "unknown",
      seasonRainMm: weather?.seasonRainMm ?? null,
      openIssues: issues,
      pricePerKg: season?.pricePerKg ? Number(season.pricePerKg) : null,
    });
    return { paddy, season, depth, state, forecast };
  });

  const activeRows = rows.filter((row) => row.season && row.paddy.status === "Active");
  const totalArea = rows.reduce((sum, row) => sum + Number(row.paddy.areaHa), 0);
  const plantedArea = activeRows.reduce((sum, row) => sum + Number(row.paddy.areaHa), 0);
  const forecastKg = activeRows.reduce((sum, row) => sum + row.forecast.forecastKg, 0);
  const waterAlerts = rows.filter((row) => row.state === "critical" || row.state === "low").length;
  const avgYield = plantedArea > 0 ? forecastKg / 1000 / plantedArea : 0;

  const mapPaddies: MapPaddy[] = rows.map(({ paddy, season, state, forecast }) => ({
    id: paddy.id,
    code: paddy.code,
    name: paddy.name,
    areaHa: Number(paddy.areaHa),
    lengthM: paddy.lengthM,
    widthM: paddy.widthM,
    stage: season ? forecast.stage.label : "No season",
    water: state,
    fallow: paddy.status !== "Active" || !season,
  }));

  const varietyOptions = varieties.map((variety) => ({
    id: variety.id,
    label: `${variety.name} Â· ${variety.maturityDays} d`,
  }));
  const paddyOptions = paddies.map((paddy) => ({ id: paddy.id, label: `${paddy.code} â€” ${paddy.name}` }));

  return (
    <>
      <PageHeader
        title="Rice paddies"
        subtitle={`${formatNumber(totalArea, 2)} ha across ${paddies.length} paddy${paddies.length === 1 ? "" : "s"} Â· ${formatNumber(plantedArea, 2)} ha planted`}
        actions={
          <>
            <Link href="/planner" className={btn.secondary}>
              <CalendarClock className="h-4 w-4" /> Planner
            </Link>
            <FormModal
              action={savePaddy}
              title="Add a paddy"
              subtitle="Measure the field once; the system handles the rest."
              trigger={
                <>
                  <Plus className="h-4 w-4" /> Add paddy
                </>
              }
              submitLabel="Add paddy"
              wide
            >
              <PaddyFields />
            </FormModal>
          </>
        }
      />

      {paddies.length === 0 ? (
        <Card>
          <EmptyState
            title="No paddies yet"
            description="Add your first rice paddy with its area and irrigation type. Weather, water advice and yield forecasts start working immediately."
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total paddy area"
              value={`${formatNumber(totalArea, 2)} ha`}
              hint={`${paddies.length} paddies`}
              icon={<Waves className="h-5 w-5" />}
              tone="blue"
            />
            <StatCard
              label="Forecast harvest"
              value={`${formatNumber(forecastKg / 1000, 2)} t`}
              hint={`${formatNumber(avgYield, 2)} t/ha average`}
              icon={<TrendingUp className="h-5 w-5" />}
              tone="green"
            />
            <StatCard
              label="Water alerts"
              value={String(waterAlerts)}
              hint={waterAlerts ? "Paddies below 5 cm" : "All logged paddies are above 5 cm"}
              icon={<Droplets className="h-5 w-5" />}
              tone={waterAlerts ? "red" : "green"}
            />
            <StatCard
              label="Planted area"
              value={`${formatNumber(plantedArea, 2)} ha`}
              hint={totalArea ? `${Math.round((plantedArea / totalArea) * 100)}% of the farm` : "â€”"}
              icon={<MapPin className="h-5 w-5" />}
              tone="amber"
            />
          </div>

          {weather ? (
            <Card className="mt-6 p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">
                  Field weather Â· next 5 days
                </h2>
                <p className="text-xs text-stone-500">
                  {weather.isDefaultLocation
                    ? "Add coordinates to a paddy for a local forecast"
                    : `${weather.location.latitude.toFixed(3)}, ${weather.location.longitude.toFixed(3)}`}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {weather.forecast.slice(0, 5).map((day) => (
                  <div key={day.date} className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
                    <p className="text-xs font-semibold text-stone-500">
                      {formatDate(new Date(`${day.date}T12:00:00`))}
                    </p>
                    <p className="mt-1 text-sm font-bold text-stone-900">{weatherText(day.code)}</p>
                    <p className="text-xs text-stone-500">
                      {Math.round(day.tempMin)}â€“{Math.round(day.tempMax)}Â°C Â· {Math.round(day.rainMm)} mm rain
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          <Card className="mt-6 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">Field map</h2>
              <p className="text-xs text-stone-500">Block size follows recorded area; colour follows water status.</p>
            </div>
            <PaddyMap paddies={mapPaddies} />
          </Card>

          <div className="mt-6">
            <TableShell>
              <table className="min-w-full divide-y divide-stone-200">
                <thead className="bg-stone-50">
                  <tr>
                    <th className={thClass}>Paddy</th>
                    <th className={thClass}>Area</th>
                    <th className={thClass}>Season</th>
                    <th className={thClass}>Stage</th>
                    <th className={thClass}>Water</th>
                    <th className={thClass}>Forecast</th>
                    <th className={thClass}>Harvest</th>
                    <th className={thClass} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {rows.map(({ paddy, season, depth, state, forecast }) => (
                    <tr key={paddy.id} className="hover:bg-stone-50">
                      <td className={tdClass}>
                        <Link href={`/paddies/${paddy.id}`} className="font-semibold text-stone-900 hover:text-emerald-700">
                          {paddy.code}
                        </Link>
                        <p className="text-xs text-stone-500">{paddy.name}</p>
                      </td>
                      <td className={tdClass}>{formatNumber(paddy.areaHa, 2)} ha</td>
                      <td className={tdClass}>
                        {season ? (
                          <>
                            <p className="font-medium text-stone-800">{season.label}</p>
                            <p className="text-xs text-stone-500">
                              {season.variety?.name ?? "No variety"} Â· {season.method}
                            </p>
                          </>
                        ) : (
                          <span className="text-stone-400">Not planted</span>
                        )}
                      </td>
                      <td className={tdClass}>
                        {season ? (
                          <Badge tone={forecast.stage.key === "mature" ? "amber" : "green"}>
                            {forecast.stage.label}
                          </Badge>
                        ) : (
                          <Badge tone="stone">â€”</Badge>
                        )}
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
                        {season ? (
                          <>
                            <p className="font-semibold text-stone-900">
                              {formatNumber(forecast.forecastKg / 1000, 2)} t
                            </p>
                            <p className="text-xs text-stone-500">
                              {formatNumber(forecast.forecastYieldTha, 2)} t/ha Â±{forecast.confidencePct}%
                            </p>
                          </>
                        ) : (
                          <span className="text-stone-400">â€”</span>
                        )}
                      </td>
                      <td className={tdClass}>
                        {forecast.harvestDate ? formatDate(forecast.harvestDate) : <span className="text-stone-400">â€”</span>}
                      </td>
                      <td className={tdClass}>
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/paddies/${paddy.id}`} className={btn.ghost}>
                            Open <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                          <FormModal
                            action={savePaddy}
                            title={`Edit ${paddy.code}`}
                            trigger={
                              <>
                                <Pencil className="h-3.5 w-3.5" /> Edit
                              </>
                            }
                            triggerClass={btn.ghost}
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
                              className={btn.ghost}
                              message={`Delete ${paddy.code}? Seasons, water logs and tasks for this paddy will also be deleted. Linked expenses and income will be kept.`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </ConfirmButton>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableShell>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <FormModal
              action={saveSeason}
              title="Start a season"
              subtitle="Planting date + variety drive the forecast and crop calendar."
              trigger={
                <>
                  <Plus className="h-4 w-4" /> Add season
                </>
              }
              submitLabel="Save season"
              wide
            >
              <SeasonFields varieties={varietyOptions} showPaddy paddies={paddyOptions} />
            </FormModal>
            <p className="text-xs text-stone-500">
              Tip: set length and width on each paddy to see a proportional field map.
            </p>
          </div>

          {waterAlerts > 0 ? (
            <Card className="mt-6 border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    {waterAlerts} {waterAlerts === 1 ? "paddy needs" : "paddies need"} water attention
                  </p>
                  <p className="mt-1 text-sm text-amber-800">
                    {rows
                      .filter((row) => row.state === "critical" || row.state === "low")
                      .map((row) => `${row.paddy.code} (${WATER_STATE_LABEL[row.state]})`)
                      .join(" Â· ")}
                  </p>
                </div>
              </div>
            </Card>
          ) : null}

          <p className="mt-6 text-xs text-stone-400">
            Irrigation types on file: {IRRIGATION_TYPES.join(", ")}. Forecasts are decision aids based on the
            variety reference, water logs, nitrogen records and open pest issues.
          </p>
        </>
      )}
    </>
  );
}
