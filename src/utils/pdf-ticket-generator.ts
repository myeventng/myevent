// utils/pdf-ticket-generator.ts - Fixed for server-side email generation
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import QRCode from 'qrcode';

const COMPANY_CONFIG = {
  name: 'MyEvent.com.ng',
  logo: '/logo.png',
  tagline: 'Your Gateway to Amazing Events',
  contact: {
    phone: '+234 (906) 635-5861',
    email: 'info@myevent.com.ng',
    website: 'www.myevent.com.ng',
    address: '49B Thuja Ville, NNPC Estate, Utako, Abuja',
  },
  social: {
    facebook: '@myeventtng',
    twitter: '@myeventtng',
    instagram: '@myeventtng',
    linkedin: 'MyEvent.com.ng',
  },
  colors: {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    accent: '#f59e0b',
    gradientStart: '#4c1d95',
    gradientMid: '#7c3aed',
    gradientEnd: '#a855f7',
    text: '#1f2937',
    textLight: '#6b7280',
  },
};

interface TicketData {
  ticketId: string;
  eventTitle: string;
  eventDate: string;
  venue: string;
  ticketType: string;
  price: string;
  customerName: string;
  customerEmail: string;
  purchaseDate: string;
  status: string;
  qrCode?: string;
  orderId?: string;
  quantity?: number;
  instructions?: string[];
  eventId?: string;
}

/* ===== Helpers ===== */
const hexToRgb = (hex: string) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)!;
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16),
  };
};

const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

/** Replace unsupported glyphs for core fonts */
const normalizeText = (s: string) =>
  s.replace(/₦/g, 'NGN ').replace(/[^\x00-\x7F]/g, (c) => {
    const map: Record<string, string> = {
      '\u2013': '-',
      '\u2014': '-',
      '\u2018': "'",
      '\u2019': "'",
      '\u201C': '"',
      '\u201D': '"',
    };
    return map[c] ?? '';
  });

// Server-side compatible image loading (fallback for email generation)
const loadImageAsBase64 = async (src: string): Promise<string> => {
  try {
    // In server environment, we'll skip logo loading and use fallback
    if (typeof window === 'undefined') {
      return Promise.reject('Server environment - no image loading');
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = reject;
      img.src = src;
    });
  } catch (error) {
    return Promise.reject(error);
  }
};

/* ===== PDF Ticket Generator ===== */
export class PDFTicketGenerator {
  private doc: jsPDF;
  private ticketWidth: number;
  private ticketHeight: number;
  private margin: number = 3;

