'use client';

import { useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  CheckCircle2,
  Layers,
  Mail,
  ScanLine,
  Ticket,
  Trophy,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/* ------------------------------------------------------------------ */
/* Demo-data mockups. Everything below is invented sample content.    */
/* ------------------------------------------------------------------ */

/** Deterministic QR-looking grid (decorative only, not scannable). */
function FakeQr({ size = 21, className = '' }: { size?: number; className?: string }) {
  const cells = useMemo(() => {
    const out: Array<[number, number]> = [];
    let seed = 7;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const inFinder = (x: number, y: number) =>
      (x < 8 && y < 8) || (x >= size - 8 && y < 8) || (x < 8 && y >= size - 8);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) if (!inFinder(x, y) && rnd() > 0.52) out.push([x, y]);
    return out;
  }, [size]);
  const finder = (ox: number, oy: number) => (
    <g key={`${ox}-${oy}`}>
      <rect x={ox} y={oy} width="7" height="7" fill="currentColor" />
      <rect x={ox + 1} y={oy + 1} width="5" height="5" fill="#fff" />
      <rect x={ox + 2} y={oy + 2} width="3" height="3" fill="currentColor" />
    </g>
  );
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={className} aria-hidden="true" shapeRendering="crispEdges">
      <rect width={size} height={size} fill="#fff" />
      <g className="text-[#160a26]">
        {cells.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />
        ))}
        {finder(0, 0)}
        {finder(size - 7, 0)}
        {finder(0, size - 7)}
      </g>
    </svg>
  );
}

function BrowserFrame({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="overflow-hidden rounded-xl border-2 border-[var(--me-line)] bg-[var(--me-bg-deep)] shadow-[6px_6px_0_0_var(--me-violet)]">
      <div className="flex items-center gap-1.5 border-b border-[var(--me-line)] bg-[var(--me-surface)] px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--me-red)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--me-orange)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--me-violet)]" />
        <span className="ml-3 truncate rounded bg-[var(--me-bg)] px-3 py-0.5 text-[11px] text-[var(--me-muted)]">{label}</span>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-[230px] rounded-[2rem] border-4 border-[var(--me-line)] bg-[var(--me-bg-deep)] p-2 shadow-[6px_6px_0_0_var(--me-violet)]">
      <div className="mx-auto mb-2 h-1.5 w-16 rounded-full bg-[var(--me-line)]" />
      <div className="overflow-hidden rounded-[1.4rem] bg-[var(--me-bg)]">{children}</div>
    </div>
  );
}

function SampleNote() {
  return <p className="mt-3 text-center text-[11px] text-[var(--me-muted)]">Sample data for illustration</p>;
}

function TicketsMock() {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="overflow-hidden rounded-xl bg-white text-[#160a26] shadow-[6px_6px_0_0_var(--me-red)]">
        <div className="bg-[var(--me-red)] px-4 py-2 text-xs font-bold text-white">Online ticket · on the phone</div>
        <div className="flex items-center gap-4 p-4">
          <FakeQr className="h-24 w-24 shrink-0" />
          <div className="min-w-0">
            <p className="font-display text-base font-extrabold leading-tight">Lagos Night Live</p>
            <p className="mt-1 text-xs">Sat 12 Dec · 6:00 pm</p>
            <p className="mt-2 inline-block rounded bg-[#160a26] px-2 py-0.5 text-[11px] font-bold text-white">VIP × 1</p>
          </div>
        </div>
        <p className="border-t border-dashed border-[#c9b8e8] px-4 py-2 text-[11px]">Sent by email and kept in the buyer&apos;s account</p>
      </div>
      <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-[var(--me-magenta)] bg-[var(--me-surface)] shadow-[6px_6px_0_0_var(--me-magenta)]">
        <div className="bg-[var(--me-magenta)] px-4 py-2 text-xs font-bold text-white">Physical ticket · printed</div>
        <div className="p-4">
          <p className="font-display text-base font-extrabold leading-tight">Lagos Night Live</p>
          <p className="mt-1 text-xs text-[var(--me-muted)]">Sat 12 Dec · Eko Hall</p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] text-[var(--me-muted)]">Serial</p>
              <p className="font-mono text-sm font-bold">MYE-004218</p>
            </div>
            <FakeQr size={21} className="h-14 w-14" />
          </div>
        </div>
        <p className="border-t border-dashed border-[var(--me-line)] px-4 py-2 text-[11px] text-[var(--me-muted)]">Print and hand out, scanned the same way at the door</p>
      </div>
    </div>
  );
}

