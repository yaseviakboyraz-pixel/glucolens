"use client";
import { getT, type Lang } from "@/lib/i18n";

// Sentinel id for the "+N" collapse node. It is not a real food item —
// the caller decides what selecting it means (e.g. highlight all remaining rows).
export const REST_NODE_ID = "__rest__";

export interface OrbitalItem {
  id: string;
  gl: number;
  confidence: number;
}

interface Props {
  items: OrbitalItem[];
  totalGl: number;
  // Read from the API payload. NEVER recomputed here — claude-vision.ts is the
  // single source of truth for risk banding (<10 low, <=20 medium, else high).
  risk: "low" | "medium" | "high";
  lang: Lang;
  kicker?: string;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
}

const TEAL = "#2DD4BF";
const PURPLE = "#8B5CF6";
const BRIGHT = "#6FE8D8";
const CANVAS = "#0A0810";
const CX = 195;
const CY = 205;
const RINGS = [70, 112, 152];
const START = [90, 200, 115];
const MAX_NODES = 6;
const GL_RADIUS_CAP = 18;
const MIN_HIT_R = 22;

// Arabic is cursive — letter-spacing severs the joins. Every other shipped
// locale tolerates the spec's 0.24em tracking.
const NO_TRACKING = new Set(["ar"]);

type OrbitNode = {
  id: string;
  gl: number;
  confidence: number;
  aggregate: number;
  x: number;
  y: number;
};

function layout(items: OrbitalItem[]): OrbitNode[] {
  const sorted = [...items].sort((a, b) => b.gl - a.gl);
  const visible = sorted.slice(0, MAX_NODES);
  const rest = sorted.slice(MAX_NODES);

  const nodes: OrbitNode[] = visible.map((i) => ({
    id: i.id,
    gl: i.gl,
    confidence: i.confidence,
    aggregate: 0,
    x: 0,
    y: 0,
  }));

  if (rest.length) {
    nodes.push({
      id: REST_NODE_ID,
      gl: rest.reduce((s, i) => s + i.gl, 0),
      confidence: 1,
      aggregate: rest.length,
      x: 0,
      y: 0,
    });
  }

  // Gravity metaphor: biggest contributor on the tightest ring. 1 / 2 / rest
  // reproduces the handoff's five-item reference exactly. The aggregate is
  // pushed last, so it always lands on the outermost ring.
  const groups = [nodes.slice(0, 1), nodes.slice(1, 3), nodes.slice(3)];
  groups.forEach((grp, ri) => {
    const step = 360 / Math.max(grp.length, 1);
    grp.forEach((n, i) => {
      const rad = ((START[ri] + i * step) * Math.PI) / 180;
      n.x = CX + RINGS[ri] * Math.cos(rad);
      n.y = CY + RINGS[ri] * Math.sin(rad);
    });
  });

  return nodes;
}

// Ids that fall outside the visible orbit and collapse into the "+N" node.
// Exported so the caller can highlight the whole remainder when that node is
// tapped, without duplicating the MAX_NODES threshold.
export function collapsedIds(items: OrbitalItem[]): Set<string> {
  return new Set(
    [...items].sort((a, b) => b.gl - a.gl).slice(MAX_NODES).map((i) => i.id)
  );
}

