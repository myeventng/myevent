// lib/email/send-reminder-email.ts
import { getReminderEmailTemplate } from './templates/reminder-email';
import { differenceInDays, format } from 'date-fns';
import { sendEmail } from './email-service';

interface SendReminderEmailParams {
  invitation: {
    guestName: string;
    guestEmail: string;
    invitationCode: string;
    rsvpResponse: string | null;
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

export async function sendReminderEmail({
  invitation,
}: SendReminderEmailParams) {
  const event = invitation.inviteOnlyEvent.event;
  const daysUntilEvent = differenceInDays(
    new Date(event.startDateTime),
    new Date()
  );
  const rsvpLink = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitation.invitationCode}`;

  const emailData = {
    guestName: invitation.guestName,
    eventTitle: event.title,
    eventDate: format(new Date(event.startDateTime), 'EEEE, MMMM d, yyyy'),
    eventTime: format(new Date(event.startDateTime), 'h:mm a'),
    venueName: event.venue.name,
    venueAddress: event.venue.address,
    daysUntilEvent,
    hasRSVPd: invitation.rsvpResponse !== null,
    rsvpLink: invitation.rsvpResponse === null ? rsvpLink : undefined,
  };

  return await sendEmail({
    to: invitation.guestEmail,
    subject: `Reminder: ${event.title} is in ${daysUntilEvent} day${daysUntilEvent !== 1 ? 's' : ''}`,
    html: getReminderEmailTemplate(emailData),
  });
}
