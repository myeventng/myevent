import React from 'react';

/**
 * Event-themed SVG background. Flat colours only: stage spotlights, a big
 * colour block, a ticket stub, equaliser bars, stars and confetti.
 * Purely decorative (aria-hidden, no pointer events).
 */
type Variant = 'hero' | 'section' | 'section-alt' | 'footer';

interface EventBackdropProps {
  variant?: Variant;
  className?: string;
}

const STAR =
  'M0,-14 L4.1,-4.8 L14,-4.3 L6.3,2.2 L8.7,11.3 L0,6.2 L-8.7,11.3 L-6.3,2.2 L-14,-4.3 L-4.1,-4.8 Z';

const stars = [
  { x: 120, y: 90, s: 1.1, c: '#e5173f', d: 0 },
  { x: 1040, y: 140, s: 0.8, c: '#9b4dff', d: 0.8 },
  { x: 640, y: 60, s: 0.6, c: '#e0209f', d: 1.6 },
  { x: 930, y: 520, s: 1, c: '#e5173f', d: 2.1 },
  { x: 230, y: 560, s: 0.7, c: '#9b4dff', d: 1.2 },
  { x: 1120, y: 380, s: 0.55, c: '#ffffff', d: 2.6 },
  { x: 80, y: 340, s: 0.5, c: '#ffffff', d: 0.4 },
];

const confetti = [
  { x: 300, y: 120, r: 25, c: '#e5173f', t: 'rect' },
  { x: 860, y: 90, r: -30, c: '#9b4dff', t: 'rect' },
  { x: 1000, y: 300, r: 15, c: '#e0209f', t: 'tri' },
  { x: 180, y: 250, r: -20, c: '#ff5a1f', t: 'tri' },
  { x: 520, y: 600, r: 40, c: '#9b4dff', t: 'rect' },
  { x: 760, y: 610, r: -15, c: '#e5173f', t: 'circle' },
  { x: 410, y: 40, r: 0, c: '#ffffff', t: 'circle' },
  { x: 1150, y: 560, r: 30, c: '#e0209f', t: 'rect' },
];

const bars = [30, 55, 40, 80, 60, 95, 50, 70, 35, 85, 45, 65, 30, 75, 50, 90];

export function EventBackdrop({
  variant = 'section',
  className = '',
}: EventBackdropProps) {
  const showBeams = variant === 'hero';
  const showBlock = variant !== 'footer';
  const showBars = variant === 'hero' || variant === 'footer';
  const showTicket = variant === 'hero' || variant === 'section-alt';
  const flip = variant === 'section-alt';

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      viewBox="0 0 1200 700"
      preserveAspectRatio="xMidYMid slice"
    >
      <g transform={flip ? 'translate(1200 0) scale(-1 1)' : undefined}>
        {/* Big colour block, like a stage backdrop */}
        {showBlock && (
          <>
            <polygon points="-40,700 420,120 880,700" fill="#2b1450" />
            <polygon points="520,700 820,300 1240,700" fill="#221040" />
          </>
        )}

        {/* Stage spotlights */}
        {showBeams && (
          <>
            <polygon points="180,0 260,0 520,700 60,700" fill="#ffffff" opacity="0.035" />
            <polygon points="900,0 980,0 1180,700 700,700" fill="#9b4dff" opacity="0.07" />
          </>
        )}

        {/* Ticket stub outline */}
        {showTicket && (
          <g
            transform="translate(930 430) rotate(-12)"
            fill="none"
            stroke="#4a2a7a"
            strokeWidth="3"
          >
            <path d="M0,0 H150 a14,14 0 0 0 0,28 V70 a14,14 0 0 0 0,28 V140 H0 V98 a14,14 0 0 0 0,-28 V28 a14,14 0 0 0 0,-28 Z" />
            <line x1="100" y1="10" x2="100" y2="130" strokeDasharray="6 8" />
          </g>
        )}

        {/* Equaliser bars */}
        {showBars && (
          <g fill="#331a5c">
            {bars.map((h, i) => (
              <rect
                key={i}
                x={20 + i * 74}
                y={700 - h * (variant === 'footer' ? 0.9 : 1.1)}
                width="34"
                height={h * 1.2}
                rx="6"
              />
            ))}
          </g>
        )}

        {/* Confetti */}
        {confetti.map((p, i) => (
          <g key={i} transform={`translate(${p.x} ${p.y}) rotate(${p.r})`}>
            <g className="me-float" style={{ animationDelay: `${i * 0.7}s` }}>
              {p.t === 'rect' && <rect x="-8" y="-4" width="16" height="8" rx="2" fill={p.c} />}
              {p.t === 'tri' && <polygon points="0,-9 9,7 -9,7" fill={p.c} />}
              {p.t === 'circle' && <circle r="6" fill={p.c} />}
            </g>
          </g>
        ))}

        {/* Stars */}
        {stars.map((s, i) => (
          <g key={i} transform={`translate(${s.x} ${s.y}) scale(${s.s})`}>
            <path
              d={STAR}
              fill={s.c}
              className="me-twinkle"
              style={{ animationDelay: `${s.d}s` }}
            />
          </g>
        ))}
      </g>
    </svg>
  );
}
