'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { getPlatformFee } from '@/lib/platform-settings';
import { sendInvitationEmail } from '@/lib/email/send-invitation-email';
import { sendRSVPConfirmationEmail } from '@/lib/email/send-rsvp-confirmation';
import { sendDonationReceiptEmail } from '@/lib/email/send-donation-receipt';
import { bulkSendInvitations } from '@/lib/email/bulk-send-invitations';

interface ActionResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

// Generate unique invitation code
function generateInvitationCode(): string {
  return crypto.randomBytes(16).toString('hex');
}

// CREATE INVITE-ONLY EVENT CONFIGURATION
export async function createInviteOnlyEvent(data: {
  eventId: string;
  maxInvitations?: number;
  allowPlusOnes: boolean;
  maxPlusOnes?: number;
  requireRSVP: boolean;
  rsvpDeadline?: Date;
  sendAutoReminders: boolean;
  reminderDaysBefore?: number;
  acceptDonations: boolean;
  suggestedDonation?: number;
  minimumDonation?: number;
  donationDescription?: string;
  showDonorNames: boolean;
  isPrivate: boolean;
  requireApproval: boolean;
}): Promise<ActionResponse<any>> {
  try {
    const inviteOnlyEvent = await prisma.inviteOnlyEvent.create({
      data: {
        eventId: data.eventId,
        maxInvitations: data.maxInvitations,
        allowPlusOnes: data.allowPlusOnes,
        maxPlusOnes: data.maxPlusOnes,
        requireRSVP: data.requireRSVP,
        rsvpDeadline: data.rsvpDeadline,
        sendAutoReminders: data.sendAutoReminders,
        reminderDaysBefore: data.reminderDaysBefore,
        acceptDonations: data.acceptDonations,
        suggestedDonation: data.suggestedDonation,
        minimumDonation: data.minimumDonation,
        donationDescription: data.donationDescription,
        showDonorNames: data.showDonorNames,
        isPrivate: data.isPrivate,
        requireApproval: data.requireApproval,
      },
    });

    return {
      success: true,
      message: 'Invite-only event configuration created successfully',
      data: inviteOnlyEvent,
    };
  } catch (error) {
    console.error('Error creating invite-only event:', error);
    return {
      success: false,
      message: 'Failed to create invite-only event configuration',
    };
  }
}

// UPDATE INVITE-ONLY EVENT CONFIGURATION
export async function updateInviteOnlyEvent(data: {
  id: string;
  maxInvitations?: number;
  allowPlusOnes: boolean;
  maxPlusOnes?: number;
  requireRSVP: boolean;
  rsvpDeadline?: Date;
  sendAutoReminders: boolean;
  reminderDaysBefore?: number;
  acceptDonations: boolean;
  suggestedDonation?: number;
  minimumDonation?: number;
  donationDescription?: string;
  showDonorNames: boolean;
  isPrivate: boolean;
  requireApproval: boolean;
}): Promise<ActionResponse<any>> {
  try {
    const inviteOnlyEvent = await prisma.inviteOnlyEvent.update({
      where: { id: data.id },
      data: {
        maxInvitations: data.maxInvitations,
        allowPlusOnes: data.allowPlusOnes,
        maxPlusOnes: data.maxPlusOnes,
        requireRSVP: data.requireRSVP,
        rsvpDeadline: data.rsvpDeadline,
        sendAutoReminders: data.sendAutoReminders,
        reminderDaysBefore: data.reminderDaysBefore,
        acceptDonations: data.acceptDonations,
        suggestedDonation: data.suggestedDonation,
        minimumDonation: data.minimumDonation,
        donationDescription: data.donationDescription,
        showDonorNames: data.showDonorNames,
        isPrivate: data.isPrivate,
        requireApproval: data.requireApproval,
      },
    });

    return {
      success: true,
      message: 'Invite-only event configuration updated successfully',
      data: inviteOnlyEvent,
    };
  } catch (error) {
    console.error('Error updating invite-only event:', error);
    return {
      success: false,
      message: 'Failed to update invite-only event configuration',
    };
  }
}

