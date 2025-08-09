// lib/email-ticket-service.ts
import { resend, emailConfig } from '@/lib/resend';
import {
  PDFTicketGenerator,
  formatPrice,
  formatDateTime,
} from '@/utils/pdf-ticket-generator';

interface EmailTicketData {
  ticket: any;
  customerEmail: string;
  customerName: string;
}

export class EmailTicketService {
  // Generate ticket PDF as attachment
  private async generateTicketPDFBuffer(ticket: any): Promise<Buffer> {
    const generator = new PDFTicketGenerator();

    const ticketData = {
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
    };

    generator.generateTicket(ticketData);
    const pdfBlob = generator.getBlob();

    // Convert blob to buffer
    const arrayBuffer = await pdfBlob.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // Create HTML email template
  private createEmailTemplate(ticket: any): string {
    const event = ticket.ticketType.event;
    const ticketType = ticket.ticketType;

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Event Ticket</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
          }
          .container {
            background-color: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: bold;
          }
          .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 16px;
          }
          .ticket-id {
            background-color: #f59e0b;
            color: white;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            margin: 20px 0;
          }
          .details-section {
            margin: 25px 0;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #6366f1;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e5e7eb;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #f3f4f6;
          }
          .detail-row:last-child {
            border-bottom: none;
          }
          .detail-label {
            font-weight: 600;
            color: #6b7280;
            flex: 1;
          }
          .detail-value {
            font-weight: 500;
            color: #1f2937;
            flex: 2;
            text-align: right;
          }
          .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .status-unused {
            background-color: #dbeafe;
            color: #1e40af;
          }
          .status-used {
            background-color: #dcfce7;
            color: #166534;
          }
          .instructions {
            background-color: #fffbeb;
            border-left: 4px solid #f59e0b;
            padding: 20px;
            margin: 25px 0;
            border-radius: 0 8px 8px 0;
          }
          .instructions h3 {
            margin-top: 0;
            color: #92400e;
          }
          .instructions ul {
            margin: 0;
            padding-left: 20px;
          }
          .instructions li {
            margin: 8px 0;
            color: #78350f;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
          }
          .support-info {
            background-color: #f3f4f6;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .support-info h4 {
            margin-top: 0;
            color: #374151;
          }
          .attachment-note {
            background-color: #e0f2fe;
            border: 1px solid #81d4fa;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .attachment-note strong {
            color: #0277bd;
          }
          @media (max-width: 600px) {
            body {
              padding: 10px;
            }
            .container {
              padding: 20px;
            }
            .detail-row {
              flex-direction: column;
              align-items: flex-start;
            }
            .detail-value {
              text-align: left;
              margin-top: 5px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your Event Ticket</h1>
            <p>Thank you for your purchase!</p>
          </div>

          <div class="ticket-id">
            Ticket ID: ${ticket.ticketId}
          </div>

          <div class="attachment-note">
            <strong>📎 Your ticket is attached as a PDF file.</strong> You can either print it or show the digital version on your mobile device at the event entrance.
          </div>

          <div class="details-section">
            <div class="section-title">🎪 Event Information</div>
            <div class="detail-row">
              <span class="detail-label">Event:</span>
              <span class="detail-value">${event.title}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date & Time:</span>
              <span class="detail-value">${formatDateTime(event.startDateTime)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Venue:</span>
              <span class="detail-value">${event.venue.name}${event.venue.city?.name ? `, ${event.venue.city.name}` : ''}</span>
            </div>
          </div>

          <div class="details-section">
            <div class="section-title">🎫 Ticket Details</div>
            <div class="detail-row">
              <span class="detail-label">Ticket Type:</span>
              <span class="detail-value">${ticketType.name}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Price:</span>
              <span class="detail-value">${formatPrice(ticketType.price)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Status:</span>
              <span class="detail-value">
                <span class="status-badge ${ticket.status === 'USED' ? 'status-used' : 'status-unused'}">
                  ${ticket.status}
                </span>
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Purchase Date:</span>
              <span class="detail-value">${formatDateTime(ticket.purchasedAt)}</span>
            </div>
            ${
              ticket.order
                ? `
            <div class="detail-row">
              <span class="detail-label">Order ID:</span>
              <span class="detail-value">${ticket.order.id}</span>
            </div>
            `
                : ''
            }
          </div>

          <div class="instructions">
            <h3>📋 Important Instructions</h3>
            <ul>
              <li><strong>Arrival:</strong> Please arrive at least 30 minutes before the event start time</li>
              <li><strong>Entry:</strong> Present your ticket (digital or printed) at the entrance</li>
              <li><strong>ID Verification:</strong> Bring a valid ID if required by the event organizer</li>
              <li><strong>Contact:</strong> Contact customer support for any issues or questions</li>
              <li><strong>Ticket Safety:</strong> Keep this ticket safe until after the event</li>
            </ul>
          </div>

          <div class="support-info">
            <h4>📞 Need Help?</h4>
            <p>If you have any questions or need assistance, please contact our customer support team:</p>
            <p><strong>Email:</strong> support@eventhub.ng</p>
            <p><strong>Phone:</strong> +234 (0) 123 456 7890</p>
            <p><strong>Website:</strong> www.eventhub.ng</p>
          </div>

          <div class="footer">
            <p>This email was sent to ${ticket.user?.email || 'you'} regarding your ticket purchase.</p>
            <p>© 2024 EventHub Nigeria. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Send ticket email
  async sendTicketEmail({
    ticket,
    customerEmail,
    customerName,
  }: EmailTicketData): Promise<{ success: boolean; message: string }> {
    try {
      // Generate PDF attachment
      const pdfBuffer = await this.generateTicketPDFBuffer(ticket);

      // Create email template
      const htmlContent = this.createEmailTemplate(ticket);

      // Prepare email data
      const emailData = {
        from: emailConfig.from,
        to: emailConfig.testMode ? [emailConfig.testEmail!] : [customerEmail],
        subject: `🎟️ Your Ticket for ${ticket.ticketType.event.title} - ${ticket.ticketId}`,
        html: htmlContent,
        attachments: [
          {
            filename: `ticket_${ticket.ticketId}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
        replyTo: emailConfig.replyTo,
      };

      // Send email
      const { data, error } = await resend.emails.send(emailData);

      if (error) {
        console.error('Resend error:', error);
        return {
          success: false,
          message: `Failed to send email: ${error.message}`,
        };
      }

      console.log('Email sent successfully:', data);

      return {
        success: true,
        message: emailConfig.testMode
          ? `Test email sent successfully to ${emailConfig.testEmail}`
          : `Ticket sent successfully to ${customerEmail}`,
      };
    } catch (error) {
      console.error('Error sending ticket email:', error);
      return {
        success: false,
        message: 'Failed to send ticket email due to an unexpected error',
      };
    }
  }

  // Send ticket to multiple recipients (for bulk operations)
  async sendBulkTicketEmails(
    tickets: { ticket: any; customerEmail: string; customerName: string }[]
  ): Promise<{
    success: boolean;
    message: string;
    results: { success: boolean; email: string; message: string }[];
  }> {
    const results = [];
    let successCount = 0;

    for (const ticketData of tickets) {
      const result = await this.sendTicketEmail(ticketData);
      results.push({
        success: result.success,
        email: ticketData.customerEmail,
        message: result.message,
      });

      if (result.success) {
        successCount++;
      }

      // Add delay to avoid rate limiting
      if (tickets.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return {
      success: successCount > 0,
      message: `${successCount}/${tickets.length} emails sent successfully`,
      results,
    };
  }
}

export const emailTicketService = new EmailTicketService();
