import React from 'react';

/**
 * Line-art crowd with raised hands, traced from the concert photo
 * (/assets/brand/crowd-lines.svg: plain violet strokes, no fills, no gradients).
 *
 * Place it inside a `relative overflow-hidden` section. It is decorative only.
 * Its height follows the width (the artwork is 2.5:1) so the raised hands are never cropped.
 *  - position "bottom": the crowd stands along the bottom edge (default)
 *  - position "top":    flipped so the hands hang from the top edge
 */
interface CrowdBackdropProps {
  position?: 'bottom' | 'top';
  className?: string;
}

export function CrowdBackdrop({
  position = 'bottom',
  className = '',
}: CrowdBackdropProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 h-[max(240px,40vw)] max-h-[640px] bg-cover bg-no-repeat opacity-40 ${
        position === 'bottom' ? 'bottom-0 bg-bottom' : 'top-0 bg-top [transform:scaleY(-1)]'
      } ${className}`}
      style={{ backgroundImage: 'url(/assets/brand/crowd-lines.svg)' }}
    />
  );
}
