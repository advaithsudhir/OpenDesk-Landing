"use client";

import { useState } from "react";
import { faceAreaLabel } from "@/lib/faceAreas";
import styles from "./log.module.css";

// Front-facing illustration, viewer looking at the patient. Left/right are
// the patient's, so the patient's right side is drawn on the viewer's left.

type Shape =
  | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number; rotate?: number }
  | { kind: "path"; d: string };

const ZONES: { slug: string; shapes: Shape[] }[] = [
  {
    slug: "forehead",
    shapes: [
      {
        kind: "path",
        d: "M84 130 C88 106 112 96 150 96 C188 96 212 106 216 130 C200 125 176 123 150 123 C124 123 100 125 84 130 Z",
      },
    ],
  },
  { slug: "glabella", shapes: [{ kind: "ellipse", cx: 150, cy: 147, rx: 11, ry: 13 }] },
  { slug: "crows_feet_right", shapes: [{ kind: "ellipse", cx: 84, cy: 168, rx: 10, ry: 14 }] },
  { slug: "crows_feet_left", shapes: [{ kind: "ellipse", cx: 216, cy: 168, rx: 10, ry: 14 }] },
  { slug: "cheek_right", shapes: [{ kind: "ellipse", cx: 104, cy: 206, rx: 24, ry: 20 }] },
  { slug: "cheek_left", shapes: [{ kind: "ellipse", cx: 196, cy: 206, rx: 24, ry: 20 }] },
  {
    slug: "nasolabial_folds",
    shapes: [
      { kind: "ellipse", cx: 123, cy: 248, rx: 7, ry: 21, rotate: 18 },
      { kind: "ellipse", cx: 177, cy: 248, rx: 7, ry: 21, rotate: -18 },
    ],
  },
  { slug: "lips", shapes: [{ kind: "ellipse", cx: 150, cy: 270, rx: 32, ry: 15 }] },
  { slug: "chin", shapes: [{ kind: "ellipse", cx: 150, cy: 306, rx: 23, ry: 13 }] },
  { slug: "jawline_right", shapes: [{ kind: "ellipse", cx: 104, cy: 279, rx: 7, ry: 25, rotate: -36 }] },
  { slug: "jawline_left", shapes: [{ kind: "ellipse", cx: 196, cy: 279, rx: 7, ry: 25, rotate: 36 }] },
];

const SKIN = "#f2e4d8";
const SKIN_SHADE = "#e3cdbc";
const OUTLINE = "#9a8574";
const FEATURE = "#6f5c4f";
const HAIR = "#6b5545";

function renderShape(shape: Shape, key: number) {
  if (shape.kind === "path") return <path key={key} d={shape.d} />;
  return (
    <ellipse
      key={key}
      cx={shape.cx}
      cy={shape.cy}
      rx={shape.rx}
      ry={shape.ry}
      transform={shape.rotate ? `rotate(${shape.rotate} ${shape.cx} ${shape.cy})` : undefined}
    />
  );
}

