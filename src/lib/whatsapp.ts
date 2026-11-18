/** Shared helpers for the WhatsApp chat widget (safe to import from client and server code). */

export const WHATSAPP_SETTING_KEY = 'site.whatsapp';
export const WHATSAPP_MAX_MESSAGE = 300;
export const WHATSAPP_MAX_NAME = 60;

export interface WhatsappWidgetConfig {
  enabled: boolean;
  /** Digits only, with country code and no "+", e.g. 2348012345678. */
  number: string;
  /** Text pre-filled in the visitor's chat. */
  message: string;
  /** Optional: who visitors will be chatting with, e.g. "Amaka". Empty when not set. */
  contactName?: string;
  /** Optional: https URL of that person's photo. Empty when not set. */
  contactImage?: string;
}

export interface WhatsappSettings extends WhatsappWidgetConfig {
  updatedAt?: string | null;
  updatedBy?: string | null;
}

/**
 * Turns what a person types into the digits WhatsApp links need.
 * "0801 234 5678" -> 2348012345678 (a leading 0 is read as Nigeria), "+44 7700 900123" -> 447700900123.
 * Returns null when it does not look like a phone number.
 */
export function normalizeWhatsappNumber(input: string): string | null {
  let digits = (input ?? '').replace(/[^\d]/g, '');
  if (!digits) return null;
  if (digits.startsWith('00')) digits = digits.slice(2); // 00234... -> 234...
  else if (digits.startsWith('0')) digits = `234${digits.slice(1)}`; // local Nigerian format
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

export function whatsappLink(number: string, message?: string): string {
  const text = message?.trim() ? `?text=${encodeURIComponent(message.trim())}` : '';
  return `https://wa.me/${number}${text}`;
}

/** Up to two letters for the avatar when there is a name but no photo. */
export function initialsOf(name: string): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
