// Shared by the public contact form and the admin inbox.
export const CONTACT_TOPICS = [
  'Buying tickets',
  'Hosting an event',
  'Voting contests',
  'Payments and refunds',
  'Partnerships and sponsorship',
  'Something else',
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number];
