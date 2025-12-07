// lib/email/send-rsvp-confirmation.ts
import { getRSVPConfirmationTemplate } from './templates/rsvp-confirmation-email';
import { format } from 'date-fns';
import { sendEmail } from './email-service';

interface SendRSVPConfirmationParams {
  invitation: {
    guestName: string;
    guestEmail: string;
    rsvpResponse: 'ATTENDING' | 'NOT_ATTENDING' | 'MAYBE';
    plusOnesConfirmed: number;
    plusOneNames: string[];
    inviteOnlyEvent: {
      event: {
        title: string;
        startDateTime: Date;
        venue: {
          name: string;
          address: string;
        };
      };
    };
  };
}

export async function sendRSVPConfirmationEmail({
  invitation,
}: SendRSVPConfirmationParams) {
  const event = invitation.inviteOnlyEvent.event;

  const emailData = {
    guestName: invitation.guestName,
    eventTitle: event.title,
    eventDate: format(new Date(event.startDateTime), 'EEEE, MMMM d, yyyy'),
    eventTime: format(new Date(event.startDateTime), 'h:mm a'),
    venueName: event.venue.name,
    venueAddress: event.venue.address,
    rsvpResponse: invitation.rsvpResponse,
    plusOnesConfirmed: invitation.plusOnesConfirmed,
    plusOneNames: invitation.plusOneNames,
  };

  const subject =
    invitation.rsvpResponse === 'ATTENDING'
      ? `RSVP Confirmed: ${event.title}`
      : `RSVP Received: ${event.title}`;

  return await sendEmail({
    to: invitation.guestEmail,
    subject,
    html: getRSVPConfirmationTemplate(emailData),
  });
}