// CREATE INVITATION
export async function createInvitation(data: {
  inviteOnlyEventId: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  plusOnesAllowed: number;
  specialRequirements?: string;
  organizerNotes?: string;
  sendEmail?: boolean;
}): Promise<ActionResponse<any>> {
  try {
    // Check if invitation already exists
    const existingInvitation = await prisma.invitation.findUnique({
      where: {
        inviteOnlyEventId_guestEmail: {
          inviteOnlyEventId: data.inviteOnlyEventId,
          guestEmail: data.guestEmail,
        },
      },
    });

    if (existingInvitation) {
      return {
        success: false,
        message: 'An invitation already exists for this email address',
      };
    }

    // Generate unique invitation code
    const invitationCode = generateInvitationCode();

    const invitation = await prisma.invitation.create({
      data: {
        inviteOnlyEventId: data.inviteOnlyEventId,
        guestName: data.guestName,
        guestEmail: data.guestEmail,
        guestPhone: data.guestPhone,
        invitationCode,
        plusOnesAllowed: data.plusOnesAllowed,
        specialRequirements: data.specialRequirements,
        organizerNotes: data.organizerNotes,
        invitationSentAt: data.sendEmail ? new Date() : undefined,
      },
      include: {
        inviteOnlyEvent: {
          include: {
            event: {
              include: {
                venue: true,
                user: true,
              },
            },
          },
        },
      },
    });

    // Send invitation email if requested
    if (data.sendEmail) {
      if (data.sendEmail) {
        try {
          await sendInvitationEmail({
            invitation: {
              ...invitation,
              specialRequirements: invitation.specialRequirements || undefined,
            },
          });
          console.log(`Invitation email sent to ${data.guestEmail}`);
        } catch (emailError) {
          console.error('Error sending invitation email:', emailError);
          // Don't fail the invitation creation if email fails
        }
      }
    }

    return {
      success: true,
      message: 'Invitation created successfully',
      data: invitation,
    };
  } catch (error) {
    console.error('Error creating invitation:', error);
    return {
      success: false,
      message: 'Failed to create invitation',
    };
  }
}

// BULK CREATE INVITATIONS
export async function bulkCreateInvitations(data: {
  inviteOnlyEventId: string;
  guests: Array<{
    guestName: string;
    guestEmail: string;
    guestPhone?: string;
    plusOnesAllowed: number;
    specialRequirements?: string;
    organizerNotes?: string;
  }>;
  sendEmails?: boolean;
}): Promise<ActionResponse<{ successful: number; failed: number }>> {
  let successful = 0;
  let failed = 0;

  for (const guest of data.guests) {
    const result = await createInvitation({
      inviteOnlyEventId: data.inviteOnlyEventId,
      ...guest,
      sendEmail: data.sendEmails,
    });

    if (result.success) {
      successful++;
    } else {
      failed++;
      console.error(
        `Failed to create invitation for ${guest.guestEmail}:`,
        result.message
      );
    }
  }

  return {
    success: true,
    message: `Created ${successful} invitations${failed > 0 ? `, ${failed} failed` : ''}`,
    data: { successful, failed },
  };
}

// UPDATE INVITATION
export async function updateInvitation(data: {
  id: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  plusOnesAllowed?: number;
  specialRequirements?: string;
  organizerNotes?: string;
}): Promise<ActionResponse<any>> {
  try {
    const invitation = await prisma.invitation.update({
      where: { id: data.id },
      data: {
        guestName: data.guestName,
        guestEmail: data.guestEmail,
        guestPhone: data.guestPhone,
        plusOnesAllowed: data.plusOnesAllowed,
        specialRequirements: data.specialRequirements,
        organizerNotes: data.organizerNotes,
      },
    });

    return {
      success: true,
      message: 'Invitation updated successfully',
      data: invitation,
    };
  } catch (error) {
    console.error('Error updating invitation:', error);
    return {
      success: false,
      message: 'Failed to update invitation',
    };
  }
}

// DELETE INVITATION
export async function deleteInvitation(
  id: string
): Promise<ActionResponse<null>> {
  try {
    await prisma.invitation.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Invitation deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting invitation:', error);
    return {
      success: false,
      message: 'Failed to delete invitation',
    };
  }
}

