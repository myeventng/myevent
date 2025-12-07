// lib/email/templates/invitation-email.ts
interface InvitationEmailData {
  guestName: string;
  eventTitle: string;
  eventDescription: string;
  eventDate: string;
  eventTime: string;
  venueName: string;
  venueAddress: string;
  rsvpLink: string;
  organizerName: string;
  plusOnesAllowed: number;
  rsvpDeadline?: string;
  specialRequirements?: string;
}

export function getInvitationEmailTemplate(data: InvitationEmailData): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>You're Invited!</title>
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
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
        .event-details {
          background-color: #f8f9fa;
          border-left: 4px solid #667eea;
          padding: 20px;
          margin: 20px 0;
        }
        .event-details p {
          margin: 10px 0;
        }
        .event-details strong {
          color: #667eea;
        }
        .button {
          display: inline-block;
          padding: 15px 30px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
          font-weight: bold;
          text-align: center;
        }
        .button:hover {
          opacity: 0.9;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 20px;
          text-align: center;
          color: #666;
          font-size: 14px;
        }
        .divider {
          border-top: 1px solid #e0e0e0;
          margin: 30px 0;
        }
        @media only screen and (max-width: 600px) {
          .content {
            padding: 20px 15px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✉️ You're Invited!</h1>
        </div>
        
        <div class="content">
          <p>Dear ${data.guestName},</p>
          
          <p>You are cordially invited to:</p>
          
          <div class="event-details">
            <h2 style="margin-top: 0; color: #667eea;">${data.eventTitle}</h2>
            <p>${data.eventDescription}</p>
            
            <div class="divider"></div>
            
            <p><strong>📅 Date:</strong> ${data.eventDate}</p>
            <p><strong>🕐 Time:</strong> ${data.eventTime}</p>
            <p><strong>📍 Venue:</strong> ${data.venueName}</p>
            <p><strong>🗺️ Address:</strong> ${data.venueAddress}</p>
            
            ${
              data.plusOnesAllowed > 0
                ? `
              <p><strong>👥 Plus Ones:</strong> You may bring up to ${data.plusOnesAllowed} guest${data.plusOnesAllowed !== 1 ? 's' : ''}</p>
            `
                : ''
            }
            
            ${
              data.rsvpDeadline
                ? `
              <p><strong>⏰ RSVP By:</strong> ${data.rsvpDeadline}</p>
            `
                : ''
            }
            
            ${
              data.specialRequirements
                ? `
              <div class="divider"></div>
              <p><strong>📝 Special Requirements:</strong></p>
              <p>${data.specialRequirements}</p>
            `
                : ''
            }
          </div>
          
          <p>Please let us know if you can attend by clicking the button below:</p>
          
          <div style="text-align: center;">
            <a href="${data.rsvpLink}" class="button">
              RSVP Now
            </a>
          </div>
          
          <p style="margin-top: 30px; font-size: 14px; color: #666;">
            This is a private invitation. Please do not share this link with others.
          </p>
          
          <p>We look forward to seeing you there!</p>
          
          <p>Best regards,<br>${data.organizerName}</p>
        </div>
        
        <div class="footer">
          <p>This invitation was sent to ${data.guestName}</p>
          <p>If you have any questions, please contact the event organizer.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Plain text version
export function getInvitationEmailText(data: InvitationEmailData): string {
  return `
You're Invited!

Dear ${data.guestName},

You are cordially invited to: ${data.eventTitle}

${data.eventDescription}

EVENT DETAILS:
Date: ${data.eventDate}
Time: ${data.eventTime}
Venue: ${data.venueName}
Address: ${data.venueAddress}

${data.plusOnesAllowed > 0 ? `Plus Ones: You may bring up to ${data.plusOnesAllowed} guest${data.plusOnesAllowed !== 1 ? 's' : ''}` : ''}
${data.rsvpDeadline ? `RSVP By: ${data.rsvpDeadline}` : ''}
${data.specialRequirements ? `\nSpecial Requirements:\n${data.specialRequirements}` : ''}

Please RSVP by visiting: ${data.rsvpLink}

We look forward to seeing you there!

Best regards,
${data.organizerName}

---
This is a private invitation. Please do not share this link with others.
  `;
}
