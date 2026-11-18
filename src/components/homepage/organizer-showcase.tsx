'use client';

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import {
  BarChart3,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Layers,
  Mail,
  Menu,
  Printer,
  RefreshCw,
  ScanQrCode,
  ShoppingCart,
  Ticket,
  Users,
  Vote,
  MapPin,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/* ================================================================== */
/* Layout helpers                                                      */
/* ================================================================== */

/** Draws children at a fixed design size and scales the whole thing to fit its parent. */
function ScaleToFit({ w, h, children }: { w: number; h: number; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width && r.height) setScale(Math.min(r.width / w, r.height / h, 1.25));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [w, h]);

  return (
    <div ref={box} className="relative h-full w-full">
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: w,
          height: h,
          marginLeft: -w / 2,
          marginTop: -h / 2,
          transform: `scale(${scale})`,
          opacity: scale ? 1 : 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}

const RED = '#e5173f';

/** True on phones (below 768px), where the real app hides its sidebar too. Tablets keep the full dashboard. */
const NarrowCtx = createContext(false);

function useNarrowQuery() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return narrow;
}

/* ================================================================== */
/* Mockups. These mirror the real organiser screens (light dashboard,  */
/* white sidebar, tabs, cards) and use invented sample data only.      */
/* ================================================================== */

type NavKey = 'Orders' | 'Analytics & Payouts' | 'Scanner' | 'Physical Tickets' | 'Staff';