function TypesMock() {
  const cards = [
    {
      icon: Ticket,
      name: 'Standard',
      line: 'Sell tickets',
      color: 'var(--me-red)',
      body: (
        <div className="space-y-1.5 text-[11px]">
          <div className="flex justify-between rounded bg-[var(--me-bg)] px-2 py-1"><span>Regular</span><span>₦5,000</span></div>
          <div className="flex justify-between rounded bg-[var(--me-bg)] px-2 py-1"><span>VIP</span><span>₦15,000</span></div>
        </div>
      ),
    },
    {
      icon: Trophy,
      name: 'Voting contest',
      line: 'Fans vote for entries',
      color: 'var(--me-violet)',
      body: (
        <div className="space-y-2 text-[11px]">
          {[['Contestant A', 82], ['Contestant B', 61], ['Contestant C', 34]].map(([n, v]) => (
            <div key={n as string}>
              <div className="flex justify-between"><span>{n}</span><span>{v}%</span></div>
              <div className="mt-0.5 h-1.5 rounded bg-[var(--me-bg)]"><div className="h-full rounded bg-[var(--me-violet)]" style={{ width: `${v}%` }} /></div>
            </div>
          ))}
        </div>
      ),
    },
    {
      icon: Mail,
      name: 'Invite only',
      line: 'Guest list and RSVPs',
      color: 'var(--me-magenta)',
      body: (
        <div className="space-y-1.5 text-[11px]">
          {[['Guest 1', 'Going'], ['Guest 2', 'Going'], ['Guest 3', 'Pending']].map(([n, s]) => (
            <div key={n} className="flex justify-between rounded bg-[var(--me-bg)] px-2 py-1"><span>{n}</span><span className={s === 'Going' ? 'text-emerald-300' : 'text-[var(--me-muted)]'}>{s}</span></div>
          ))}
        </div>
      ),
    },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map(({ icon: Icon, name, line, color, body }) => (
        <div key={name} className="rounded-xl border-2 bg-[var(--me-surface)] p-4" style={{ borderColor: color }}>
          <Icon className="h-6 w-6" style={{ color }} aria-hidden="true" />
          <p className="mt-2 font-display text-base font-extrabold leading-tight">{name}</p>
          <p className="mb-3 text-xs text-[var(--me-muted)]">{line}</p>
          {body}
        </div>
      ))}
    </div>
  );
}

function AnalyticsMock() {
  const pts = [8, 14, 12, 22, 30, 27, 41, 52, 49, 63, 74, 88];
  const w = 300;
  const h = 100;
  const line = pts.map((v, i) => `${(i / (pts.length - 1)) * w},${h - (v / 100) * h}`).join(' ');
  return (
    <BrowserFrame label="myevent.com.ng/dashboard/analytics">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[['Tickets sold', '1,248'], ['Revenue', '₦6.2M'], ['Checked in', '86%']].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-[var(--me-surface)] p-2.5 sm:p-3">
            <p className="text-[10px] text-[var(--me-muted)] sm:text-xs">{k}</p>
            <p className="font-display text-base font-extrabold sm:text-xl">{v}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg bg-[var(--me-surface)] p-3">
        <p className="mb-2 text-xs text-[var(--me-muted)]">Sales over time</p>
        <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" aria-hidden="true">
          <polygon points={`0,${h} ${line} ${w},${h}`} className="me-chart-fill" fill="var(--me-violet)" opacity="0.25" />
          <polyline points={line} fill="none" stroke="var(--me-magenta)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" pathLength={1} className="me-chart-line" />
        </svg>
      </div>
      <div className="mt-3 space-y-1.5 rounded-lg bg-[var(--me-surface)] p-3 text-[11px]">
        {[['Regular', 72], ['VIP', 48], ['Table', 20]].map(([n, v]) => (
          <div key={n} className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-[var(--me-muted)]">{n}</span>
            <div className="h-2 flex-1 rounded bg-[var(--me-bg)]"><div className="h-full rounded bg-[var(--me-red)]" style={{ width: `${v}%` }} /></div>
          </div>
        ))}
      </div>
    </BrowserFrame>
  );
}

function ScanMock() {
  return (
    <PhoneFrame>
      <div className="relative aspect-[3/4] bg-[var(--me-bg-deep)]">
        <div className="absolute inset-6 rounded-lg">
          {['left-0 top-0 border-l-4 border-t-4', 'right-0 top-0 border-r-4 border-t-4', 'bottom-0 left-0 border-b-4 border-l-4', 'bottom-0 right-0 border-b-4 border-r-4'].map((c) => (
            <span key={c} className={`absolute h-8 w-8 border-[var(--me-magenta)] ${c}`} />
          ))}
          <FakeQr className="absolute inset-6 h-[calc(100%-3rem)] w-[calc(100%-3rem)] opacity-60" />
        </div>
        <ScanLine className="absolute left-1/2 top-3 h-6 w-6 -translate-x-1/2 text-[var(--me-muted)]" aria-hidden="true" />
      </div>
      <div className="flex items-center gap-2 bg-emerald-600 px-3 py-3 text-white">
        <CheckCircle2 className="h-6 w-6 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-sm font-bold leading-tight">Valid ticket</p>
          <p className="text-[11px] opacity-90">VIP × 1 · Entry 1 of 1</p>
        </div>
      </div>
    </PhoneFrame>
  );
}

