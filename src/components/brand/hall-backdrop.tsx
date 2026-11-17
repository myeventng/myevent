import React from 'react';

/**
 * Line-art banquet hall (round tables, chairs, candlelit centrepieces), traced from a venue
 * photo: /assets/brand/hall-lines.svg, plain violet strokes, no fills, no gradients.
 *
 * Fills a `relative overflow-hidden` section behind its content. Decorative only.
 */
export function HallBackdrop({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.45] ${className}`}
      style={{ backgroundImage: 'url(/assets/brand/hall-lines.svg)' }}
    />
  );
}