// RSVP TO INVITATION (Guest action - no authentication required)
export async function rsvpToInvitation(data: {
  invitationCode: string;
  rsvpResponse: 'ATTENDING' | 'NOT_ATTENDING' | 'MAYBE';
  plusOnesConfirmed?: number;
  plusOneNames?: string[];
}): Promise<ActionResponse<any>> {
  try {
    const invitation = await prisma.invitation.findUnique({
      where: { invitationCode: data.invitationCode },
      include: {
        inviteOnlyEvent: {
          include: {
            event: {
              include: {
                venue: true,
              },
            },
          },
        },
      },
    });

    if (!invitation) {
      return {
        success: false,
        message: 'Invalid invitation code',
      };
    }

    // Check RSVP deadline
    if (invitation.inviteOnlyEvent.rsvpDeadline) {
      if (new Date() > invitation.inviteOnlyEvent.rsvpDeadline) {
        return {
          success: false,
          message: 'RSVP deadline has passed',
        };
      }
    }

    // Validate plus ones
    if (
      data.plusOnesConfirmed &&
      data.plusOnesConfirmed > invitation.plusOnesAllowed
    ) {
      return {
        success: false,
        message: `Maximum ${invitation.plusOnesAllowed} plus ones allowed`,
      };
    }

    const updatedInvitation = await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        rsvpResponse: data.rsvpResponse,
        rsvpDate: new Date(),
        plusOnesConfirmed: data.plusOnesConfirmed || 0,
        plusOneNames: data.plusOneNames || [],
        status: data.rsvpResponse === 'ATTENDING' ? 'ACCEPTED' : 'DECLINED',
      },
      include: {
        inviteOnlyEvent: {
          include: {
            event: {
              include: {
                venue: true,
              },
            },
          },
        },
      },
    });

    // Send RSVP confirmation email
    try {
      // Type guard to ensure rsvpResponse is not null
      if (updatedInvitation.rsvpResponse) {
        await sendRSVPConfirmationEmail({
          invitation: {
            ...updatedInvitation,
            rsvpResponse: updatedInvitation.rsvpResponse as
              | 'ATTENDING'
              | 'NOT_ATTENDING'
              | 'MAYBE',
          },
        });
        console.log(`RSVP confirmation email sent to ${invitation.guestEmail}`);
      }
    } catch (emailError) {
      console.error('Error sending RSVP confirmation email:', emailError);
      // Don't fail the RSVP if email fails
    }

    return {
      success: true,
      message: 'RSVP recorded successfully',
      data: updatedInvitation,
    };
  } catch (error) {
    console.error('Error recording RSVP:', error);
    return {
      success: false,
      message: 'Failed to record RSVP',
    };
  }
}

// GET INVITATION BY CODE (for guest RSVP page)
export async function getInvitationByCode(
  code: string
): Promise<ActionResponse<any>> {
  try {
    const invitation = await prisma.invitation.findUnique({
      where: { invitationCode: code },
      include: {
        inviteOnlyEvent: {
          include: {
            event: {
              include: {
                venue: {
                  include: {
                    city: true,
                  },
                },
                category: true,
                tags: true,
                user: true,
              },
            },
          },
        },
      },
    });

    if (!invitation) {
      return {
        success: false,
        message: 'Invitation not found',
      };
    }

    return {
      success: true,
      data: invitation,
    };
  } catch (error) {
    console.error('Error fetching invitation:', error);
    return {
      success: false,
      message: 'Failed to fetch invitation',
    };
  }
}

