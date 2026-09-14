'use client';

// Roza FM Suite — Sparkline (mini trend chart for KPI cards)
import { useMemo } from 'react';

interface Props {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  className?: string;
}

export function Sparkline({ data, color = 'var(--erp-accent)', width = 80, height = 24, className }: Props) {
  const gradientId = useMemo(() => `spark-${Math.random().toString(36).slice(2, 8)}`, []);

  const path = useMemo(() => {
    if (!data || data.length === 0) return '';
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const stepX = width / Math.max(data.length - 1, 1);
    return data.map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, [data, width, height]);

  const areaPath = useMemo(() => {
    if (!data || data.length === 0 || !path) return '';
    const last = data.length - 1;
    const stepX = width / Math.max(last, 1);
    const lastX = last * stepX;
    return `${path} L${lastX.toFixed(1)},${height} L0,${height} Z`;
  }, [path, data, width, height]);

  if (!data || data.length < 2) return null;

  const last = data[data.length - 1];
  const min = Math.min(...data, 0);
  const max = Math.max(...data, 1);
  const range = max - min || 1;
  const lastY = height - ((last - min) / range) * (height - 4) - 2;

  return (
    <svg width={width} height={height} className={className} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />}
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={width} cy={lastY} r="2" fill={color} />
    </svg>
  );
}
