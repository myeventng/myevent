export const headerLinks = [
  {
    label: 'Home',
    route: '/',
  },
  {
    label: 'Create Event',
    route: '/events/create',
  },
  {
    label: 'My Profile',
    route: '/profile',
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