  constructor() {
    this.ticketWidth = 2.125 * 25.4; // ~54mm
    this.ticketHeight = 7.0 * 25.4; // ~178mm
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [this.ticketWidth, this.ticketHeight],
    });
  }

  async generateTicket(ticketData: TicketData): Promise<void> {
    await this.drawTicketBackground();
    await this.drawTopHeader();
    await this.drawStubBand(ticketData);
    await this.drawTicketId(ticketData.ticketId, 28);
    const afterContent = await this.drawContentCard(ticketData, 42);
    await this.drawQRCode(ticketData, afterContent + 6);
    this.drawFooter();
    this.drawPerimeterAndPerforations();
    this.drawWatermark(ticketData.eventTitle);
  }

  /** Background: smooth vertical gradient */
  private async drawTicketBackground(): Promise<void> {
    const steps = 48;
    const h = this.ticketHeight / steps;
    const c0 = hexToRgb(COMPANY_CONFIG.colors.gradientStart);
    const c1 = hexToRgb(COMPANY_CONFIG.colors.gradientMid);
    const c2 = hexToRgb(COMPANY_CONFIG.colors.gradientEnd);

    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const seg = t < 0.5 ? t / 0.5 : (t - 0.5) / 0.5;
      const a = t < 0.5 ? c0 : c1;
      const b = t < 0.5 ? c1 : c2;
      const r = lerp(a.r, b.r, seg);
      const g = lerp(a.g, b.g, seg);
      const bcol = lerp(a.b, b.b, seg);
      this.doc.setFillColor(r, g, bcol);
      this.doc.rect(0, i * h, this.ticketWidth, h + 0.2, 'F');
    }
  }

  /** Top header with fallback for logo */
  private async drawTopHeader(): Promise<void> {
    const logoHeight = 10;
    const logoY = 3;
    const logoWidth = 20;

    try {
      const dataURL = await loadImageAsBase64(COMPANY_CONFIG.logo);
      this.doc.addImage(
        dataURL,
        'PNG',
        (this.ticketWidth - logoWidth) / 2,
        logoY,
        logoWidth,
        logoHeight
      );
    } catch {
      // Fallback - simple logo placeholder
      this.doc.setFillColor(245, 245, 255);
      this.doc.roundedRect(
        (this.ticketWidth - logoWidth) / 2,
        logoY,
        logoWidth,
        logoHeight,
        1,
        1,
        'F'
      );
      this.doc.setTextColor(139, 60, 246);
      this.doc.setFontSize(4);
      this.doc.text('LOGO', this.ticketWidth / 2, logoY + logoHeight / 2, {
        align: 'center',
      });
    }

    const textY = logoY + logoHeight + 4;
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11);
    this.doc.text(COMPANY_CONFIG.name, this.ticketWidth / 2, textY, {
      align: 'center',
    });

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6);
    this.doc.setTextColor(235, 235, 255);
    this.doc.text(COMPANY_CONFIG.tagline, this.ticketWidth / 2, textY + 4, {
      align: 'center',
    });
  }

  /** Stub band */
  private async drawStubBand(ticket: TicketData): Promise<void> {
    const y = 18;
    const height = 8;
    const { r, g, b } = hexToRgb(COMPANY_CONFIG.colors.accent);
    this.doc.setFillColor(r, g, b);
    this.doc.roundedRect(
      this.margin,
      y,
      this.ticketWidth - this.margin * 2,
      height,
      2,
      2,
      'F'
    );

    const baseline = y + 5.4;
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFont('helvetica', 'bold');

    this.doc.setFontSize(6.2);
    this.doc.text(
      normalizeText(ticket.ticketType).toUpperCase(),
      this.margin + 2.2,
      baseline,
      { align: 'left' }
    );

    this.doc.setFontSize(6.6);
    this.doc.text(
      normalizeText(ticket.price),
      this.ticketWidth - this.margin - 2.2,
      baseline,
      { align: 'right' }
    );
  }

  /** Ticket ID */
  private async drawTicketId(ticketId: string, yPos: number): Promise<void> {
    const { r, g, b } = hexToRgb(COMPANY_CONFIG.colors.secondary);
    this.doc.setFillColor(r, g, b);
    this.doc.roundedRect(
      this.margin,
      yPos - 3.5,
      this.ticketWidth - 2 * this.margin,
      7,
      1.5,
      1.5,
      'F'
    );

    this.doc.setTextColor(255, 255, 255);
    this.doc.setFont('courier', 'bold');
    this.doc.setFontSize(8.2);
    this.doc.text(normalizeText(ticketId), this.ticketWidth / 2, yPos, {
      align: 'center',
    });
  }

  /** Content card */
  private async drawContentCard(
    ticket: TicketData,
    yStart: number
  ): Promise<number> {
    const x = this.margin;
    const w = this.ticketWidth - this.margin * 2;
    const pad = 3;
    let y = yStart;

    this.doc.setFillColor(255, 255, 255);
    this.doc.roundedRect(x, y, w, 40, 2, 2, 'F');

    y += pad + 1.5;

    // Title
    this.doc.setTextColor(17, 24, 39);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8.2);
    const titleLines = this.doc.splitTextToSize(
      normalizeText(ticket.eventTitle),
      w - pad * 2
    );
    this.doc.text(titleLines, x + pad, y);
    y += titleLines.length * 4 + 2.5;

    const labelStyle = () => {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(5.2);
      this.doc.setTextColor(75, 85, 99);
    };
    const valueStyle = () => {
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(31, 41, 55);
    };

    const row = (label: string, value: string) => {
      const lh = 4.8;
      labelStyle();
      this.doc.text(label, x + pad, y);
      valueStyle();
      const lines = this.doc.splitTextToSize(normalizeText(value), w - pad * 2);
      this.doc.text(lines, x + pad, y + 3.2);
      y += Math.max(lh, lines.length * 4) + 1.6;
    };

    row('DATE & TIME', ticket.eventDate);
    row('VENUE', ticket.venue);
    row('ADMIT', `${ticket.customerName}  (${ticket.customerEmail})`);

    // Status pill
    const pillY = y - 0.5;
    const pillText = (ticket.status?.toUpperCase() || 'VALID').slice(0, 18);
    const pillPadX = 2.8;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(5.2);

    const txtW = this.doc.getTextWidth(pillText) + pillPadX * 2;
    const pillX = x + pad;
    this.doc.setFillColor(243, 244, 246);
    this.doc.roundedRect(pillX, pillY, txtW, 5.8, 2, 2, 'F');

    const statusColor =
      pillText === 'PAID' || pillText === 'VALID'
        ? { r: 16, g: 185, b: 129 }
        : pillText === 'PENDING'
          ? { r: 245, g: 158, b: 11 }
          : { r: 239, g: 68, b: 68 };

    this.doc.setFillColor(statusColor.r, statusColor.g, statusColor.b);
    this.doc.circle(pillX + 1.7, pillY + 2.9, 0.9, 'F');

    this.doc.setTextColor(31, 41, 55);
    this.doc.text(pillText, pillX + 3.8, pillY + 4.1);

    return y + 2;
  }

  /** QR Code - larger size for better scanning */
  private async drawQRCode(ticket: TicketData, yPos: number): Promise<number> {
    const qrSize = 38;
    const qrX = (this.ticketWidth - qrSize) / 2;

    try {
      const qrData =
        ticket.qrCode ||
        JSON.stringify({
          ticketId: ticket.ticketId,
          eventId: ticket.eventId,
          customerName: ticket.customerName,
          eventTitle: ticket.eventTitle,
          type: 'EVENT_TICKET',
          timestamp: new Date().toISOString(),
        });

      // Generate QR code as data URL
      const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        width: 400,
        margin: 1,
        color: { dark: '#000000', light: '#FFFFFF' },
        errorCorrectionLevel: 'H',
      });

      // White background card
      this.doc.setFillColor(255, 255, 255);
      this.doc.roundedRect(
        qrX - 4,
        yPos - 4,
        qrSize + 8,
        qrSize + 16,
        2,
        2,
        'F'
      );

      this.doc.addImage(qrCodeDataURL, 'PNG', qrX, yPos, qrSize, qrSize);

      // QR instruction text
      this.doc.setTextColor(55, 65, 81);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(6.5);
      this.doc.text('SCAN AT ENTRY', this.ticketWidth / 2, yPos + qrSize + 6, {
        align: 'center',
      });

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(4.2);
      this.doc.setTextColor(107, 114, 128);
      this.doc.text(
        'Keep the QR code visible. Do not fold.',
        this.ticketWidth / 2,
        yPos + qrSize + 11,
        {
          align: 'center',
        }
      );

      return yPos + qrSize + 16;
    } catch (error) {
      console.error('QR Code generation failed:', error);
      // Fallback block
      this.doc.setFillColor(255, 255, 255);
      this.doc.rect(qrX, yPos, qrSize, qrSize, 'F');
      this.doc.setTextColor(55, 65, 81);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(6.5);
      this.doc.text('QR CODE', this.ticketWidth / 2, yPos + qrSize + 6, {
        align: 'center',
      });
      return yPos + qrSize + 12;
    }
  }

  /** Footer */
  private drawFooter(): void {
    const y = this.ticketHeight - 14;
    this.doc.setFillColor(26, 26, 46);
    this.doc.rect(0, y, this.ticketWidth, 14, 'F');

    this.doc.setTextColor(255, 255, 255);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(3.4);
    this.doc.text(
      COMPANY_CONFIG.contact.website,
      this.ticketWidth / 2,
      y + 3.8,
      { align: 'center' }
    );
    this.doc.text(COMPANY_CONFIG.contact.phone, this.ticketWidth / 2, y + 7.4, {
      align: 'center',
    });
    this.doc.text(
      COMPANY_CONFIG.social.instagram,
      this.ticketWidth / 2,
      y + 11.0,
      { align: 'center' }
    );
  }

  /** Border and perforations */
  private drawPerimeterAndPerforations(): void {
    this.doc.setDrawColor(209, 213, 219);
    this.doc.setLineWidth(0.5);
    this.doc.roundedRect(
      1,
      1,
      this.ticketWidth - 2,
      this.ticketHeight - 2,
      2,
      2
    );

    this.doc.setFillColor(255, 255, 255);
    for (let i = 5; i < this.ticketHeight - 5; i += 3.2)
      this.doc.circle(1, i, 0.45, 'F');
    for (let i = 5; i < this.ticketHeight - 5; i += 3.2)
      this.doc.circle(this.ticketWidth - 1, i, 0.45, 'F');

    this.doc.setTextColor(229, 231, 235);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(4.2);
    this.doc.text('ADMIT ONE', 3.8, 18, { angle: -90 });
  }

  /** Watermark */
  private drawWatermark(title: string): void {
    const txt = normalizeText(title.toUpperCase().slice(0, 24));
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(13);
    this.doc.text(txt, this.ticketWidth * 0.2, this.ticketHeight * 0.25, {
      angle: -35,
      align: 'left',
    });
  }

  save(filename: string): void {
    this.doc.save(filename);
  }

  // Updated to return ArrayBuffer for server-side email generation
  getBlob(): Blob {
    return this.doc.output('blob');
  }

  getArrayBuffer(): ArrayBuffer {
    return this.doc.output('arraybuffer');
  }

  getBuffer(): Buffer {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(this.doc.output('arraybuffer'));
    }
    throw new Error('Buffer is not available in this environment');
  }
}