export default function FaceDiagram({
  activeSlugs,
  onSelect,
}: {
  activeSlugs: string[];
  onSelect: (slug: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [lastTapped, setLastTapped] = useState<string | null>(null);
  const active = new Set(activeSlugs);
  const caption = hovered ?? lastTapped;

  const select = (slug: string) => {
    setLastTapped(slug);
    onSelect(slug);
  };

  return (
    <div className={styles.faceWrap}>
      <svg
        viewBox="0 0 300 400"
        className={styles.faceSvg}
        role="group"
        aria-label="Face diagram — tap an area to add a line for it"
      >
        {/* Shoulders and neck */}
        <path d="M44 400 C60 376 92 366 118 362 L182 362 C208 366 240 376 256 400 Z" fill={SKIN_SHADE} />
        <path d="M120 312 L117 366 C130 374 170 374 183 366 L180 312 Z" fill={SKIN} stroke={OUTLINE} strokeWidth={1.2} />

        {/* Ears */}
        <path d="M68 176 C53 170 46 196 52 214 C56 226 64 231 71 226 Z" fill={SKIN} stroke={OUTLINE} strokeWidth={1.2} />
        <path d="M232 176 C247 170 254 196 248 214 C244 226 236 231 229 226 Z" fill={SKIN} stroke={OUTLINE} strokeWidth={1.2} />

        {/* Face */}
        <path
          d="M150 48 C100 48 68 84 66 140 C64 175 66 205 72 232 C80 268 100 298 126 318 C136 326 143 330 150 330 C157 330 164 326 174 318 C200 298 220 268 228 232 C234 205 236 175 234 140 C232 84 200 48 150 48 Z"
          fill={SKIN}
          stroke={OUTLINE}
          strokeWidth={1.5}
        />

        {/* Temples and jaw shading */}
        <ellipse cx={80} cy={150} rx={8} ry={18} fill={SKIN_SHADE} opacity={0.45} />
        <ellipse cx={220} cy={150} rx={8} ry={18} fill={SKIN_SHADE} opacity={0.45} />
        <path d="M82 258 C94 286 110 306 130 320" fill="none" stroke={SKIN_SHADE} strokeWidth={6} strokeLinecap="round" />
        <path d="M218 258 C206 286 190 306 170 320" fill="none" stroke={SKIN_SHADE} strokeWidth={6} strokeLinecap="round" />

        {/* Hair */}
        <path
          d="M64 152 C56 82 98 34 150 34 C202 34 244 82 236 152 C230 120 214 100 190 93 C172 88 160 91 150 91 C140 91 128 88 110 93 C86 100 70 120 64 152 Z"
          fill={HAIR}
        />

        {/* Eyebrows */}
        <path d="M92 147 Q110 135 134 143" fill="none" stroke={HAIR} strokeWidth={4} strokeLinecap="round" />
        <path d="M166 143 Q190 135 208 147" fill="none" stroke={HAIR} strokeWidth={4} strokeLinecap="round" />

        {/* Eyes */}
        <path d="M96 167 Q113 155 131 167 Q113 176 96 167 Z" fill="#fff" stroke={FEATURE} strokeWidth={1.3} />
        <circle cx={113.5} cy={166} r={5.5} fill="#7a6a5c" />
        <circle cx={113.5} cy={166} r={2.2} fill="#2c2520" />
        <path d="M169 167 Q187 155 204 167 Q187 176 169 167 Z" fill="#fff" stroke={FEATURE} strokeWidth={1.3} />
        <circle cx={186.5} cy={166} r={5.5} fill="#7a6a5c" />
        <circle cx={186.5} cy={166} r={2.2} fill="#2c2520" />

        {/* Nose */}
        <path d="M143 164 C141 186 137 203 134 214" fill="none" stroke={FEATURE} strokeWidth={1.1} opacity={0.55} />
        <path d="M157 164 C159 186 163 203 166 214" fill="none" stroke={FEATURE} strokeWidth={1.1} opacity={0.55} />
        <path d="M132 216 C133 226 141 229 146 224" fill="none" stroke={FEATURE} strokeWidth={1.4} strokeLinecap="round" />
        <path d="M168 216 C167 226 159 229 154 224" fill="none" stroke={FEATURE} strokeWidth={1.4} strokeLinecap="round" />
        <path d="M144 227 Q150 231 156 227" fill="none" stroke={FEATURE} strokeWidth={1.2} strokeLinecap="round" />

        {/* Nasolabial lines */}
        <path d="M131 229 C121 241 117 257 120 272" fill="none" stroke={FEATURE} strokeWidth={1} opacity={0.35} />
        <path d="M169 229 C179 241 183 257 180 272" fill="none" stroke={FEATURE} strokeWidth={1} opacity={0.35} />

        {/* Lips */}
        <path
          d="M124 265 C132 259 140 255 146 258 C148 259 152 259 154 258 C160 255 168 259 176 265 C162 267 138 267 124 265 Z"
          fill="#cf948f"
        />
        <path d="M124 265 C138 268 162 268 176 265 C168 279 158 285 150 285 C142 285 132 279 124 265 Z" fill="#dba8a3" />
        <path d="M124 265 C138 267 162 267 176 265" fill="none" stroke="#a96f6a" strokeWidth={1.1} />

        {/* Chin */}
        <path d="M138 303 Q150 308 162 303" fill="none" stroke={FEATURE} strokeWidth={1} opacity={0.4} />

        {/* Patient's right / left */}
        <text x={22} y={204} className={styles.faceSide}>R</text>
        <text x={270} y={204} className={styles.faceSide}>L</text>

        {/* Clickable zones, drawn as light overlays on the illustration */}
        {ZONES.map((zone) => {
          const label = faceAreaLabel(zone.slug);
          const isActive = active.has(zone.slug);
          return (
            <g
              key={zone.slug}
              className={`${styles.faceZone} ${isActive ? styles.faceZoneActive : ""}`}
              role="button"
              tabIndex={0}
              aria-label={label}
              aria-pressed={isActive}
              onClick={() => select(zone.slug)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  select(zone.slug);
                }
              }}
              onMouseEnter={() => setHovered(zone.slug)}
              onMouseLeave={() => setHovered(null)}
            >
              <title>{label}</title>
              {zone.shapes.map(renderShape)}
            </g>
          );
        })}
      </svg>
      <div className={styles.faceCaption}>
        {caption ? faceAreaLabel(caption) : "Tap an area to add a line for it"}
      </div>
      <div className={styles.faceNote}>Left and right are the patient&apos;s.</div>
    </div>
  );
}
