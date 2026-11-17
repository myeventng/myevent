// FAQ content for /faqs. Edit here; the page and the search-engine markup
// are both built from this list.
export interface FaqItem {
  q: string;
  a: string;
}
export interface FaqGroup {
  id: string;
  title: string;
  items: FaqItem[];
}

export const FAQ_GROUPS: FaqGroup[] = [
  {
    id: 'tickets',
    title: 'Buying tickets',
    items: [
      {
        q: 'How do I buy a ticket?',
        a: 'Open the event, choose a ticket type and quantity, then pay online. Your tickets are emailed to you as soon as the payment goes through.',
      },
      {
        q: 'Do I need an account to buy?',
        a: 'Not for events that allow guest checkout: enter your email and we send the tickets there. An account is still useful because it keeps all your tickets in one place.',
      },
      {
        q: 'Where do I find my tickets?',
        a: 'Check the email you used at checkout. If you are signed in, your tickets are also under My Tickets in your dashboard.',
      },
      {
        q: 'I paid but did not get my ticket email. What now?',
        a: 'Look in your spam or promotions folder first, then check My Tickets if you have an account. If it is still missing, send us your name, email and the event through the contact form and we will resend it.',
      },
      {
        q: 'How do I get into the event?',
        a: 'Show the QR code on your ticket at the entrance. It is scanned once, so do not share it with anyone.',
      },
    ],
  },
  {
    id: 'payments',
    title: 'Payments and refunds',
    items: [
      {
        q: 'How do payments work?',
        a: 'Payments are processed securely by Paystack. You will see the payment options available to you at checkout.',
      },
      {
        q: 'Can I get a refund?',
        a: 'It depends on the event and the organizer’s terms. Send your order details through the contact form and we will look into it with the organizer.',
      },
      {
        q: 'Is my payment information stored on MyEvent?',
        a: 'No. Card and bank details are entered on Paystack’s payment page and are not stored by us.',
      },
    ],
  },
  {
    id: 'hosting',
    title: 'Hosting an event',
    items: [
      {
        q: 'How do I host an event?',
        a: 'Create an account, choose Host your event, fill in the details and add your tickets. New events are reviewed before they go live.',
      },
      {
        q: 'What kinds of events can I create?',
        a: 'Standard ticketed or free events, invite-only events with guest lists, and voting contests.',
      },
      {
        q: 'How do I get paid?',
        a: 'Add your bank details in your organizer dashboard and request a payout once tickets have sold. Platform fees are shown when you set up your tickets.',
      },
      {
        q: 'How do I check guests in?',
        a: 'Use the ticket scanner in your dashboard. You can also give staff access so your team can scan at the door.',
      },
    ],
  },
  {
    id: 'voting',
    title: 'Voting contests',
    items: [
      {
        q: 'How do I vote?',
        a: 'Open the contest, pick a contestant and vote. Some contests are free to vote in and others sell vote packages, which are paid for at checkout.',
      },
      {
        q: 'Can I vote more than once?',
        a: 'That is up to each contest. The contest page shows its voting rules and when voting opens and closes.',
      },
    ],
  },
  {
    id: 'help',
    title: 'Still need help?',
    items: [
      {
        q: 'How do I reach the MyEvent team?',
        a: 'Use the contact form, email info@myevent.com.ng, or send us a message on Instagram at @myevent.comm.ng.',
      },
    ],
  },
];