export function OrbitalHero({
  items,
  totalGl,
  risk,
  lang,
  kicker,
  selectedId = null,
  onSelect,
}: Props) {
  const tx = getT(lang);
  const nodes = layout(items);
  const tracking = NO_TRACKING.has(lang) ? "0" : "0.24em";
  const kickerText = kicker ?? "GLYCEMIC LOAD";
  // Russian ("Гликемическая нагрузка") and German run ~70% longer than the
  // English reference. Full 0.24em tracking pushes them past the inner orbit
  // and into the nodes, so long labels get tightened rather than clipped.
  const kickerTracking = NO_TRACKING.has(lang)
    ? "0"
    : kickerText.length > 16 ? "0.10em" : "0.24em";
  const riskLabel =
    risk === "low" ? tx.low_risk : risk === "medium" ? tx.medium_risk : tx.high_risk;

  const toggle = (id: string) => onSelect?.(selectedId === id ? null : id);

  return (
    <div className="relative mx-auto w-full max-w-[390px]">
      <style>{`
@keyframes oh-halo{0%,100%{transform:scale(1);opacity:.8}50%{transform:scale(1.06);opacity:1}}
@keyframes oh-cw{to{transform:rotate(360deg)}}
@keyframes oh-ccw{to{transform:rotate(-360deg)}}
.oh-halo{animation:oh-halo 3.5s ease-in-out infinite;transform-origin:${CX}px ${CY}px}
.oh-c1{animation:oh-cw 26s linear infinite;transform-origin:${CX}px ${CY}px}
.oh-c2{animation:oh-ccw 44s linear infinite;transform-origin:${CX}px ${CY}px}
.oh-num{font-family:var(--font-space-grotesk),ui-sans-serif,system-ui,sans-serif;font-variant-numeric:tabular-nums}
.oh-hit{fill:transparent;cursor:pointer}
@media(prefers-reduced-motion:reduce){.oh-halo,.oh-c1,.oh-c2{animation:none}}
`}</style>

      <svg viewBox="0 0 390 412" className="w-full" role="img" aria-label={`${Math.round(totalGl)} ${riskLabel}`}>
        <defs>
          <radialGradient id="oh-glow">
            <stop offset="0%" stopColor={TEAL} stopOpacity="0.28" />
            <stop offset="60%" stopColor={PURPLE} stopOpacity="0.14" />
            <stop offset="100%" stopColor={PURPLE} stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle className="oh-halo" cx={CX} cy={CY} r={100} fill="url(#oh-glow)" />
        <circle cx={CX} cy={CY} r={RINGS[0]} fill="none" stroke="#fff" strokeOpacity="0.10" />
        <circle cx={CX} cy={CY} r={RINGS[1]} fill="none" stroke="#fff" strokeOpacity="0.08" strokeDasharray="1 6" />
        <circle cx={CX} cy={CY} r={RINGS[2]} fill="none" stroke="#fff" strokeOpacity="0.06" strokeDasharray="1 6" />

        <g className="oh-c1">
          <circle cx={CX} cy={CY - RINGS[2]} r={7} fill={TEAL} fillOpacity="0.25" />
          <circle cx={CX} cy={CY - RINGS[2]} r={3} fill={TEAL} />
        </g>
        <g className="oh-c2">
          <circle cx={CX + RINGS[2]} cy={CY} r={6} fill={PURPLE} fillOpacity="0.25" />
          <circle cx={CX + RINGS[2]} cy={CY} r={2.5} fill={PURPLE} />
        </g>

        {nodes.map((n) => {
          const on = selectedId === n.id;
          const nodeR = n.aggregate ? 14 : 9 + Math.min(n.gl, GL_RADIUS_CAP);
          const accent = n.aggregate
            ? "rgba(255,255,255,0.28)"
            : n.gl >= 3
            ? PURPLE
            : TEAL;
          const haloOpacity = n.aggregate ? 0.1 : n.gl >= 3 ? 0.22 : 0.18;
          return (
            <g key={n.id}>
              <circle cx={n.x} cy={n.y} r={nodeR + 7} fill={accent} fillOpacity={haloOpacity} />
              <circle
                cx={n.x}
                cy={n.y}
                r={nodeR}
                fill={CANVAS}
                stroke={on ? BRIGHT : accent}
                strokeWidth={on ? 3 : 1.5}
                strokeDasharray={n.confidence < 0.75 ? "3 3" : undefined}
              />
              <text
                className="oh-num"
                x={n.x}
                y={n.y + 4}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="#fff"
                pointerEvents="none"
              >
                {n.aggregate ? `+${n.aggregate}` : Math.round(n.gl)}
              </text>
              <circle
                className="oh-hit"
                cx={n.x}
                cy={n.y}
                r={Math.max(MIN_HIT_R, nodeR)}
                onClick={() => toggle(n.id)}
              />
            </g>
          );
        })}
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div style={{
          fontSize: 11,
          letterSpacing: kickerTracking,
          textTransform: "uppercase",
          color: "rgba(234,230,248,0.5)",
        }}>
          {kickerText}
        </div>
        <div
          className="oh-num"
          style={{
            fontSize: 64,
            fontWeight: 500,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            color: "#FDFCFF",
            marginTop: 4,
            textShadow: "0 0 36px rgba(45,212,191,0.4)",
          }}
        >
          {Math.round(totalGl)}
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: tracking,
            textTransform: "uppercase",
            marginTop: 6,
            backgroundImage: `linear-gradient(90deg, ${TEAL}, ${PURPLE})`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {riskLabel}
        </div>
      </div>
    </div>
  );
}