/* ===== Formatting helpers ===== */
export const formatPrice = (price: number): string =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(
    price
  );

export const formatDateTime = (value: Date | string | number): string => {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return format(d, 'PPP p');
};

/* ===== Public API ===== */
export const generateTicketPDF = async (
  ticket: any,
  filename?: string
): Promise<void> => {
  const ticketData: TicketData = {
    ticketId: ticket.ticketId,
    eventTitle: ticket.ticketType.event.title,
    eventDate: formatDateTime(ticket.ticketType.event.startDateTime),
    venue: `${ticket.ticketType.event.venue.name}${ticket.ticketType.event.venue.city?.name ? `, ${ticket.ticketType.event.venue.city.name}` : ''}`,
    ticketType: ticket.ticketType.name,
    price: formatPrice(ticket.ticketType.price),
    customerName: ticket.user?.name || 'Unknown',
    customerEmail: ticket.user?.email || 'Unknown',
    purchaseDate: formatDateTime(ticket.purchasedAt),
    status: ticket.status,
    qrCode: ticket.qrCodeData || 'available',
    orderId: ticket.order?.id,
    quantity: ticket.order?.quantity,
    eventId: ticket.ticketType.event.id,
  };

  const generator = new PDFTicketGenerator();
  await generator.generateTicket(ticketData);
  generator.save(filename || `ticket_${ticket.ticketId}.pdf`);
};
