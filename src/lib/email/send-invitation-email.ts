import { sendEmail } from './email-service';
import {
  getInvitationEmailTemplate,
  getInvitationEmailText,
} from './templates/invitation-email';
import { format } from 'date-fns';

interface SendInvitationEmailParams {
  invitation: {
    guestName: string;
    guestEmail: string;
    invitationCode: string;
    plusOnesAllowed: number;
    specialRequirements?: string | null;
    inviteOnlyEvent: {
      rsvpDeadline?: Date | null;
      event: {
        title: string;
        description: string | null;
        startDateTime: Date;
        venue: {
          name: string;
          address: string;
        };
        user: {
          name: string;
        } | null; // ✅ FIXED: Accept null
      };
    };
  };
}

export async function sendInvitationEmail({
  invitation,
}: SendInvitationEmailParams) {
  const event = invitation.inviteOnlyEvent.event;
  const rsvpLink = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitation.invitationCode}`;

  const emailData = {
    guestName: invitation.guestName,
    eventTitle: event.title,
    eventDescription: event.description || '',
    eventDate: format(new Date(event.startDateTime), 'EEEE, MMMM d, yyyy'),
    eventTime: format(new Date(event.startDateTime), 'h:mm a'),
    venueName: event.venue.name,
    venueAddress: event.venue.address,
    rsvpLink,
    organizerName: event.user?.name || 'Event Organizer',
    plusOnesAllowed: invitation.plusOnesAllowed,
    rsvpDeadline: invitation.inviteOnlyEvent.rsvpDeadline
      ? format(
          new Date(invitation.inviteOnlyEvent.rsvpDeadline),
          'EEEE, MMMM d, yyyy'
        )
      : undefined,
    specialRequirements: invitation.specialRequirements || undefined,
  };

  return await sendEmail({
    to: invitation.guestEmail,
    subject: `You're Invited to ${event.title}`,
    html: getInvitationEmailTemplate(emailData),
    text: getInvitationEmailText(emailData),
  });
}
