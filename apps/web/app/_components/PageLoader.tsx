'use client';

import * as React from 'react';
import { SpiralLoader, type SpiralTone } from './SpiralLoader';

export type PageLoaderProps = {
  /** Optional text shown next to the spiral. Omitted by default (icon only). */
  label?: React.ReactNode;
  /** Spiral size in px. Defaults to 48. */
  size?: number;
  /** Loader colour. Defaults to `auto` (follows the theme). */
  tone?: SpiralTone;
  /**
   * Center the loader in the available space (both axes) instead of sitting
   * inline. Defaults to true. Set false for an inline indicator.
   */
  center?: boolean;
  /** Min height of the centered area. Defaults to "60vh". */
  minHeight?: number | string;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Loading indicator (spiral + label) for page/section level waits.
 * Use for any "Loading…" placeholder across the app. Centered by default.
 */
export function PageLoader({
  label,
  size = 48,
  tone = 'auto',
  center = true,
  minHeight = '60vh',
  className,
  style,
}: PageLoaderProps) {
  const inner = (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.6rem',
        color: 'var(--text-muted)',
      }}
    >
      <SpiralLoader size={size} tone={tone} />
      {label != null && <span>{label}</span>}
    </div>
  );

  if (!center) {
    return (
      <div className={className} style={style}>
        {inner}
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        minHeight,
        ...style,
      }}
    >
      {inner}
    </div>
  );
}
