// lib/email/send-donation-receipt.ts
import { format } from 'date-fns';
import { getDonationReceiptTemplate } from './templates/donation-receipt-email';
import { sendEmail } from './email-service';

interface SendDonationReceiptParams {
  donationOrder: {
    id: string;
    paystackId: string;
    amount: number;
    platformFee: number;
    netAmount: number;
    donorName: string | null;
    donorEmail: string | null;
    isAnonymous: boolean;
    donationMessage: string | null;
    createdAt: Date;
    event: {
      title: string;
    };
  };
}

export async function sendDonationReceiptEmail({
  donationOrder,
}: SendDonationReceiptParams) {
  if (!donationOrder.donorEmail) {
    console.log('No email provided for donation receipt');
    return { success: false, error: 'No email provided' };
  }

  const emailData = {
    donorName: donationOrder.donorName || 'Anonymous Donor',
    eventTitle: donationOrder.event.title,
    donationAmount: donationOrder.amount,
    platformFee: donationOrder.platformFee,
    netAmount: donationOrder.netAmount,
    donationDate: format(
      new Date(donationOrder.createdAt),
      'MMMM d, yyyy h:mm a'
    ),
    transactionId: donationOrder.paystackId,
    isAnonymous: donationOrder.isAnonymous,
    donationMessage: donationOrder.donationMessage || undefined,
  };

  return await sendEmail({
    to: donationOrder.donorEmail,
    subject: `Donation Receipt - ${donationOrder.event.title}`,
    html: getDonationReceiptTemplate(emailData),
  });
}