function StaffMock() {
  return (
    <BrowserFrame label="myevent.com.ng/dashboard/team">
      <p className="mb-2 text-xs text-[var(--me-muted)]">Your team</p>
      <div className="space-y-2 text-xs">
        {[['Team member 1', 'Door staff', 'Scan only'], ['Team member 2', 'Box office', 'Sell tickets'], ['Team member 3', 'Manager', 'Full access']].map(([n, r, a]) => (
          <div key={n} className="flex items-center justify-between rounded-lg bg-[var(--me-surface)] px-3 py-2">
            <div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--me-raised)] text-[11px] font-bold">{n.slice(-1)}</span><span>{r}</span></div>
            <span className="text-[var(--me-muted)]">{a}</span>
          </div>
        ))}
      </div>
      <p className="mb-2 mt-4 text-xs text-[var(--me-muted)]">Offline sales</p>
      <div className="space-y-1.5 text-[11px]">
        {[['Cash', '3 × Regular', '₦15,000'], ['Transfer', '1 × VIP', '₦15,000']].map(([m, t, a]) => (
          <div key={t} className="flex justify-between rounded bg-[var(--me-surface)] px-3 py-1.5"><span>{m} · {t}</span><span>{a}</span></div>
        ))}
      </div>
    </BrowserFrame>
  );
}

const FEATURES = [
  { id: 'tickets', icon: Ticket, title: 'Online and physical tickets', text: 'Sell tickets online with a QR code, or generate printed tickets for the door. Both scan the same way.', mock: <TicketsMock /> },
  { id: 'types', icon: Layers, title: 'Three kinds of event', text: 'Standard ticketed events, voting contests where fans vote for entries, and invite-only events with a guest list.', mock: <TypesMock /> },
  { id: 'analytics', icon: BarChart3, title: 'Organiser dashboard and analytics', text: 'Watch sales, revenue and check-ins as they happen, and see which ticket types sell best.', mock: <AnalyticsMock /> },
  { id: 'scan', icon: ScanLine, title: 'Scan tickets at the door', text: 'Check guests in from a phone. Each ticket shows valid or already used straight away.', mock: <ScanMock /> },
  { id: 'team', icon: Users, title: 'Team roles and offline sales', text: 'Give door staff and box office their own access, and record cash or transfer sales alongside online ones.', mock: <StaffMock /> },
] as const;

export function OrganizerShowcase() {
  const [active, setActive] = useState(0);
  const baseId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const feature = FEATURES[active];

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    let next = i;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (i + 1) % FEATURES.length;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (i - 1 + FEATURES.length) % FEATURES.length;
    else return;
    e.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section className="bg-[var(--me-bg)] py-16 sm:py-20" aria-labelledby={`${baseId}-title`}>
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-[var(--me-red-text)]">For organisers</p>
          <h2 id={`${baseId}-title`} className="mt-2 font-display text-3xl font-extrabold leading-tight text-white sm:text-4xl">
            Everything you need to sell out your event
          </h2>
          <p className="mt-3 text-[var(--me-muted)]">
            Set up in minutes. Free or paid events, tickets online and on paper, and one dashboard to run it all.
          </p>
        </div>

        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div role="tablist" aria-orientation="vertical" aria-label="Organiser features" className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              const on = i === active;
              return (
                <button
                  key={f.id}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`${baseId}-tab-${f.id}`}
                  aria-selected={on}
                  aria-controls={`${baseId}-panel`}
                  tabIndex={on ? 0 : -1}
                  onClick={(e) => {
                    setActive(i);
                    e.currentTarget.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
                  }}
                  onKeyDown={(e) => onKey(e, i)}
                  className={`group flex w-[72%] shrink-0 items-start gap-3 rounded-xl border-2 p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:w-auto sm:p-4 lg:w-auto lg:shrink ${
                    on ? 'border-[var(--me-red)] bg-[var(--me-surface)]' : 'border-[var(--me-line)] hover:border-[var(--me-violet)]'
                  }`}
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${on ? 'bg-[var(--me-red)]' : 'bg-[var(--me-raised)]'}`}>
                    <Icon className="h-5 w-5 text-white" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-base font-bold text-white">{f.title}</span>
                    <span className={`mt-1 hidden text-sm text-[var(--me-muted)] ${on ? 'lg:block' : ''}`}>{f.text}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${feature.id}`} className="min-w-0">
            <p className="mb-4 text-sm text-[var(--me-muted)] lg:hidden">{feature.text}</p>
            {/* key remounts the mockup so the chart animation replays when its tab opens */}
            <div key={feature.id} className="me-showcase-in" aria-hidden="true">
              {feature.mock}
            </div>
            <SampleNote />
          </div>
        </div>

        <div className="mt-10 text-center">
          <Button asChild size="lg" className="rounded-full px-8">
            <Link href="/events/create">Host your event</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
