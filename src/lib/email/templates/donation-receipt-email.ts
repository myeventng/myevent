// lib/email/templates/donation-receipt-email.ts
interface DonationReceiptData {
  donorName: string;
  eventTitle: string;
  donationAmount: number;
  platformFee: number;
  netAmount: number;
  donationDate: string;
  transactionId: string;
  isAnonymous: boolean;
  donationMessage?: string;
}

export function getDonationReceiptTemplate(data: DonationReceiptData): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Donation Receipt</title>
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
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 40px 20px;
          text-align: center;
        }
        .content {
          padding: 40px 30px;
        }
        .receipt-box {
          background-color: #f0fdf4;
          border: 2px solid #10b981;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .amount {
          font-size: 36px;
          font-weight: bold;
          color: #10b981;
          text-align: center;
          margin: 20px 0;
        }
        .details-table {
          width: 100%;
          margin: 20px 0;
        }
        .details-table td {
          padding: 10px;
          border-bottom: 1px solid #e5e7eb;
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
          <h1>🎁 Thank You for Your Donation!</h1>
        </div>
        
        <div class="content">
          <p>Dear ${data.isAnonymous ? 'Generous Donor' : data.donorName},</p>
          
          <p>Thank you for your generous donation to <strong>${data.eventTitle}</strong>!</p>
          
          <div class="receipt-box">
            <h2 style="margin-top: 0; color: #10b981; text-align: center;">Donation Receipt</h2>
            
            <div class="amount">₦${data.donationAmount.toLocaleString()}</div>
            
            <table class="details-table">
              <tr>
                <td><strong>Transaction ID:</strong></td>
                <td>${data.transactionId}</td>
              </tr>
              <tr>
                <td><strong>Date:</strong></td>
                <td>${data.donationDate}</td>
              </tr>
              <tr>
                <td><strong>Event:</strong></td>
                <td>${data.eventTitle}</td>
              </tr>
              <tr>
                <td><strong>Donation Amount:</strong></td>
                <td>₦${data.donationAmount.toLocaleString()}</td>
              </tr>
              <tr>
                <td><strong>Platform Fee:</strong></td>
                <td>₦${data.platformFee.toLocaleString()}</td>
              </tr>
              <tr style="font-weight: bold;">
                <td>Amount to Event:</td>
                <td>₦${data.netAmount.toLocaleString()}</td>
              </tr>
            </table>
            
            ${
              data.donationMessage
                ? `
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #d1d5db;">
                <p><strong>Your Message:</strong></p>
                <p style="font-style: italic;">"${data.donationMessage}"</p>
              </div>
            `
                : ''
            }
          </div>
          
          <p><strong>Important Information:</strong></p>
          <ul>
            <li>This donation is non-refundable</li>
            <li>Please keep this receipt for your records</li>
            <li>The event organizer will receive ₦${data.netAmount.toLocaleString()} after platform fees</li>
          </ul>
          
          <p>Your generosity makes a difference. Thank you for supporting this event!</p>
        </div>
        
        <div class="footer">
          <p>If you have any questions about this donation, please contact support.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
