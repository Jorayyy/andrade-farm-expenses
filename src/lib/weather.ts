/**
 * Weather from Open-Meteo (free, no API key). Used for the 10-day field
 * forecast, seasonal rainfall totals and growing-degree-day tracking.
 */

export const DEFAULT_FARM_LAT = Number(process.env.FARM_LAT ?? 15.486);
export const DEFAULT_FARM_LNG = Number(process.env.FARM_LNG ?? 120.973);

export type DailyWeather = {
  date: string;
  tempMax: number;
  tempMin: number;
  rainMm: number;
  et0Mm: number;
  humidity: number | null;
  code: number | null;
};

export type WeatherBundle = {
  daily: DailyWeather[];
  /** Forecast only (today onwards). */
  forecast: DailyWeather[];
  /** Archive only (planting date up to the archive lag). */
  history: DailyWeather[];
  gddToDate: number | null;
  seasonRainMm: number | null;
  seasonEtMm: number | null;
  location: { latitude: number; longitude: number };
  isDefaultLocation: boolean;
};

type OpenMeteoResponse = {
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_sum?: number[];
    et0_fao_evapotranspiration?: number[];
    relative_humidity_2m_mean?: number[];
    weather_code?: number[];
  };
};

const ARCHIVE_LAG_DAYS = 5;
const FORECAST_DAYS = 10;

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function shiftDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function rowsFrom(payload: OpenMeteoResponse): DailyWeather[] {
  const daily = payload.daily;
  if (!daily?.time) return [];
  return daily.time.map((date, index) => ({
    date,
    tempMax: daily.temperature_2m_max?.[index] ?? 30,
    tempMin: daily.temperature_2m_min?.[index] ?? 24,
    rainMm: daily.precipitation_sum?.[index] ?? 0,
    et0Mm: daily.et0_fao_evapotranspiration?.[index] ?? 4.5,
    humidity: daily.relative_humidity_2m_mean?.[index] ?? null,
    code: daily.weather_code?.[index] ?? null,
  }));
}

async function fetchJson(url: string): Promise<OpenMeteoResponse | null> {
  try {
    const response = await fetch(url, {
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) return null;
    return (await response.json()) as OpenMeteoResponse;
  } catch {
    return null;
  }
}

export async function getWeather({
  latitude = DEFAULT_FARM_LAT,
  longitude = DEFAULT_FARM_LNG,
  plantingDate,
}: {
  latitude?: number | null;
  longitude?: number | null;
  plantingDate?: Date | null;
} = {}): Promise<WeatherBundle | null> {
  const lat = latitude ?? DEFAULT_FARM_LAT;
  const lng = longitude ?? DEFAULT_FARM_LNG;
  const today = new Date();
  const archiveEnd = shiftDays(today, -ARCHIVE_LAG_DAYS);
  const start = plantingDate && isoDate(plantingDate) < isoDate(archiveEnd) ? plantingDate : null;

  const forecastUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,et0_fao_evapotranspiration,relative_humidity_2m_mean,weather_code` +
    `&timezone=Asia%2FManila&forecast_days=${FORECAST_DAYS}`;

  const archiveUrl = start
    ? `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}` +
      `&start_date=${isoDate(start)}&end_date=${isoDate(archiveEnd)}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,et0_fao_evapotranspiration` +
      `&timezone=Asia%2FManila`
    : null;

  const [forecastPayload, archivePayload] = await Promise.all([
    fetchJson(forecastUrl),
    archiveUrl ? fetchJson(archiveUrl) : Promise.resolve(null),
  ]);

  if (!forecastPayload && !archivePayload) return null;

  const forecast = rowsFrom(forecastPayload ?? {});
  const history = rowsFrom(archivePayload ?? {});
  const daily = [...history, ...forecast];

  const gddToDate = history.length
    ? history.reduce((total, day) => total + Math.max(0, Math.min(30, (day.tempMax + day.tempMin) / 2) - 10), 0)
    : null;
  const seasonRainMm = history.length ? history.reduce((total, day) => total + day.rainMm, 0) : null;
  const seasonEtMm = history.length ? history.reduce((total, day) => total + day.et0Mm, 0) : null;

  return {
    daily,
    forecast,
    history,
    gddToDate,
    seasonRainMm,
    seasonEtMm,
    location: { latitude: lat, longitude: lng },
    isDefaultLocation: latitude === null || longitude === null,
  };
}

/** Fallback forecast so water advice still works when the network is down. */
export function fallbackForecast(days = 7): DailyWeather[] {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return {
      date: isoDate(date),
      tempMax: 31,
      tempMin: 24,
      rainMm: 4,
      et0Mm: 4.5,
      humidity: 80,
      code: 2,
    };
  });
}

const WEATHER_TEXT: Record<number, string> = {
  0: "Clear",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  80: "Rain showers",
  81: "Rain showers",
  82: "Heavy showers",
  95: "Thunderstorm",
  96: "Thunderstorm",
  99: "Thunderstorm",
};

export function weatherText(code: number | null) {
  if (code === null) return "—";
  return WEATHER_TEXT[code] ?? "Mixed";
}

/** Spraying is unwise when rain is likely or wind is high. */
export function sprayWindow(day: DailyWeather) {
  if (day.rainMm >= 5) return { suitable: false, reason: "Rain likely" };
  if (day.code !== null && day.code >= 95) return { suitable: false, reason: "Thunderstorm" };
  return { suitable: true, reason: "Good window" };
}
