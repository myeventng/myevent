// lib/email/templates/reminder-email.ts
interface ReminderEmailData {
  guestName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  venueName: string;
  venueAddress: string;
  daysUntilEvent: number;
  hasRSVPd: boolean;
  rsvpLink?: string;
}

export function getReminderEmailTemplate(data: ReminderEmailData): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Event Reminder</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
        }
        .header {
          background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%);
          color: white;
          padding: 40px 20px;
          text-align: center;
        }
        .countdown {
          font-size: 48px;
          font-weight: bold;
          margin: 20px 0;
        }
        .content {
          padding: 40px 30px;
        }
        .event-details {
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 20px;
          margin: 20px 0;
        }
        .button {
          display: inline-block;
          padding: 15px 30px;
          background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%);
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
          font-weight: bold;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 20px;
          text-align: center;
          color: #666;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⏰ Event Reminder</h1>
          <div class="countdown">${data.daysUntilEvent}</div>
          <p style="margin: 0; font-size: 18px;">Day${data.daysUntilEvent !== 1 ? 's' : ''} Until the Event!</p>
        </div>
        
        <div class="content">
          <p>Dear ${data.guestName},</p>
          
          <p>This is a friendly reminder that <strong>${data.eventTitle}</strong> is coming up soon!</p>
          
          <div class="event-details">
            <h3 style="margin-top: 0; color: #f59e0b;">Event Details</h3>
            <p><strong>📅 Date:</strong> ${data.eventDate}</p>
            <p><strong>🕐 Time:</strong> ${data.eventTime}</p>
            <p><strong>📍 Venue:</strong> ${data.venueName}</p>
            <p><strong>🗺️ Address:</strong> ${data.venueAddress}</p>
          </div>
          
          ${
            !data.hasRSVPd && data.rsvpLink
              ? `
            <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #991b1b;">
                <strong>⚠️ You haven't RSVP'd yet!</strong><br>
                Please let us know if you can attend.
              </p>
            </div>
            <div style="text-align: center;">
              <a href="${data.rsvpLink}" class="button">RSVP Now</a>
            </div>
          `
              : `
            <p>✅ <strong>Thank you for confirming your attendance!</strong> We're looking forward to seeing you there.</p>
          `
          }
          
          <p><strong>Don't Forget to Bring:</strong></p>
          <ul>
            <li>Your invitation</li>
            <li>A valid ID</li>
            <li>Anything mentioned in the original invitation</li>
          </ul>
          
          <p>See you soon!</p>
        </div>
        
        <div class="footer">
          <p>This is an automated reminder for ${data.eventTitle}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
