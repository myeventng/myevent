// src/lib/ticket-pdf.ts
// Builds a PDF ticket (Buffer) on the server for use as an email attachment.
// Shared by the purchase-time email flow. Never throws — returns null on failure
// so a PDF problem can't block the ticket email itself.

import {
  PDFTicketGenerator,
  formatPrice,
  formatDateTime,
} from '@/utils/pdf-ticket-generator';

interface BuildTicketPdfInput {
  ticket: any;
  event: any;
  venue: any;
  buyerName: string;
  buyerEmail: string;
  orderId?: string;
  quantity?: number;
  isGuest?: boolean;
  qrCodeData?: string; // JSON string encoded into the PDF's QR code
}

export async function buildTicketPdfBuffer(
  input: BuildTicketPdfInput
): Promise<Buffer | null> {
  const { ticket, event, venue, buyerName, buyerEmail } = input;

  try {
    const cityName = venue?.city?.name;
    const generator = new PDFTicketGenerator();

    await generator.generateTicket({
      ticketId: ticket.ticketId || ticket.id,
      eventTitle: event?.title ?? 'Event',
      eventDate: event?.startDateTime ? formatDateTime(event.startDateTime) : '',
      venue: `${venue?.name ?? ''}${cityName ? `, ${cityName}` : ''}`,
      ticketType: ticket.ticketType?.name ?? 'General',
      price: formatPrice(Number(ticket.ticketType?.price ?? 0)),
      customerName: ticket.user?.name || buyerName || 'Guest',
      customerEmail: ticket.user?.email || buyerEmail || '',
      purchaseDate: formatDateTime(ticket.purchasedAt ?? new Date()),
      status: ticket.status ?? 'UNUSED',
      qrCode: input.qrCodeData,
      orderId: input.orderId,
      quantity: input.quantity,
      eventId: event?.id,
      isGuest: input.isGuest,
    });

    return generator.getBuffer();
  } catch (error) {
    console.error(
      `⚠️ PDF generation failed for ticket ${ticket?.ticketId ?? ticket?.id}:`,
      error
    );
    return null;
  }
}
