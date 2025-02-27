export const headerLinks = [
  {
    label: 'All Events',
    route: '/profile',
  },
  {
    label: 'Create Event',
    route: '/events/create',
  },
];

export const eventDefaultValues = {
  title: '',
  description: '',
  location: '',
  city: '',
  imageUrl: '',
  coverImageUrl: '',
  startDateTime: new Date(),
  endDateTime: new Date(),
  categoryId: '',
  organizerId: '',
  venueId: '',
  price: '',
  isFree: false,
  url: '',
  tags: [],
  attendeeLimit: undefined,
  ratings: [],
  featured: false,
  embeddedVideoUrl: '',
  ticketTypes: [
    {
      name: '',
      price: 0,
      quantity: 0,
    },
  ],
  publishedStatus: 'draft',
};