function DashboardShell({ active, children }: { active: NavKey; children: ReactNode }) {
  const narrow = useContext(NarrowCtx);
  const items: Array<[string, ReactNode, boolean?]> = [
    ['Events', <Calendar key="e" className="h-4 w-4" />, true],
    ['Orders', <ShoppingCart key="o" className="h-4 w-4" />],
    ['Analytics & Payouts', <BarChart3 key="a" className="h-4 w-4" />],
    ['Scanner', <ScanQrCode key="s" className="h-4 w-4" />],
    ['Physical Tickets', <Printer key="p" className="h-4 w-4" />, true],
    ['Staff', <Users key="t" className="h-4 w-4" />],
    ['Venues', <MapPin key="v" className="h-4 w-4" />, true],
  ];
  return (
    <div className="flex h-full w-full overflow-hidden rounded-xl border border-gray-200 bg-white text-gray-900 shadow-2xl">
      <aside className={`${narrow ? 'hidden' : 'flex'} w-[176px] shrink-0 flex-col border-r border-gray-200 bg-white`}>
        <div className="px-4 py-4 text-xl font-bold" style={{ color: RED }}>MyEvent</div>
        <nav className="flex-1 space-y-1 px-3 text-[13px]">
          {items.map(([label, icon, chevron]) => {
            const on = label === active;
            return (
              <div
                key={label}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 ${on ? 'font-semibold' : 'text-gray-600'}`}
                style={on ? { backgroundColor: 'rgba(229,23,63,0.08)', color: RED } : undefined}
              >
                {icon}
                <span className="flex-1">{label}</span>
                {chevron && <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
              </div>
            );
          })}
        </nav>
        <div className="m-3 flex items-center gap-2 rounded-md bg-gray-50 p-2 text-xs">
          <span className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: RED }}>O</span>
          <span className="text-gray-600">Organiser</span>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 items-center justify-end gap-4 border-b border-gray-200 bg-white px-5">
          {narrow && <><Menu className="h-5 w-5 text-gray-700" /><span className="mr-auto text-base font-bold" style={{ color: RED }}>MyEvent</span></>}
          <Bell className="h-4 w-4 text-gray-500" />
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-[11px] font-bold text-gray-600">O</span>
        </div>
        <main className={`flex-1 overflow-hidden bg-gray-50 ${narrow ? 'p-4' : 'p-5'}`}>{children}</main>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between text-[12px] font-medium text-gray-700">{label}{icon}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
      <div className="text-[11px] text-gray-500">{sub}</div>
    </div>
  );
}

function AnalyticsScreen() {
  const narrow = useContext(NarrowCtx);
  const row = (l: string, v: string, cls = '') => (
    <div className={`flex justify-between text-[12px] ${cls}`}><span>{l}</span><span className="font-medium">{v}</span></div>
  );
  return (
    <DashboardShell active="Analytics & Payouts">
      <div className="mb-3 flex justify-end">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium"><RefreshCw className="h-3.5 w-3.5" />Refresh</span>
      </div>
      <div className="mb-3 grid grid-cols-4 rounded-md bg-gray-100 p-1 text-center text-xs">
        {(narrow ? ['Overview', 'Events', 'Revenue', 'Details'] : ['Overview', 'Events', 'Revenue & Payouts', 'Event Details']).map((t, i) => (
          <span key={t} className={`rounded px-2 py-1.5 ${i === 0 ? 'bg-white font-semibold shadow-sm' : 'text-gray-500'}`}>{t}</span>
        ))}
      </div>
      <div className={`mb-3 grid gap-3 ${narrow ? 'grid-cols-2' : 'grid-cols-4'}`}>
        <StatCard label="Total Revenue" value="₦6,240,000" sub="From 1,248 orders" icon={<span className="text-gray-400">₦</span>} />
        <StatCard label="Tickets Sold" value="1,248" sub="Across all events" icon={<Ticket className="h-3.5 w-3.5 text-gray-400" />} />
        <StatCard label="Available Payout" value="₦4,980,000" sub="From 960 orders" icon={<CreditCard className="h-3.5 w-3.5 text-gray-400" />} />
        <StatCard label="Active Events" value="4" sub="of 9 total" icon={<Calendar className="h-3.5 w-3.5 text-gray-400" />} />
      </div>
      <div className={`grid gap-3 ${narrow ? 'grid-cols-1' : 'grid-cols-2'}`}>
        <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-3.5">
          <div className="flex items-center justify-between text-sm font-semibold">Revenue Breakdown<span className="rounded-full border border-gray-300 px-2 py-0.5 text-[10px] font-medium text-gray-500">Platform Fee</span></div>
          {row('Gross Revenue', '₦6,240,000')}
          {row('Refunds', '-₦120,000', 'text-red-600')}
          {row('Net Revenue', '₦6,120,000')}
          <div className="border-t border-gray-200 pt-2">{row('Your Earnings', '₦5,640,000', 'font-bold text-green-600')}</div>
          <div className="rounded-md bg-purple-50 p-2 text-[11px] font-medium text-purple-800">Includes ₦480,000 from offline sales</div>
        </div>
        <div className={`space-y-2.5 rounded-lg border border-gray-200 bg-white p-3.5 ${narrow ? 'hidden' : ''}`}>
          <div className="text-sm font-semibold">Performance Summary</div>
          {row('Average Revenue per Event', '₦693,000')}
          {row('Average Tickets per Event', '139')}
          {row('Total Completed Payouts', '₦3,200,000', 'text-green-600')}
        </div>
      </div>
    </DashboardShell>
  );
}

function StaffScreen() {
  const narrow = useContext(NarrowCtx);
  const rows: Array<[string, string, string, string, string]> = [
    ['Team member 1', 'Scanner', 'All my events', 'Active', 'bg-emerald-100 text-emerald-800'],
    ['Team member 2', 'Manager', '2 events', 'Active', 'bg-emerald-100 text-emerald-800'],
    ['Team member 3', 'Scanner', 'All my events', 'Invited', 'bg-gray-200 text-gray-700'],
  ];
  return (
    <DashboardShell active="Staff">
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-2 text-base font-semibold"><Users className="h-4 w-4" />Your team</div>
          <span className="rounded-md px-3 py-1.5 text-xs font-semibold text-white" style={{ background: RED }}>Add staff</span>
        </div>
        <table className="w-full text-left text-[12px]">
          <thead className="text-gray-500">
            <tr>{['Person', 'Role', 'Events', 'Status'].filter((h) => !(narrow && h === 'Events')).map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map(([n, r, e, s, cls]) => (
              <tr key={n} className="border-t border-gray-100">
                <td className="px-4 py-2.5"><div className="font-medium">{n}</div><div className="text-[11px] text-gray-500">name@example.com</div></td>
                <td className="px-4 py-2.5">{r}</td>
                {!narrow && <td className="px-4 py-2.5">{e}</td>}
                <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>{s}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={`mt-3 grid gap-3 text-[12px] ${narrow ? 'grid-cols-1' : 'grid-cols-2'}`}>
        <div className="rounded-lg border border-gray-200 bg-white p-3.5"><p className="font-semibold">Scanner</p><p className="mt-1 text-gray-500">Can only scan tickets and view check-in counts for assigned events.</p></div>
        <div className="rounded-lg border border-gray-200 bg-white p-3.5"><p className="font-semibold">Manager</p><p className="mt-1 text-gray-500">Can edit assigned events, view analytics and scan tickets. Never sees payouts.</p></div>
      </div>
    </DashboardShell>
  );
}

/* ---- Card-sized mockups (used in shuffle stacks) ---- */

function FakeQr({ size = 21, className = '' }: { size?: number; className?: string }) {
  const cells = useMemo(() => {
    const out: Array<[number, number]> = [];
    let seed = 7;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const fin = (x: number, y: number) => (x < 8 && y < 8) || (x >= size - 8 && y < 8) || (x < 8 && y >= size - 8);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fin(x, y) && rnd() > 0.52) out.push([x, y]);
    return out;
  }, [size]);
  const finder = (ox: number, oy: number) => (
    <g key={`${ox}-${oy}`}>
      <rect x={ox} y={oy} width="7" height="7" fill="#111" />
      <rect x={ox + 1} y={oy + 1} width="5" height="5" fill="#fff" />
      <rect x={ox + 2} y={oy + 2} width="3" height="3" fill="#111" />
    </g>
  );
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={className} aria-hidden="true" shapeRendering="crispEdges">
      <rect width={size} height={size} fill="#fff" />
      {cells.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#111" />)}
      {finder(0, 0)}{finder(size - 7, 0)}{finder(0, size - 7)}
    </svg>
  );
}

const CARD = 'h-full w-full overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-2xl';

function OnlineTicketCard() {
  return (
    <div className={CARD}>
      <div className="relative h-[120px] bg-gradient-to-br from-[#e0209f] via-[#9b4dff] to-[#2d1752]">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-3 left-4"><p className="text-lg font-bold text-white">Lagos Night Live</p><p className="text-xs text-white/80">VIP</p></div>
        <span className="absolute right-3 top-3 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[11px] font-semibold text-white">Valid</span>
      </div>
      <div className="flex gap-5 p-4">
        <div className="min-w-0 flex-1 space-y-2.5 text-[12px]">
          <div><p className="text-gray-500">Event Details</p><p className="font-medium">Sat 12 Dec · 6:00 pm</p><p>Eko Hall, Lagos</p></div>
          <div><p className="text-gray-500">Ticket Type</p><p className="font-medium">VIP × 1</p></div>
          <p className="text-[11px] text-gray-500">Sent by email and kept in the buyer&apos;s account</p>
        </div>
        <div className="text-center"><FakeQr className="h-[118px] w-[118px] rounded border border-gray-200" /><p className="mt-1 text-[10px] text-gray-500">Show at the door</p></div>
      </div>
    </div>
  );
}

function GenerateCard() {
  const radio = (on: boolean, t: string) => (
    <div className={`flex items-center gap-2 rounded-md border p-2.5 text-[12px] ${on ? 'border-[#e5173f]' : 'border-gray-200'}`}>
      <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${on ? 'border-[#e5173f]' : 'border-gray-300'}`}>{on && <span className="h-1.5 w-1.5 rounded-full bg-[#e5173f]" />}</span>{t}
    </div>
  );
  return (
    <div className={CARD}>
      <div className="border-b border-gray-100 px-4 py-3"><p className="text-base font-semibold">Generate physical tickets</p><p className="text-xs text-gray-500">Lagos Night Live</p></div>
      <div className="space-y-3 p-4 text-[12px]">
        <div className="grid grid-cols-[1fr_110px] gap-3">
          <div><p className="mb-1 font-medium">Ticket type</p><div className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">Regular<ChevronDown className="h-3.5 w-3.5 text-gray-400" /></div></div>
          <div><p className="mb-1 font-medium">Quantity</p><div className="rounded-md border border-gray-200 px-3 py-2">200</div></div>
        </div>
        <div><p className="mb-1 font-medium">Code type</p><div className="grid grid-cols-2 gap-2">{radio(true, 'QR code')}{radio(false, 'Barcode')}</div></div>
        <div><p className="mb-1 font-medium">Design</p><div className="grid grid-cols-2 gap-2">{radio(true, 'Branded')}{radio(false, 'Codes only')}</div></div>
        <div className="flex items-center justify-between"><span className="font-medium">Print serial number</span><span className="flex h-4 w-8 items-center justify-end rounded-full bg-[#e5173f] px-0.5"><span className="h-3 w-3 rounded-full bg-white" /></span></div>
      </div>
    </div>
  );
}

function TypeCard({ icon, title, text, items, tone }: { icon: ReactNode; title: string; text: string; items: string[]; tone: string }) {
  return (
    <div className={CARD}>
      <div className="p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl text-white" style={{ background: tone }}>{icon}</div>
        <p className="mt-3 text-lg font-bold">{title}</p>
        <p className="mt-1 text-[12px] text-gray-500">{text}</p>
        <ul className="mt-3 space-y-1.5 text-[12px]">
          {items.map((i) => <li key={i} className="flex items-center gap-2"><Check className="h-3.5 w-3.5" style={{ color: tone }} />{i}</li>)}
        </ul>
      </div>
    </div>
  );
}

function PhoneScannerCard() {
  return (
    <div className={`${CARD} flex items-center justify-center bg-gray-100`}>
      <div className="w-[210px] rounded-[1.8rem] border-4 border-gray-800 bg-gray-800 p-1.5">
        <div className="overflow-hidden rounded-[1.3rem] bg-black">
          <div className="relative aspect-[3/4]">
            {['left-5 top-5 border-l-4 border-t-4', 'right-5 top-5 border-r-4 border-t-4', 'bottom-5 left-5 border-b-4 border-l-4', 'bottom-5 right-5 border-b-4 border-r-4'].map((c) => <span key={c} className={`absolute h-7 w-7 border-[#e0209f] ${c}`} />)}
            <FakeQr className="absolute inset-9 h-[calc(100%-4.5rem)] w-[calc(100%-4.5rem)] opacity-70" />
          </div>
          <div className="flex items-center gap-2 bg-emerald-600 px-3 py-2.5 text-white"><CheckCircle2 className="h-5 w-5 shrink-0" /><p className="text-[12px] font-semibold leading-tight">Valid ticket - Entry granted</p></div>
        </div>
      </div>
    </div>
  );
}

function ScannerModeCard() {
  const narrow = useContext(NarrowCtx);
  const opt = (on: boolean, t: string, d: string) => (
    <div className={`flex items-start gap-2.5 rounded-md border p-3 ${on ? 'border-[#e5173f]' : 'border-gray-200'}`}>
      <span className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${on ? 'border-[#e5173f]' : 'border-gray-300'}`}>{on && <span className="h-1.5 w-1.5 rounded-full bg-[#e5173f]" />}</span>
      <span><span className="block text-[12px] font-medium">{t}</span><span className="block text-[11px] text-gray-500">{d}</span></span>
    </div>
  );
  return (
    <div className={CARD}>
      <div className="border-b border-gray-100 px-4 py-3"><p className="text-base font-semibold">Scanner mode</p><p className="text-xs text-gray-500">Choose how entry tickets can be checked at this event.</p></div>
      <div className="space-y-3 p-4">
        <div className={`grid gap-2.5 ${narrow ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {opt(true, 'Inbuilt scanner only (default)', 'Staff must use the camera scanner in the app.')}
          {opt(false, 'Universal scanner', 'Camera, hardware scanners and manual entry are accepted.')}
        </div>
        <table className="w-full text-[12px]">
          <thead className="text-left text-gray-500"><tr><th className="py-1.5 font-medium">Capability</th><th className="text-center font-medium">Inbuilt only</th><th className="text-center font-medium">Universal</th></tr></thead>
          <tbody>
            {[['Ticket validated exactly once', true, true], ['Hardware barcode / QR scanner', false, true], ['Manual code entry', false, true]].map(([l, a, b]) => (
              <tr key={l as string} className="border-t border-gray-100">
                <td className="py-1.5">{l as string}</td>
                <td className="text-center">{a ? <Check className="mx-auto h-3.5 w-3.5 text-emerald-600" /> : <X className="mx-auto h-3.5 w-3.5 text-gray-400" />}</td>
                <td className="text-center">{b ? <Check className="mx-auto h-3.5 w-3.5 text-emerald-600" /> : <X className="mx-auto h-3.5 w-3.5 text-gray-400" />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================================================================== */
/* Content                                                             */
/* ================================================================== */

interface Feature {
  id: string;
  icon: typeof Ticket;
  title: string;
  text: string;
  bullets: string[];
  /** Design size of the stage (px) that every card in this feature is drawn at. */
  w: number;
  h: number;
  /** Design size on phones and tablets (narrow, taller). */
  nw: number;
  nh: number;
  /** Card labels, one per card. More than one card makes a shuffle stack. */
  labels: string[];
  cards: ReactNode[];
  /**
   * Optional real screenshots. Put files in /public/showcase and list them here
   * (same count as `cards`) to use them instead of the built-in mockups.
   */
  images?: string[];
}

const FEATURES: Feature[] = [
  {
    id: 'tickets',
    icon: Ticket,
    title: 'Online and physical tickets',
    text: 'Sell tickets online with a QR code, or generate printed tickets for the door. Both scan the same way.',
    bullets: ['QR or barcode tickets', 'Branded or codes-only print layouts', 'Serial numbers for every ticket'],
    w: 520, h: 330, nw: 380, nh: 330,
    labels: ['Online ticket', 'Physical tickets'],
    cards: [<OnlineTicketCard key="o" />, <GenerateCard key="g" />],
  },
  {
    id: 'types',
    icon: Layers,
    title: 'Three kinds of event',
    text: 'Pick what you are running: a ticketed event, a voting contest, or a private invite-only event.',
    bullets: ['Standard events with ticket sales', 'Voting contests, free or paid', 'Invite-only with RSVP tracking'],
    w: 520, h: 300, nw: 380, nh: 270,
    labels: ['Standard', 'Voting contest', 'Invite only'],
    cards: [
      <TypeCard key="s" icon={<Calendar className="h-5 w-5" />} tone="#e5173f" title="Standard Event" text="Regular events with tickets, venues and traditional event management" items={['Physical or virtual venues', 'Ticket sales and management', 'Attendee tracking', 'Event scheduling']} />,
      <TypeCard key="v" icon={<Vote className="h-5 w-5" />} tone="#9b4dff" title="Voting Contest" text="Create competitions where users can vote for contestants" items={['Contestant management', 'Free or paid voting', 'Vote packages and pricing', 'Real-time results']} />,
      <TypeCard key="i" icon={<Mail className="h-5 w-5" />} tone="#e0209f" title="Invite-Only Event" text="Private events with invitation-based attendance" items={['Invitation management', 'RSVP tracking', 'Guest list control', 'Private event access']} />,
    ],
  },
  {
    id: 'analytics',
    icon: BarChart3,
    title: 'Dashboard, analytics and payouts',
    text: 'See revenue, tickets sold and your earnings in one place, online and offline sales together, and request payouts.',
    bullets: ['Revenue breakdown with refunds and fees', 'Per-event performance', 'Payout requests and history'],
    w: 800, h: 480, nw: 380, nh: 560,
    labels: ['Analytics'],
    cards: [<AnalyticsScreen key="a" />],
  },
  {
    id: 'scan',
    icon: ScanQrCode,
    title: 'Scan tickets at the door',
    text: 'Check guests in from a phone. Each ticket is validated once, so a used ticket cannot get in twice.',
    bullets: ['Built-in camera scanner, on by default', 'Optional hardware scanners and manual entry', 'Live check-in counts'],
    w: 520, h: 330, nw: 380, nh: 440,
    labels: ['At the door', 'Scanner settings'],
    cards: [<PhoneScannerCard key="p" />, <ScannerModeCard key="m" />],
  },
  {
    id: 'team',
    icon: Users,
    title: 'Staff and team access',
    text: 'Invite scanners and managers, choose which events they can see, and keep payouts and settings to yourself.',
    bullets: ['Scanner and Manager roles', 'Access for all or selected events', 'Revoke access any time'],
    w: 800, h: 480, nw: 380, nh: 470,
    labels: ['Team'],
    cards: [<StaffScreen key="t" />],
  },
];

/** How much scroll each feature gets (more cards = longer). */
const WEIGHTS = FEATURES.map((f) => (f.cards.length > 1 ? 0.75 * f.cards.length + 0.5 : 1));
/** Share of each feature's scroll spent holding on its first and last card, so flipping cards and changing feature never happen together. */
const HOLD = 0.2;
const TOTAL = WEIGHTS.reduce((a, b) => a + b, 0);
const BOUNDS = WEIGHTS.reduce<number[]>((acc, w) => [...acc, acc[acc.length - 1] + w / TOTAL], [0]);
const VH_PER_UNIT = 70;

/* ================================================================== */
/* Shuffle stack                                                       */
/* ================================================================== */

/**
 * One card of the stack. Its position is computed from `p` (a scroll-linked value, 0 to cards-1),
 * so the card only moves while the user scrolls and stops exactly where they stop.
 * t in [0,1): this card is flying from the front to the back; t in [1,k): resting, moving forward.
 */
function StackCard({ i, k, dh, peek, p, reduce, children }: { i: number; k: number; dh: number; peek: number; p: MotionValue<number>; reduce: boolean; children: ReactNode }) {
  const m = useTransform(p, (v) => {
    const pv = reduce ? Math.round(v) : v;
    const t = (((pv - i) % k) + k) % k;
    const leaving = t < 1;
    const pos = leaving ? t * (k - 1) : k - t;
    const arc = leaving ? Math.sin(Math.PI * t) : 0;
    const dir = i % 2 ? -1 : 1;
    return {
      y: pos * peek,
      x: dir * arc * 34,
      scale: 1 - pos * 0.045,
      rotate: dir * (Math.min(pos, 1) * 1.6 + arc * 5),
      z: leaving ? (t < 0.5 ? k + 1 : 0) : k - Math.round(pos),
      filter: `brightness(${1 - 0.18 * Math.min(pos, 1)})`,
    };
  });
  const x = useTransform(m, (o) => o.x);
  const y = useTransform(m, (o) => o.y);
  const scale = useTransform(m, (o) => o.scale);
  const rotate = useTransform(m, (o) => o.rotate);
  const zIndex = useTransform(m, (o) => o.z);
  const filter = useTransform(m, (o) => o.filter);
  return (
    <motion.div className="absolute left-0 top-0 w-full" style={{ height: dh, x, y, scale, rotate, zIndex, filter, transformOrigin: 'bottom center' }}>
      {children}
    </motion.div>
  );
}

function ShuffleStack({ feature, p, reduce }: { feature: Feature; p: MotionValue<number>; reduce: boolean }) {
  const narrow = useContext(NarrowCtx);
  const dw = narrow ? feature.nw : feature.w;
  const dh = narrow ? feature.nh : feature.h;
  const k = feature.cards.length;
  const peek = 18;
  const nodes = feature.images
    ? feature.images.map((src) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={src} src={src} alt="" className="h-full w-full rounded-2xl border border-gray-200 object-cover shadow-2xl" loading="lazy" />
      ))
    : feature.cards;
  return (
    <ScaleToFit w={dw} h={dh + (k - 1) * peek}>
      <div className="relative h-full w-full">
        {nodes.map((node, i) => (
          <StackCard key={i} i={i} k={k} dh={dh} peek={peek} p={p} reduce={reduce}>
            <div className="h-full w-full">{node}</div>
          </StackCard>
        ))}
      </div>
    </ScaleToFit>
  );
}

/* ================================================================== */
/* Section                                                             */
/* ================================================================== */

export function OrganizerShowcase() {
  const baseId = useId();
  const reduce = useReducedMotion() ?? false;
  const track = useRef<HTMLDivElement>(null);
  const [state, setState] = useState({ i: 0, step: 0 });
  const narrow = useNarrowQuery();

  const { scrollYProgress } = useScroll({ target: track, offset: ['start start', 'end end'] });
  const p = useMotionValue(0);
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const t = Math.min(Math.max(v, 0), 0.9999);
    let i = 0;
    while (i < FEATURES.length - 1 && t >= BOUNDS[i + 1]) i++;
    const local = (t - BOUNDS[i]) / (BOUNDS[i + 1] - BOUNDS[i]);
    const k = FEATURES[i].cards.length;
    const prog = k > 1 ? Math.min(Math.max((local - HOLD) / (1 - 2 * HOLD), 0), 1) * (k - 1) : 0;
    p.set(prog);
    const step = Math.round(prog);
    setState((s) => (s.i === i && s.step === step ? s : { i, step }));
  });

  const goTo = useCallback((i: number) => {
    const el = track.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const scrollable = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + scrollable * (BOUNDS[i] + 0.001), behavior: reduce ? 'auto' : 'smooth' });
  }, [reduce]);

  const f = FEATURES[state.i];
  const Icon = f.icon;
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <section className="bg-[var(--me-bg)]" aria-labelledby={`${baseId}-title`}>
      <div className="mx-auto max-w-2xl px-4 pb-10 pt-16 text-center sm:pt-20">
        <p className="text-sm font-semibold text-[var(--me-red-text)]">For organisers</p>
        <h2 id={`${baseId}-title`} className="mt-2 font-display text-3xl font-extrabold leading-tight text-white sm:text-4xl">
          Everything you need to sell out your event
        </h2>
        <p className="mt-3 text-[var(--me-muted)]">Set up in minutes. Free or paid events, tickets online and on paper, and one dashboard to run it all.</p>
      </div>

      {/* Tall track; the inner frame stays pinned while the page scrolls through it. */}
      <div ref={track} style={{ height: `${100 + TOTAL * VH_PER_UNIT}vh` }} className="relative">
        <div className="sticky top-[72px] h-[calc(100svh-72px)] px-3 pb-4 sm:px-6 lg:px-8">
          <div className="relative mx-auto grid h-full max-w-7xl grid-rows-[auto_minmax(0,1fr)] gap-3 lg:grid-cols-[4fr_6fr] xl:grid-cols-[5fr_7fr] lg:grid-rows-1 lg:gap-6">
            {/* Left: text panel */}
            <div className="relative flex min-h-0 flex-col rounded-3xl border border-[var(--me-line)] bg-[var(--me-surface)] p-5 sm:p-7 lg:p-8 xl:p-10">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--me-red)]"><Icon className="h-6 w-6 text-white" aria-hidden="true" /></span>
                <span className="font-display text-sm italic text-[var(--me-muted)] lg:hidden">{pad(state.i + 1)} /{pad(FEATURES.length)}</span>
              </div>

              <motion.div key={f.id} initial={reduce ? false : { opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mt-4 min-h-0 overflow-hidden lg:mt-6 lg:pr-16 xl:mt-8 xl:pr-24" aria-live="polite">
                <h3 className="font-display text-2xl font-extrabold leading-tight text-white sm:text-3xl xl:text-4xl">{f.title}</h3>
                <p className="mt-2 hidden text-sm text-[var(--me-muted)] sm:block sm:text-base lg:mt-3 xl:mt-4">{f.text}</p>
                <ul className="mt-4 hidden space-y-2 md:block lg:mt-5 lg:space-y-2.5 [@media(max-height:680px)]:hidden">
                  {f.bullets.map((b, bi) => (
                    <motion.li
                      key={b}
                      initial={reduce ? false : { opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, delay: 0.15 + bi * 0.12 }}
                      className="flex items-center gap-2.5 text-white"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--me-violet)]"><Check className="h-3 w-3 text-white" aria-hidden="true" /></span>
                      {b}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>

              <nav aria-label="Organiser features" className="mt-auto hidden pt-4 lg:[@media(min-height:800px)]:block">
                <ol className="space-y-1">
                  {FEATURES.map((x, i) => (
                    <li key={x.id}>
                      <button
                        type="button"
                        onClick={() => goTo(i)}
                        aria-current={i === state.i ? 'step' : undefined}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${i === state.i ? 'bg-[var(--me-raised)] font-semibold text-white' : 'text-[var(--me-muted)] hover:text-white'}`}
                      >
                        <span className="font-display italic">{pad(i + 1)}</span>{x.title}
                      </button>
                    </li>
                  ))}
                </ol>
              </nav>

              {/* Number badge straddling the seam, like RomTech */}
              <div className="pointer-events-none absolute -right-10 top-[46%] z-20 hidden h-28 w-28 flex-col justify-between rounded-3xl border border-[var(--me-line)] bg-[var(--me-raised)] p-3 shadow-[5px_5px_0_0_var(--me-violet)] lg:flex xl:-right-14 xl:h-36 xl:w-36 xl:p-4 xl:shadow-[6px_6px_0_0_var(--me-violet)]" aria-hidden="true">
                <span className="font-display text-3xl font-extrabold italic text-white xl:text-4xl">{pad(state.i + 1)}</span>
                <span className="self-end font-display text-lg italic text-[var(--me-muted)] xl:text-xl">/{pad(FEATURES.length)}</span>
              </div>
            </div>

            {/* Right: stage */}
            <div className="relative min-h-0 overflow-hidden rounded-3xl border border-[var(--me-line)] bg-gradient-to-br from-[var(--me-raised)] via-[var(--me-surface)] to-[#3a1670] p-3 sm:p-6 lg:p-6 lg:pl-12 xl:p-8 xl:pl-14" role="img" aria-label={`${f.title}: example screens with sample data`}>
              <div key={f.id} className="h-full w-full" style={{ animation: reduce ? undefined : 'me-showcase-in 0.4s ease-out both' }}>
                <div className="flex h-full flex-col">
                  <div className="min-h-0 flex-1"><NarrowCtx.Provider value={narrow}><ShuffleStack feature={f} p={p} reduce={reduce} /></NarrowCtx.Provider></div>
                  {f.cards.length > 1 && (
                    <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs" aria-hidden="true">
                      {f.labels.map((l, li) => (
                        <span key={l} className={`rounded-full border px-3 py-1 ${li === state.step ? 'border-white bg-white font-semibold text-[#160a26]' : 'border-[var(--me-line)] text-[var(--me-muted)]'}`}>{l}</span>
                      ))}
                    </div>
                  )}
                  <p className="mt-2 text-center text-[11px] text-[var(--me-muted)]">Sample data for illustration</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-16 pt-6 text-center sm:pb-20">
        <Button asChild size="lg" className="rounded-full px-8">
          <Link href="/events/create">Host your event</Link>
        </Button>
      </div>
    </section>
  );
}

