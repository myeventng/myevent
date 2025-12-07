// lib/email/bulk-send-invitations.ts
import { sendInvitationEmail } from './send-invitation-email';

export async function bulkSendInvitations(invitations: any[]) {
  const results = {
    sent: 0,
    failed: 0,
    errors: [] as any[],
  };

  for (const invitation of invitations) {
    try {
      const result = await sendInvitationEmail({ invitation });
      if (result.success) {
        results.sent++;
      } else {
        results.failed++;
        results.errors.push({
          email: invitation.guestEmail,
          error: result.error,
        });
      }

      // Add small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      results.failed++;
      results.errors.push({
        email: invitation.guestEmail,
        error,
      });
    }
  }

  return results;
}