// CREATE DONATION ORDER
export async function createDonationOrder(data: {
  eventId: string;
  amount: number;
  donorName?: string;
  donorEmail?: string;
  donorPhone?: string;
  isAnonymous: boolean;
  donationMessage?: string;
  invitationCode?: string;
}): Promise<ActionResponse<any>> {
  try {
    // Validate event and donation settings
    const event = await prisma.event.findUnique({
      where: { id: data.eventId },
      include: {
        inviteOnlyEvent: true,
      },
    });

    if (!event || !event.inviteOnlyEvent) {
      return {
        success: false,
        message: 'Event not found or is not an invite-only event',
      };
    }

    if (!event.inviteOnlyEvent.acceptDonations) {
      return {
        success: false,
        message: 'This event is not accepting donations',
      };
    }

    if (
      event.inviteOnlyEvent.minimumDonation &&
      data.amount < event.inviteOnlyEvent.minimumDonation
    ) {
      return {
        success: false,
        message: `Minimum donation amount is ₦${event.inviteOnlyEvent.minimumDonation}`,
      };
    }

    // Calculate platform fee
    const platformFeePercentage = await getPlatformFee();
    const platformFee = (data.amount * platformFeePercentage) / 100;
    const netAmount = data.amount - platformFee;

    // Generate Paystack reference
    const paystackId = `donation-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    // Find invitation if code provided
    let invitationId: string | undefined;
    if (data.invitationCode) {
      const invitation = await prisma.invitation.findUnique({
        where: { invitationCode: data.invitationCode },
      });
      invitationId = invitation?.id;
    }

    const donationOrder = await prisma.donationOrder.create({
      data: {
        eventId: data.eventId,
        paystackId,
        amount: data.amount,
        platformFee,
        netAmount,
        donorName: data.isAnonymous ? null : data.donorName,
        donorEmail: data.donorEmail,
        donorPhone: data.donorPhone,
        isAnonymous: data.isAnonymous,
        donationMessage: data.donationMessage,
        paymentStatus: 'PENDING',
      },
    });

    // Link donation to invitation if applicable
    if (invitationId) {
      await prisma.invitation.update({
        where: { id: invitationId },
        data: {
          donationOrderId: donationOrder.id,
          hasDonated: true,
          donationAmount: data.amount,
        },
      });
    }

    return {
      success: true,
      message: 'Donation order created successfully',
      data: {
        ...donationOrder,
        paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY,
      },
    };
  } catch (error) {
    console.error('Error creating donation order:', error);
    return {
      success: false,
      message: 'Failed to create donation order',
    };
  }
}

// VERIFY DONATION PAYMENT
export async function verifyDonationPayment(
  reference: string
): Promise<ActionResponse<any>> {
  try {
    const donationOrder = await prisma.donationOrder.findUnique({
      where: { paystackId: reference },
      include: {
        event: {
          include: {
            inviteOnlyEvent: true,
            user: true,
          },
        },
      },
    });

    if (!donationOrder) {
      return {
        success: false,
        message: 'Donation order not found',
      };
    }

    // Verify with Paystack
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const paystackData = await paystackResponse.json();

    if (paystackData.data.status === 'success') {
      const updatedOrder = await prisma.donationOrder.update({
        where: { id: donationOrder.id },
        data: {
          paymentStatus: 'COMPLETED',
          paymentMethod: paystackData.data.channel,
        },
        include: {
          event: true,
        },
      });

      // Send donation receipt email
      if (updatedOrder.donorEmail) {
        try {
          await sendDonationReceiptEmail({ donationOrder: updatedOrder });
          console.log(`Donation receipt sent to ${updatedOrder.donorEmail}`);
        } catch (emailError) {
          console.error('Error sending donation receipt:', emailError);
        }
      }

      // Create notification for organizer
      await prisma.notification.create({
        data: {
          type: 'PAYMENT_RECEIVED',
          status: 'UNREAD',
          title: 'Donation Received',
          message: `Received ${updatedOrder.isAnonymous ? 'anonymous' : ''} donation of ₦${updatedOrder.amount.toLocaleString()} for ${updatedOrder.event.title}`,
          userId: updatedOrder.event.userId,
          eventId: updatedOrder.eventId,
        },
      });

      return {
        success: true,
        message: 'Donation verified successfully',
        data: updatedOrder,
      };
    } else {
      await prisma.donationOrder.update({
        where: { id: donationOrder.id },
        data: {
          paymentStatus: 'FAILED',
        },
      });

      return {
        success: false,
        message: 'Payment verification failed',
      };
    }
  } catch (error) {
    console.error('Error verifying donation payment:', error);
    return {
      success: false,
      message: 'Failed to verify payment',
    };
  }
}

// GET EVENT DONATIONS (for organizer) - FIXED
export async function getEventDonations(eventId: string) {
  try {
    const donations = await prisma.donationOrder.findMany({
      where: {
        eventId,
        paymentStatus: 'COMPLETED', // Changed from 'SUCCESS' to 'COMPLETED'
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate statistics
    const totalDonations = donations.reduce(
      (sum, donation) => sum + donation.amount,
      0
    );
    const totalFees = donations.reduce(
      (sum, donation) => sum + donation.platformFee,
      0
    );
    const netTotal = donations.reduce(
      (sum, donation) => sum + donation.netAmount,
      0
    );
    const donorCount = new Set(
      donations
        .filter((d) => !d.isAnonymous && d.donorName)
        .map((d) => d.donorEmail || d.donorName)
    ).size;

    return {
      success: true,
      data: {
        donations,
        totalDonations,
        totalFees,
        netTotal,
        donorCount,
      },
    };
  } catch (error) {
    console.error('Error getting event donations:', error);
    return {
      success: false,
      message: 'Failed to load donations',
    };
  }
}

// GET INVITATIONS FOR EVENT (for organizer) - FIXED
export async function getEventInvitations(inviteOnlyEventId: string) {
  try {
    const inviteOnlyEvent = await prisma.inviteOnlyEvent.findUnique({
      where: { id: inviteOnlyEventId },
      include: {
        invitations: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            startDateTime: true,
          },
        },
      },
    });

    if (!inviteOnlyEvent) {
      return {
        success: false,
        message: 'Invite-only event not found',
      };
    }

    // Calculate statistics
    const stats = {
      total: inviteOnlyEvent.invitations.length,
      accepted: inviteOnlyEvent.invitations.filter(
        (inv) => inv.status === 'ACCEPTED'
      ).length,
      declined: inviteOnlyEvent.invitations.filter(
        (inv) => inv.status === 'DECLINED'
      ).length,
      pending: inviteOnlyEvent.invitations.filter(
        (inv) => inv.status === 'PENDING'
      ).length,
      attended: inviteOnlyEvent.invitations.filter((inv) => inv.checkedInAt)
        .length,
      totalPlusOnes: inviteOnlyEvent.invitations.reduce(
        (sum, inv) => sum + inv.plusOnesConfirmed,
        0
      ),
    };

    return {
      success: true,
      data: {
        invitations: inviteOnlyEvent.invitations,
        stats,
        event: inviteOnlyEvent.event,
      },
    };
  } catch (error) {
    console.error('Error getting event invitations:', error);
    return {
      success: false,
      message: 'Failed to load invitations',
    };
  }
}

// CHECK-IN GUEST AT EVENT
export async function checkInGuest(data: {
  invitationCode: string;
  checkInLocation?: string;
}): Promise<ActionResponse<any>> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session) {
      return {
        success: false,
        message: 'Not authenticated',
      };
    }

    const invitation = await prisma.invitation.findUnique({
      where: { invitationCode: data.invitationCode },
    });

    if (!invitation) {
      return {
        success: false,
        message: 'Invalid invitation code',
      };
    }

    if (invitation.status !== 'ACCEPTED') {
      return {
        success: false,
        message: 'Guest has not confirmed attendance',
      };
    }

    if (invitation.checkedInAt) {
      return {
        success: false,
        message: 'Guest already checked in',
      };
    }

    const updatedInvitation = await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: 'ATTENDED',
        checkedInAt: new Date(),
        checkedInBy: session.user.id,
      },
    });

    return {
      success: true,
      message: 'Guest checked in successfully',
      data: updatedInvitation,
    };
  } catch (error) {
    console.error('Error checking in guest:', error);
    return {
      success: false,
      message: 'Failed to check in guest',
    };
  }
}

// SEND INVITATION EMAILS
export async function sendInvitationEmails(data: {
  inviteOnlyEventId: string;
  invitationIds?: string[];
}): Promise<ActionResponse<{ sent: number; failed: number }>> {
  try {
    const whereClause: any = { inviteOnlyEventId: data.inviteOnlyEventId };

    if (data.invitationIds && data.invitationIds.length > 0) {
      whereClause.id = { in: data.invitationIds };
    } else {
      whereClause.invitationSentAt = null;
    }

    const invitations = await prisma.invitation.findMany({
      where: whereClause,
      include: {
        inviteOnlyEvent: {
          include: {
            event: {
              include: {
                venue: true,
                user: true,
              },
            },
          },
        },
      },
    });

    // Use bulk send function
    const results = await bulkSendInvitations(invitations);

    // Update invitations that were successfully sent
    if (results.sent > 0) {
      const successfulEmails = invitations
        .filter(
          (inv) => !results.errors.some((e: any) => e.email === inv.guestEmail)
        )
        .map((inv) => inv.id);

      await prisma.invitation.updateMany({
        where: {
          id: { in: successfulEmails },
        },
        data: {
          invitationSentAt: new Date(),
          lastEmailSentAt: new Date(),
        },
      });
    }

    return {
      success: true,
      message: `Sent ${results.sent} invitations${results.failed > 0 ? `, ${results.failed} failed` : ''}`,
      data: { sent: results.sent, failed: results.failed },
    };
  } catch (error) {
    console.error('Error sending invitation emails:', error);
    return {
      success: false,
      message: 'Failed to send invitation emails',
    };
  }
}

// RESEND SINGLE INVITATION
export async function resendInvitation(
  invitationId: string
): Promise<ActionResponse<any>> {
  try {
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: {
        inviteOnlyEvent: {
          include: {
            event: {
              include: {
                venue: true,
                user: true,
              },
            },
          },
        },
      },
    });

    if (!invitation) {
      return {
        success: false,
        message: 'Invitation not found',
      };
    }

    try {
      await sendInvitationEmail({
        invitation: {
          ...invitation,
          // Convert null to undefined for email function
          specialRequirements: invitation.specialRequirements || undefined,
        },
      });

      // Update last sent timestamp
      await prisma.invitation.update({
        where: { id: invitationId },
        data: {
          lastEmailSentAt: new Date(),
          invitationSentAt: invitation.invitationSentAt || new Date(),
        },
      });

      return {
        success: true,
        message: 'Invitation email resent successfully',
      };
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      return {
        success: false,
        message: 'Failed to send invitation email',
      };
    }
  } catch (error) {
    console.error('Error resending invitation:', error);
    return {
      success: false,
      message: 'Failed to resend invitation',
    };
  }
}
