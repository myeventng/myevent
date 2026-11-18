'use client';

import { MessageCircle } from 'lucide-react';
import { useWhatsappWidget } from '@/lib/queries';
import { initialsOf, normalizeWhatsappNumber, whatsappLink } from '@/lib/whatsapp';

interface ButtonViewProps {
  name?: string;
  image?: string;
}

/**
 * What the button looks like. Shared by the live widget and the admin preview so they match.
 *  - no name and no photo: round green button, "Chat with us" slides out on hover
 *  - name and/or photo: a card with the person's photo (or initials), "Chat with {name}" and
 *    "on WhatsApp"; on small screens only the photo shows to keep it compact
 */
export function WhatsappButtonView({ name = '', image = '' }: ButtonViewProps) {
  const hasProfile = Boolean(name.trim() || image.trim());

  if (!hasProfile) {
    return (
      <>
        <MessageCircle className="h-7 w-7" aria-hidden="true" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-bold transition-all duration-300 group-hover:ml-2 group-hover:max-w-[8rem] group-focus-visible:ml-2 group-focus-visible:max-w-[8rem]">
          Chat with us
        </span>
      </>
    );
  }

  return (
    <>
      <span className="relative shrink-0">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            className="h-12 w-12 rounded-full border-2 border-white object-cover"
            onError={(e) => {
              e.currentTarget.style.visibility = 'hidden';
            }}
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-[var(--me-bg)] text-base font-bold text-white"
          >
            {initialsOf(name) || <MessageCircle className="h-6 w-6" />}
          </span>
        )}
        <span
          aria-hidden="true"
          className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#25D366] text-white sm:hidden"
        >
          <MessageCircle className="h-3 w-3" />
        </span>
      </span>
      <span className="hidden min-w-0 pr-3 leading-tight sm:block">
        <span className="block max-w-[13rem] truncate text-sm font-bold">
          {name.trim() ? `Chat with ${name.trim()}` : 'Chat with us'}
        </span>
        <span className="block text-xs opacity-90">on WhatsApp</span>
      </span>
    </>
  );
}

/**
 * Floating WhatsApp chat button, bottom right of the public site.
 * The number, first message, and the optional contact name and photo are set in
 * Admin > Inbox > WhatsApp Chat (admins and staff).
 * Renders nothing while loading, when it is switched off, or when no valid number is set.
 */
export function WhatsappWidget() {
  const { data } = useWhatsappWidget();
  const number = data?.enabled ? normalizeWhatsappNumber(data.number) : null;
  if (!data || !number) return null;

  const name = data.contactName?.trim() ?? '';
  const image = data.contactImage?.trim() ?? '';
  const hasProfile = Boolean(name || image);

  return (
    <a
      href={whatsappLink(number, data.message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={name ? `Chat with ${name} on WhatsApp` : 'Chat with MyEvent on WhatsApp'}
      className={`group fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 flex items-center rounded-full bg-[#25D366] text-white shadow-[3px_3px_0_0_var(--me-violet)] transition-shadow hover:shadow-[3px_3px_0_0_var(--me-red)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:bottom-6 sm:right-6 ${
        hasProfile ? 'gap-2.5 p-1.5' : 'gap-0 p-3.5'
      }`}
    >
      <WhatsappButtonView name={name} image={image} />
    </a>
  );
}
