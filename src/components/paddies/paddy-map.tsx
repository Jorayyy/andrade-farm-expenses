import Link from "next/link";
import type { WaterState } from "@/lib/agronomy";

export type MapPaddy = {
  id: string;
  code: string;
  name: string;
  areaHa: number;
  lengthM: number | null;
  widthM: number | null;
  stage: string;
  water: WaterState;
  fallow: boolean;
};

const fill: Record<string, string> = {
  critical: "#fecaca",
  low: "#fde68a",
  optimal: "#a7f3d0",
  excess: "#bfdbfe",
  unknown: "#e7e5e4",
};

const stroke: Record<string, string> = {
  critical: "#dc2626",
  low: "#d97706",
  optimal: "#059669",
  excess: "#2563eb",
  unknown: "#a8a29e",
};

/**
 * Proportional field map. It is a layout aid, not a survey: blocks are sized by
 * area and shaped by recorded length/width, then packed into rows.
 */
export function PaddyMap({ paddies }: { paddies: MapPaddy[] }) {
  if (paddies.length === 0) return null;

  const sorted = [...paddies].sort((a, b) => b.areaHa - a.areaHa);
  const maxSide = Math.max(...sorted.map((paddy) => Math.sqrt(paddy.areaHa)), 0.1);
  const gap = 10;
  const rows: { item: MapPaddy; x: number; y: number; w: number; h: number }[] = [];

  let x = gap;
  let y = gap;
  let rowHeight = 0;
  const maxWidth = 960;

  for (const paddy of sorted) {
    const side = 40 + (Math.sqrt(paddy.areaHa) / maxSide) * 150;
    const ratio = paddy.lengthM && paddy.widthM ? paddy.widthM / paddy.lengthM : 0.72;
    const w = side;
    const h = Math.max(52, Math.min(230, side * ratio));
    if (x + w + gap > maxWidth) {
      x = gap;
      y += rowHeight + gap;
      rowHeight = 0;
    }
    rows.push({ item: paddy, x, y, w, h });
    rowHeight = Math.max(rowHeight, h);
    x += w + gap;
  }

  const height = y + rowHeight + gap;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${maxWidth} ${height}`} className="h-auto w-full min-w-[560px]" role="img" aria-label="Paddy map">
        {rows.map(({ item, x: px, y: py, w, h }) => (
          <Link key={item.id} href={`/paddies/${item.id}`}>
            <g className="cursor-pointer">
              <rect
                x={px}
                y={py}
                width={w}
                height={h}
                rx={6}
                fill={item.fallow ? "#f5f5f4" : fill[item.water]}
                stroke={item.fallow ? "#a8a29e" : stroke[item.water]}
                strokeWidth={2}
                strokeDasharray={item.fallow ? "6 4" : undefined}
              />
              <text x={px + 8} y={py + 20} className="fill-stone-800" fontSize={13} fontWeight={700}>
                {item.code}
              </text>
              <text x={px + 8} y={py + 37} className="fill-stone-600" fontSize={11}>
                {item.areaHa.toFixed(2)} ha
              </text>
              {h > 58 ? (
                <text x={px + 8} y={py + 54} className="fill-stone-500" fontSize={10}>
                  {item.fallow ? "Fallow" : item.stage}
                </text>
              ) : null}
            </g>
          </Link>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-stone-500">
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-200 ring-1 ring-emerald-600" /> Optimal water
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-200 ring-1 ring-amber-600" /> Low
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-red-200 ring-1 ring-red-600" /> Critical
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-blue-200 ring-1 ring-blue-600" /> Excess
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-stone-100 ring-1 ring-stone-400" /> No reading / fallow
        </span>
      </div>
    </div>
  );
}
