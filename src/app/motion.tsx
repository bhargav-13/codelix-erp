import React, { useEffect, useRef, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Eases a number from 0 (or its previous value) to `target`. */
export function useCountUp(target: number, ms = 1100) {
  const [v, setV] = useState(reduced() ? target : 0);
  const from = useRef(0);
  useEffect(() => {
    if (reduced()) { setV(target); return; }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      setV(a + (target - a) * e);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

export const CountUp: React.FC<{ value: number; format: (n: number) => string; ms?: number }> = ({ value, format, ms }) => {
  const v = useCountUp(value, ms);
  return <>{format(v)}</>;
};

/** Staggered fade-and-rise on mount. */
export const Rise: React.FC<{ delay?: number; className?: string; children: React.ReactNode }> = ({ delay = 0, className, children }) => (
  <div className={`rise ${className ?? ''}`} style={{ animationDelay: `${delay}ms` }}>{children}</div>
);

/** Progress ring that sweeps to `pct` on mount. */
export const Ring: React.FC<{ pct: number; size?: number; stroke?: number; color?: string; children?: React.ReactNode }> = ({
  pct, size = 120, stroke = 10, color = 'var(--accent)', children,
}) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [shown, setShown] = useState(reduced() ? pct : 0);
  useEffect(() => { const t = setTimeout(() => setShown(pct), 80); return () => clearTimeout(t); }, [pct]);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, shown / 100)))}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.2,.7,.2,1)' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
};

/** Bar that grows from the left; `pct` is 0–100. */
export const Meter: React.FC<{ pct: number; color?: string; delay?: number; className?: string }> = ({ pct, color = 'var(--accent)', delay = 0, className }) => (
  <div className={`h-2 overflow-hidden rounded-full bg-muted ${className ?? ''}`}>
    <div className="grow-x h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, pct))}%`, background: color, animationDelay: `${delay}ms` }} />
  </div>
);

export const Spark: React.FC<{ data: number[]; color?: string; id: string }> = ({ data, color = 'var(--accent)', id }) => (
  <div className="h-10 w-full">
    <ResponsiveContainer>
      <AreaChart data={data.map((v, i) => ({ i, v }))} margin={{ top: 2, bottom: 0, left: 0, right: 0 }}>
        <defs>
          <linearGradient id={`sp-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#sp-${id})`} isAnimationActive animationDuration={1200} />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

export const LiveDot: React.FC<{ color?: string }> = ({ color = '#10b981' }) => (
  <span className="relative inline-flex h-2.5 w-2.5">
    <span className="live-ping absolute inline-flex h-full w-full rounded-full" style={{ background: color }} />
    <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: color }} />
  </span>
);
