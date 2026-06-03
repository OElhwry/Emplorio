'use client';

/**
 * The floating Emplorio shapes from the landing page, as a static (CSS-animated)
 * background for the app and auth pages. Reuses the global .ambient / .orb /
 * .shape / .dot styles. No pointer parallax here, just the autonomous drift.
 */

type ShapeCfg = {
  leftPct: number;
  topPct: number;
  size: number;
  br: number | string;
  dx: number;
  dy: number;
  rot: number;
  dur: number;
  delay: number;
};

const SHAPES: ShapeCfg[] = [
  { leftPct: 6, topPct: 10, size: 200, br: 26, dx: 60, dy: 40, rot: -8, dur: 52, delay: -3 },
  { leftPct: 88, topPct: 22, size: 130, br: 38, dx: -70, dy: 50, rot: 14, dur: 68, delay: -19 },
  { leftPct: 14, topPct: 78, size: 240, br: '50%', dx: 50, dy: -60, rot: 0, dur: 78, delay: -34 },
  { leftPct: 76, topPct: 64, size: 100, br: 22, dx: -55, dy: -45, rot: 22, dur: 44, delay: -8 },
  { leftPct: 92, topPct: 86, size: 160, br: 42, dx: 45, dy: -70, rot: -16, dur: 60, delay: -27 },
  { leftPct: 46, topPct: 52, size: 80, br: '50%', dx: 80, dy: 35, rot: 0, dur: 38, delay: -12 },
  { leftPct: 32, topPct: 30, size: 110, br: 32, dx: -40, dy: 65, rot: 10, dur: 72, delay: -45 },
];

export function AmbientShapes() {
  return (
    <div className="ambient" aria-hidden="true">
      <div className="parallax parallax-far">
        <span className="dot dot-1" />
        <span className="dot dot-2" />
        <span className="dot dot-3" />
        <span className="dot dot-4" />
        <span className="dot dot-5" />
      </div>
      <div className="parallax parallax-mid">
        <span className="orb orb-1" />
        <span className="orb orb-2" />
        <span className="orb orb-3" />
      </div>
      <div className="parallax parallax-near">
        {SHAPES.map((s, i) => (
          <span
            key={i}
            className="shape-wrap"
            style={{ left: `${s.leftPct}%`, top: `${s.topPct}%`, width: s.size, height: s.size }}
          >
            <span
              className="shape"
              style={{
                borderRadius: typeof s.br === 'number' ? `${s.br}px` : s.br,
                animationDuration: `${s.dur}s`,
                animationDelay: `${s.delay}s`,
                ['--dx' as string]: `${s.dx}px`,
                ['--dy' as string]: `${s.dy}px`,
                ['--rot0' as string]: `${s.rot}deg`,
              }}
            />
          </span>
        ))}
      </div>
    </div>
  );
}
