'use client';

import { MessageCircle } from 'lucide-react';
import { useWhatsappWidget } from '@/lib/queries';
import { normalizeWhatsappNumber, whatsappLink } from '@/lib/whatsapp';

/**
 * Floating WhatsApp chat button, bottom right of the public site.
 * The number and first message are set in Admin > Inbox > WhatsApp Chat (admins and staff).
 * Renders nothing while loading, when it is switched off, or when no valid number is set.
 */
export function WhatsappWidget() {
  const { data } = useWhatsappWidget();
  const number = data?.enabled ? normalizeWhatsappNumber(data.number) : null;
  if (!data || !number) return null;

  return (
    <a
      href={whatsappLink(number, data.message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with MyEvent on WhatsApp"
      className="group fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 flex items-center gap-0 rounded-full bg-[#25D366] p-3.5 text-white shadow-[3px_3px_0_0_var(--me-violet)] transition-shadow hover:shadow-[3px_3px_0_0_var(--me-red)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:bottom-6 sm:right-6"
    >
      <MessageCircle className="h-7 w-7" aria-hidden="true" />
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-bold transition-all duration-300 group-hover:ml-2 group-hover:max-w-[8rem] group-focus-visible:ml-2 group-focus-visible:max-w-[8rem]">
        Chat with us
      </span>
    </a>
  );
}
