'use client';

import * as React from 'react';
import { SpiralLoader, type SpiralTone } from './SpiralLoader';

export type LoadingButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** When true, shows the spiral loader and disables the button. */
  loading?: boolean;
  /** Optional label to show while loading. Falls back to the normal children. */
  loadingText?: React.ReactNode;
  /** Size of the spiral, in px. Defaults to 16. */
  loaderSize?: number;
  /**
   * Loader colour. Defaults to `light` (white), which suits accent / dark
   * buttons. Use `dark` on light surfaces, or `auto` to follow the theme.
   */
  loaderTone?: SpiralTone;
};

/**
 * Drop-in replacement for `<button>` that shows the app's spiral loader while a
 * task is running. Use this for any in-button loading state across the app.
 *
 *   <LoadingButton loading={busy} loadingText="Saving…" className={styles.button}>
 *     Save profile
 *   </LoadingButton>
 */
export const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  function LoadingButton(
    { loading = false, loadingText, loaderSize = 16, loaderTone = 'light', disabled, children, ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...rest}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5em',
          }}
        >
          {loading && <SpiralLoader size={loaderSize} tone={loaderTone} />}
          {loading && loadingText != null ? loadingText : children}
        </span>
      </button>
    );
  },
);
