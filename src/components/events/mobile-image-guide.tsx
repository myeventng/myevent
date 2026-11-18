'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Calendar, MapPin, Smartphone, Monitor } from 'lucide-react';

interface MobileImageGuideProps {
  mobileImageUrl?: string | null;
  coverImageUrl?: string | null;
  title?: string;
}

/**
 * Shows the organiser how the event will look on a phone versus a laptop,
 * with an optional safe-area overlay for the 4:5 phone crop.
 */
export function MobileImageGuide({ mobileImageUrl, coverImageUrl, title }: MobileImageGuideProps) {
  const [showSafe, setShowSafe] = useState(true);
  const [device, setDevice] = useState<'phone' | 'desktop'>('phone');

  const phoneImage = mobileImageUrl || coverImageUrl || '';
  const usingFallback = !mobileImageUrl && !!coverImageUrl;
  const name = title?.trim() || 'Your event title';

  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md border bg-background p-0.5 text-sm" role="tablist" aria-label="Preview device">
          <button
            type="button"
            role="tab"
            aria-selected={device === 'phone'}
            onClick={() => setDevice('phone')}
            className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 ${device === 'phone' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
          >
            <Smartphone className="h-4 w-4" aria-hidden="true" /> Phone
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={device === 'desktop'}
            onClick={() => setDevice('desktop')}
            className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 ${device === 'desktop' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
          >
            <Monitor className="h-4 w-4" aria-hidden="true" /> Laptop / tablet
          </button>
        </div>
        {device === 'phone' && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={showSafe} onChange={(e) => setShowSafe(e.target.checked)} />
            Show safe area
          </label>
        )}
      </div>

      {device === 'phone' ? (
        <div className="mx-auto w-[220px]">
          <div className="rounded-[28px] border-4 border-neutral-800 bg-neutral-900 p-1.5 shadow-lg">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[20px] bg-neutral-700">
              {phoneImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={phoneImage} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center px-4 text-center text-xs text-neutral-300">
                  Upload a cover or mobile image to preview
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 pt-10 text-white">
                <p className="line-clamp-2 text-sm font-bold leading-tight">{name}</p>
                <p className="mt-1 flex items-center gap-1 text-[10px] opacity-90">
                  <Calendar className="h-3 w-3" aria-hidden="true" /> Sat 12 Dec
                  <MapPin className="ml-1 h-3 w-3" aria-hidden="true" /> Abuja
                </p>
              </div>
              {showSafe && (
                <>
                  <div className="pointer-events-none absolute inset-[8%] rounded border border-dashed border-emerald-300/90" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[26%] bg-red-500/25 ring-1 ring-inset ring-red-300/70" />
                  <span className="pointer-events-none absolute left-2 top-2 rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] font-semibold text-white">Keep key content inside</span>
                  <span className="pointer-events-none absolute bottom-[27%] right-2 rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-semibold text-white">Title overlay</span>
                </>
              )}
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {usingFallback ? 'No mobile image yet: phones will show your cover image, cropped to 4:5.' : mobileImageUrl ? 'Phones will show this image.' : 'Phones show the mobile image, or the cover if there is none.'}
          </p>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-[360px]">
          <div className="rounded-t-lg border-4 border-b-0 border-neutral-800 bg-neutral-900 p-1.5">
            <div className="relative aspect-video overflow-hidden rounded bg-neutral-700">
              {coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverImageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center px-4 text-center text-xs text-neutral-300">Upload a cover image</div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8 text-white">
                <p className="line-clamp-1 text-sm font-bold">{name}</p>
              </div>
            </div>
          </div>
          <div className="mx-auto h-2 w-[110%] -translate-x-[4.5%] rounded-b-lg bg-neutral-800" />
          <p className="mt-2 text-center text-xs text-muted-foreground">Laptops and tablets (640px and wider) always use the cover image.</p>
        </div>
      )}
    </div>
  );
}
