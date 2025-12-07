// lib/email/templates/rsvp-confirmation-email.ts
interface RSVPConfirmationData {
  guestName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  venueName: string;
  venueAddress: string;
  rsvpResponse: 'ATTENDING' | 'NOT_ATTENDING' | 'MAYBE';
  plusOnesConfirmed?: number;
  plusOneNames?: string[];
}

export function getRSVPConfirmationTemplate(
  data: RSVPConfirmationData
): string {
  const responseMessages = {
    ATTENDING: {
      title: '✅ RSVP Confirmed - See You There!',
      message: "We're excited to confirm your attendance!",
      color: '#10b981',
    },
    NOT_ATTENDING: {
      title: "😢 We'll Miss You",
      message:
        'Thank you for letting us know. We hope to see you at future events!',
      color: '#ef4444',
    },
    MAYBE: {
      title: '🤔 RSVP Received',
      message: 'Thank you for your response. We hope you can make it!',
      color: '#f59e0b',
    },
  };

  const response = responseMessages[data.rsvpResponse];

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>RSVP Confirmation</title>
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
          background-color: ${response.color};
          color: white;
          padding: 40px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
        }
        .content {
          padding: 40px 30px;
        }
        .confirmation-box {
          background-color: #f8f9fa;
          border: 2px solid ${response.color};
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          text-align: center;
        }
        .event-details {
          background-color: #f8f9fa;
          padding: 20px;
          margin: 20px 0;
          border-radius: 8px;
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
          <h1>${response.title}</h1>
        </div>
        
        <div class="content">
          <p>Dear ${data.guestName},</p>
          
          <div class="confirmation-box">
            <h2 style="color: ${response.color}; margin-top: 0;">${response.message}</h2>
            <p style="font-size: 18px; margin: 10px 0;">
              <strong>Your Response:</strong> ${data.rsvpResponse === 'ATTENDING' ? 'Attending' : data.rsvpResponse === 'NOT_ATTENDING' ? 'Not Attending' : 'Maybe'}
            </p>
            ${
              data.plusOnesConfirmed && data.plusOnesConfirmed > 0
                ? `
              <p style="font-size: 16px;">
                <strong>Plus Ones:</strong> ${data.plusOnesConfirmed}
                ${data.plusOneNames && data.plusOneNames.length > 0 ? `<br><small>(${data.plusOneNames.join(', ')})</small>` : ''}
              </p>
            `
                : ''
            }
          </div>
          
          ${
            data.rsvpResponse === 'ATTENDING'
              ? `
            <div class="event-details">
              <h3 style="margin-top: 0;">Event Reminder</h3>
              <p><strong>Event:</strong> ${data.eventTitle}</p>
              <p><strong>Date:</strong> ${data.eventDate}</p>
              <p><strong>Time:</strong> ${data.eventTime}</p>
              <p><strong>Venue:</strong> ${data.venueName}</p>
              <p><strong>Address:</strong> ${data.venueAddress}</p>
            </div>
            
            <p><strong>What to Bring:</strong></p>
            <ul>
              <li>Your invitation (digital or printed)</li>
              <li>A valid ID</li>
              <li>Your enthusiasm! 🎉</li>
            </ul>
            
            <p>We look forward to seeing you there!</p>
          `
              : ''
          }
          
          <p style="margin-top: 30px; font-size: 14px; color: #666;">
            Need to change your RSVP? You can update your response using your original invitation link.
          </p>
        </div>
        
        <div class="footer">
          <p>Thank you for your response!</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
