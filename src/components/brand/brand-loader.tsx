import React from 'react';

/**
 * Loading state: the MyEvent logo, traced to SVG and animated (the four ribbons draw in,
 * fill with colour, then the wordmark rises into place).
 *
 * `fullScreen` covers the whole viewport, header included. Without it the logo sits in a
 * block, for use inside a section.
 *
 * The animation lives inside /assets/brand/logo-loader.svg, so there is no animation code
 * in the JS bundle and the file is cached by the browser after the first visit.
 */
interface BrandLoaderProps {
  label?: string;
  fullScreen?: boolean;
  className?: string;
}

export function BrandLoader({
  label = 'Loading',
  fullScreen = false,
  className = '',
}: BrandLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center justify-center bg-[var(--me-bg-deep)] ${
        fullScreen ? 'fixed inset-0 z-[80]' : 'min-h-[320px]'
      } ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/brand/logo-loader.svg"
        alt=""
        width={625}
        height={365}
        className={
          fullScreen ? 'h-auto w-[min(80vw,460px)]' : 'h-auto w-[min(70vw,240px)]'
        }
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
