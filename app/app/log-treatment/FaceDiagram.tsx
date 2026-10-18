"use client";

import { useState } from "react";
import { FACE_AREAS, faceAreaLabel } from "@/lib/faceAreas";
import { sage, stone, line as lineColor } from "../../theme";

type RegionShape = { slug: string; cx: number; cy: number; rx: number; ry: number };

const REGIONS: RegionShape[] = [
  { slug: "forehead", cx: 120, cy: 72, rx: 55, ry: 26 },
  { slug: "glabella", cx: 120, cy: 110, rx: 9, ry: 9 },
  { slug: "crows_feet_left", cx: 68, cy: 120, rx: 13, ry: 11 },
  { slug: "crows_feet_right", cx: 172, cy: 120, rx: 13, ry: 11 },
  { slug: "cheek_left", cx: 63, cy: 165, rx: 20, ry: 22 },
  { slug: "cheek_right", cx: 177, cy: 165, rx: 20, ry: 22 },
  { slug: "nasolabial_folds", cx: 120, cy: 190, rx: 48, ry: 13 },
  { slug: "lips", cx: 120, cy: 206, rx: 21, ry: 9 },
  { slug: "chin", cx: 120, cy: 236, rx: 23, ry: 17 },
  { slug: "jawline_left", cx: 55, cy: 212, rx: 15, ry: 28 },
  { slug: "jawline_right", cx: 185, cy: 212, rx: 15, ry: 28 },
];

export default function FaceDiagram({
  activeSlugs,
  onSelect,
}: {
  activeSlugs: string[];
  onSelect: (slug: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const active = new Set(activeSlugs);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <svg
        viewBox="0 0 240 300"
        width={200}
        height={250}
        role="group"
        aria-label="Face diagram — click a region to add an amount there"
      >
        <ellipse cx={120} cy={150} rx={88} ry={132} fill="#fbf8f3" stroke={lineColor} strokeWidth={1.5} />
        <ellipse cx={85} cy={112} rx={12} ry={7} fill="none" stroke={lineColor} strokeWidth={1.5} />
        <ellipse cx={155} cy={112} rx={12} ry={7} fill="none" stroke={lineColor} strokeWidth={1.5} />
        <path d="M 120 130 L 115 165 L 125 165 Z" fill="none" stroke={lineColor} strokeWidth={1.5} />

        {REGIONS.map((r) => {
          const isActive = active.has(r.slug);
          const isHovered = hovered === r.slug;
          return (
            <ellipse
              key={r.slug}
              cx={r.cx}
              cy={r.cy}
              rx={r.rx}
              ry={r.ry}
              fill={isActive ? sage : isHovered ? "rgba(124,152,133,0.25)" : "rgba(124,152,133,0.08)"}
              stroke={isActive ? sage : "rgba(124,152,133,0.4)"}
              strokeWidth={isActive ? 1.5 : 1}
              style={{ cursor: "pointer", transition: "fill 0.15s ease" }}
              role="button"
              tabIndex={0}
              aria-label={faceAreaLabel(r.slug)}
              onClick={() => onSelect(r.slug)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(r.slug);
                }
              }}
              onMouseEnter={() => setHovered(r.slug)}
              onMouseLeave={() => setHovered(null)}
            >
              <title>{faceAreaLabel(r.slug)}</title>
            </ellipse>
          );
        })}
      </svg>
      <div style={{ fontSize: 12.5, color: stone, minHeight: 18 }}>
        {hovered ? faceAreaLabel(hovered) : "Click a region to add an amount"}
      </div>
    </div>
  );
}

export { FACE_AREAS };
