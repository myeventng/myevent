import { prisma } from '@/lib/prisma';
import { AgeRestriction, DressCode, PublishedStatus } from '@/generated/prisma';

async function seedEvents() {
  console.log('🌱 Starting events seeding...');

  try {
    // First, let's create some sample categories, cities, tags, venues, and users if they don't exist

    // Create categories
    const categories = await Promise.all([
      prisma.category.upsert({
        where: { name: 'Music & Entertainment' },
        update: {},
        create: { name: 'Music & Entertainment' },
      }),
      prisma.category.upsert({
        where: { name: 'Business & Networking' },
        update: {},
        create: { name: 'Business & Networking' },
      }),
      prisma.category.upsert({
        where: { name: 'Arts & Culture' },
        update: {},
        create: { name: 'Arts & Culture' },
      }),
      prisma.category.upsert({
        where: { name: 'Technology' },
        update: {},
        create: { name: 'Technology' },
      }),
      prisma.category.upsert({
        where: { name: 'Sports & Fitness' },
        update: {},
        create: { name: 'Sports & Fitness' },
      }),
      prisma.category.upsert({
        where: { name: 'Food & Drink' },
        update: {},
        create: { name: 'Food & Drink' },
      }),
    ]);

    // Create cities
    const cities = await Promise.all([
      prisma.city.upsert({
        where: { name: 'Lagos' },
        update: {},
        create: { name: 'Lagos', state: 'Lagos', population: 15000000 },
      }),
      prisma.city.upsert({
        where: { name: 'Abuja' },
        update: {},
        create: { name: 'Abuja', state: 'FCT', population: 3000000 },
      }),
      prisma.city.upsert({
        where: { name: 'Kano' },
        update: {},
        create: { name: 'Kano', state: 'Kano', population: 4000000 },
      }),
      prisma.city.upsert({
        where: { name: 'Port Harcourt' },
        update: {},
        create: { name: 'Port Harcourt', state: 'Rivers', population: 2000000 },
      }),
      prisma.city.upsert({
        where: { name: 'Ibadan' },
        update: {},
        create: { name: 'Ibadan', state: 'Oyo', population: 3500000 },
      }),
    ]);

    // Create tags
    const tags = await Promise.all([
      prisma.tag.upsert({
        where: { name: 'Afrobeats' },
        update: {},
        create: { name: 'Afrobeats', bgColor: '#FF6B35', slug: 'afrobeats' },
      }),
      prisma.tag.upsert({
        where: { name: 'Networking' },
        update: {},
        create: { name: 'Networking', bgColor: '#4ECDC4', slug: 'networking' },
      }),
      prisma.tag.upsert({
        where: { name: 'Tech' },
        update: {},
        create: { name: 'Tech', bgColor: '#45B7D1', slug: 'tech' },
      }),
      prisma.tag.upsert({
        where: { name: 'Cultural' },
        update: {},
        create: { name: 'Cultural', bgColor: '#F7931E', slug: 'cultural' },
      }),
      prisma.tag.upsert({
        where: { name: 'Food' },
        update: {},
        create: { name: 'Food', bgColor: '#C44536', slug: 'food' },
      }),
      prisma.tag.upsert({
        where: { name: 'Live Music' },
        update: {},
        create: { name: 'Live Music', bgColor: '#9B59B6', slug: 'live-music' },
      }),
      prisma.tag.upsert({
        where: { name: 'Workshop' },
        update: {},
        create: { name: 'Workshop', bgColor: '#2ECC71', slug: 'workshop' },
      }),
      prisma.tag.upsert({
        where: { name: 'Comedy' },
        update: {},
        create: { name: 'Comedy', bgColor: '#F39C12', slug: 'comedy' },
      }),
    ]);

    // Create sample user (organizer)
    const organizer = await prisma.user.upsert({
      where: { email: 'organizer@eventapp.ng' },
      update: {},
      create: {
        id: 'sample-organizer-id',
        name: 'Event Organizer',
        email: 'organizer@eventapp.ng',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: 'USER',
        subRole: 'ORGANIZER',
      },
    });

    // Create organizer profile
    await prisma.organizerProfile.upsert({
      where: { userId: organizer.id },
      update: {},
      create: {
        organizationName: 'Nigerian Events Co.',
        bio: 'Premier event organization company in Nigeria',
        website: 'https://nigeriaevents.ng',
        userId: organizer.id,
      },
    });

    // Create venues
    const venues = await Promise.all([
      prisma.venue.upsert({
        where: { id: 'venue-eko-hotel' },
        update: {},
        create: {
          id: 'venue-eko-hotel',
          name: 'Eko Hotel & Suites',
          address: '1415 Adetokunbo Ademola Street, Victoria Island',
          cityId: cities[0].id, // Lagos
          userId: organizer.id,
          description: 'Luxury hotel and event center in the heart of Lagos',
          contactInfo: '+234 1 277 7000',
          capacity: 2000,
          venueImageUrl:
            'https://images.unsplash.com/photo-1566073771259-6a8506099945',
          latitude: '6.4281',
          longitude: '3.4219',
        },
      }),
      prisma.venue.upsert({
        where: { id: 'venue-transcorp-hilton' },
        update: {},
        create: {
          id: 'venue-transcorp-hilton',
          name: 'Transcorp Hilton Abuja',
          address: '1 Aguiyi Ironsi Street, Maitama',
          cityId: cities[1].id, // Abuja
          userId: organizer.id,
          description: "Premier luxury hotel in Nigeria's capital city",
          contactInfo: '+234 9 461 3000',
          capacity: 1500,
          venueImageUrl:
            'https://images.unsplash.com/photo-1582719478250-c89cac0e4c6e',
          latitude: '9.0579',
          longitude: '7.4951',
        },
      }),
      prisma.venue.upsert({
        where: { id: 'venue-landmark-center' },
        update: {},
        create: {
          id: 'venue-landmark-center',
          name: 'Landmark Event Center',
          address: 'Water Corporation Drive, Victoria Island',
          cityId: cities[0].id, // Lagos
          userId: organizer.id,
          description: 'State-of-the-art event center for world-class events',
          contactInfo: '+234 1 270 1234',
          capacity: 5000,
          venueImageUrl:
            'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
          latitude: '6.4474',
          longitude: '3.4120',
        },
      }),
      prisma.venue.upsert({
        where: { id: 'venue-cultural-center' },
        update: {},
        create: {
          id: 'venue-cultural-center',
          name: 'National Arts Theatre',
          address: 'Iganmu, Surulere',
          cityId: cities[0].id, // Lagos
          userId: organizer.id,
          description: "Nigeria's premier arts and cultural venue",
          contactInfo: '+234 1 805 5555',
          capacity: 3000,
          venueImageUrl:
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
          latitude: '6.5244',
          longitude: '3.3792',
        },
      }),
      prisma.venue.upsert({
        where: { id: 'venue-tech-hub' },
        update: {},
        create: {
          id: 'venue-tech-hub',
          name: 'Co-Creation Hub',
          address: '294 Herbert Macaulay Way, Yaba',
          cityId: cities[0].id, // Lagos
          userId: organizer.id,
          description: 'Leading technology innovation center in West Africa',
          contactInfo: '+234 1 453 0946',
          capacity: 500,
          venueImageUrl:
            'https://images.unsplash.com/photo-1497366216548-37526070297c',
          latitude: '6.5158',
          longitude: '3.3696',
        },
      }),
    ]);

    // Create 12 diverse events
    const events = [
      {
        title: 'Afrobeats Festival Lagos 2025',
        slug: 'afrobeats-festival-lagos-2025',
        description:
          'The biggest Afrobeats festival in West Africa featuring top Nigerian and international artists. Experience the best of contemporary African music with performances from chart-topping artists, emerging talents, and cultural displays.',
        location: 'Victoria Island, Lagos',
        coverImageUrl:
          'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f',
        startDateTime: new Date('2025-12-15T18:00:00Z'),
        endDateTime: new Date('2025-12-15T23:59:00Z'),
        isFree: false,
        url: 'https://afrobeatsfestival.ng',
        idRequired: true,
        attendeeLimit: 5000,
        dressCode: DressCode.CASUAL,
        age: AgeRestriction.AGE_18_PLUS,
        imageUrls: [
          'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f',
          'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7',
        ],
        categoryId: categories[0].id, // Music & Entertainment
        venueId: venues[2].id, // Landmark Center
        cityId: cities[0].id, // Lagos
        tagIds: [tags[0].id, tags[5].id], // Afrobeats, Live Music
        publishedStatus: PublishedStatus.PUBLISHED,
        featured: true,
        ticketTypes: [
          { name: 'Regular', price: 15000, quantity: 3000 },
          { name: 'VIP', price: 35000, quantity: 500 },
          { name: 'VVIP', price: 75000, quantity: 100 },
        ],
      },
      {
        title: 'Nigeria Tech Summit 2025',
        slug: 'nigeria-tech-summit-2025',
        description:
          'The premier technology conference bringing together innovators, entrepreneurs, and tech leaders from across Africa. Featuring keynote speeches, panel discussions, and networking opportunities.',
        location: 'Abuja, FCT',
        coverImageUrl:
          'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
        startDateTime: new Date('2025-09-20T09:00:00Z'),
        endDateTime: new Date('2025-09-22T17:00:00Z'),
        isFree: false,
        url: 'https://nigeriatechsummit.com',
        idRequired: true,
        attendeeLimit: 1500,
        dressCode: DressCode.BUSINESS_CASUAL,
        age: AgeRestriction.ALL_AGES,
        imageUrls: [
          'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
          'https://images.unsplash.com/photo-1497366216548-37526070297c',
        ],
        categoryId: categories[3].id, // Technology
        venueId: venues[1].id, // Transcorp Hilton
        cityId: cities[1].id, // Abuja
        tagIds: [tags[2].id, tags[1].id, tags[6].id], // Tech, Networking, Workshop
        publishedStatus: PublishedStatus.PUBLISHED,
        featured: true,
        ticketTypes: [
          { name: 'Student', price: 5000, quantity: 300 },
          { name: 'Professional', price: 25000, quantity: 1000 },
          { name: 'Startup', price: 15000, quantity: 200 },
        ],
      },
      {
        title: 'Lagos Food & Wine Festival',
        slug: 'lagos-food-wine-festival',
        description:
          "Celebrate Nigeria's rich culinary heritage with top chefs, food vendors, and wine tastings. Experience traditional Nigerian cuisine alongside contemporary fusion dishes.",
        location: 'Victoria Island, Lagos',
        coverImageUrl:
          'https://images.unsplash.com/photo-1414235077428-338989a2e8c0',
        startDateTime: new Date('2025-11-08T11:00:00Z'),
        endDateTime: new Date('2025-11-10T22:00:00Z'),
        isFree: false,
        url: 'https://lagosfoodwine.ng',
        idRequired: false,
        attendeeLimit: 2000,
        dressCode: DressCode.CASUAL,
        age: AgeRestriction.ALL_AGES,
        imageUrls: [
          'https://images.unsplash.com/photo-1414235077428-338989a2e8c0',
          'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445',
        ],
        categoryId: categories[5].id, // Food & Drink
        venueId: venues[0].id, // Eko Hotel
        cityId: cities[0].id, // Lagos
        tagIds: [tags[4].id], // Food
        publishedStatus: PublishedStatus.PUBLISHED,
        featured: false,
        ticketTypes: [
          { name: 'Day Pass', price: 8000, quantity: 1500 },
          { name: 'Weekend Pass', price: 20000, quantity: 500 },
        ],
      },
      {
        title: 'Nollywood Film Premiere: The Lagos Story',
        slug: 'nollywood-film-premiere-lagos-story',
        description:
          'Red carpet premiere of the highly anticipated Nollywood blockbuster "The Lagos Story" featuring A-list Nigerian actors and filmmakers.',
        location: 'Surulere, Lagos',
        coverImageUrl:
          'https://images.unsplash.com/photo-1489599117225-3b4e4b2ed0b4',
        startDateTime: new Date('2025-10-05T19:00:00Z'),
        endDateTime: new Date('2025-10-05T23:00:00Z'),
        isFree: false,
        url: 'https://thelagosstory.ng',
        idRequired: true,
        attendeeLimit: 800,
        dressCode: DressCode.FORMAL,
        age: AgeRestriction.AGE_14_PLUS,
        imageUrls: [
          'https://images.unsplash.com/photo-1489599117225-3b4e4b2ed0b4',
          'https://images.unsplash.com/photo-1595769816263-9b910be24d5f',
        ],
        categoryId: categories[2].id, // Arts & Culture
        venueId: venues[3].id, // National Arts Theatre
        cityId: cities[0].id, // Lagos
        tagIds: [tags[3].id], // Cultural
        publishedStatus: PublishedStatus.PUBLISHED,
        featured: false,
        ticketTypes: [
          { name: 'Regular', price: 12000, quantity: 600 },
          { name: 'VIP Red Carpet', price: 35000, quantity: 200 },
        ],
      },
      {
        title: 'Nigerian Startup Pitch Competition',
        slug: 'nigerian-startup-pitch-competition',
        description:
          'Annual competition where emerging Nigerian startups pitch their innovative solutions to top investors and venture capitalists. Winner receives ₦10M in funding.',
        location: 'Yaba, Lagos',
        coverImageUrl:
          'https://images.unsplash.com/photo-1556761175-b413da4baf72',
        startDateTime: new Date('2025-08-15T14:00:00Z'),
        endDateTime: new Date('2025-08-15T18:00:00Z'),
        isFree: false,
        url: 'https://startuppitch.ng',
        idRequired: true,
        attendeeLimit: 500,
        dressCode: DressCode.BUSINESS_CASUAL,
        age: AgeRestriction.AGE_18_PLUS,
        imageUrls: [
          'https://images.unsplash.com/photo-1556761175-b413da4baf72',
          'https://images.unsplash.com/photo-1542744173-8e7e53415bb0',
        ],
        categoryId: categories[1].id, // Business & Networking
        venueId: venues[4].id, // Co-Creation Hub
        cityId: cities[0].id, // Lagos
        tagIds: [tags[2].id, tags[1].id], // Tech, Networking
        publishedStatus: PublishedStatus.PUBLISHED,
        featured: true,
        ticketTypes: [
          { name: 'Audience', price: 3000, quantity: 400 },
          { name: 'Networking Pass', price: 8000, quantity: 100 },
        ],
      },
      {
        title: 'Traditional Nigerian Wedding Expo',
        slug: 'traditional-nigerian-wedding-expo',
        description:
          'Showcase of traditional Nigerian wedding customs, attire, and vendors. Perfect for couples planning their traditional ceremonies.',
        location: 'Abuja, FCT',
        coverImageUrl:
          'https://images.unsplash.com/photo-1519741497674-611481863552',
        startDateTime: new Date('2025-07-12T10:00:00Z'),
        endDateTime: new Date('2025-07-13T18:00:00Z'),
        isFree: true,
        idRequired: false,
        attendeeLimit: 1000,
        dressCode: DressCode.THEMED_COSTUME,
        age: AgeRestriction.ALL_AGES,
        imageUrls: [
          'https://images.unsplash.com/photo-1519741497674-611481863552',
          'https://images.unsplash.com/photo-1511285560929-80b456fea0bc',
        ],
        categoryId: categories[2].id, // Arts & Culture
        venueId: venues[1].id, // Transcorp Hilton
        cityId: cities[1].id, // Abuja
        tagIds: [tags[3].id], // Cultural
        publishedStatus: PublishedStatus.PUBLISHED,
        featured: false,
        ticketTypes: [{ name: 'Free Entry', price: 0, quantity: 1000 }],
      },
      {
        title: 'Lagos Marathon 2025',
        slug: 'lagos-marathon-2025',
        description:
          'Annual international marathon attracting runners from across Africa and beyond. Routes through iconic Lagos landmarks.',
        location: 'Lagos Island, Lagos',
        coverImageUrl:
          'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
        startDateTime: new Date('2025-02-08T06:00:00Z'),
        endDateTime: new Date('2025-02-08T14:00:00Z'),
        isFree: false,
        url: 'https://lagosmarathon.ng',
        idRequired: true,
        attendeeLimit: 50000,
        dressCode: DressCode.NO_DRESS_CODE,
        age: AgeRestriction.AGE_14_PLUS,
        imageUrls: [
          'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
          'https://images.unsplash.com/photo-1544717297-fa95b6ee9643',
        ],
        categoryId: categories[4].id, // Sports & Fitness
        venueId: venues[2].id, // Landmark Center (Start/Finish)
        cityId: cities[0].id, // Lagos
        tagIds: [], // No specific tags
        publishedStatus: PublishedStatus.PUBLISHED,
        featured: true,
        ticketTypes: [
          { name: '10K Race', price: 5000, quantity: 15000 },
          { name: 'Half Marathon', price: 8000, quantity: 10000 },
          { name: 'Full Marathon', price: 12000, quantity: 25000 },
        ],
      },
      {
        title: 'Nigerian Comedy Night',
        slug: 'nigerian-comedy-night',
        description:
          "Hilarious night of stand-up comedy featuring Nigeria's funniest comedians. Laugh the night away with local humor and international acts.",
        location: 'Victoria Island, Lagos',
        coverImageUrl:
          'https://images.unsplash.com/photo-1541742337818-c4b8e6b79e37',
        startDateTime: new Date('2025-06-21T20:00:00Z'),
        endDateTime: new Date('2025-06-21T23:30:00Z'),
        isFree: false,
        idRequired: true,
        attendeeLimit: 800,
        dressCode: DressCode.CASUAL,
        age: AgeRestriction.AGE_18_PLUS,
        imageUrls: [
          'https://images.unsplash.com/photo-1541742337818-c4b8e6b79e37',
          'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7',
        ],
        categoryId: categories[0].id, // Music & Entertainment
        venueId: venues[0].id, // Eko Hotel
        cityId: cities[0].id, // Lagos
        tagIds: [tags[7].id], // Comedy
        publishedStatus: PublishedStatus.PUBLISHED,
        featured: false,
        ticketTypes: [
          { name: 'Regular', price: 6000, quantity: 600 },
          { name: 'VIP Table', price: 25000, quantity: 200 },
        ],
      },
      {
        title: 'Abuja Art Gallery Opening',
        slug: 'abuja-art-gallery-opening',
        description:
          'Grand opening of contemporary Nigerian art gallery featuring works by emerging and established local artists.',
        location: 'Maitama, Abuja',
        coverImageUrl:
          'https://images.unsplash.com/photo-1541961017774-22349e4a1262',
        startDateTime: new Date('2025-05-18T18:00:00Z'),
        endDateTime: new Date('2025-05-18T22:00:00Z'),
        isFree: true,
        idRequired: false,
        attendeeLimit: 300,
        dressCode: DressCode.SMART_CASUAL,
        age: AgeRestriction.ALL_AGES,
        imageUrls: [
          'https://images.unsplash.com/photo-1541961017774-22349e4a1262',
          'https://images.unsplash.com/photo-1578321272176-b7bbc0679853',
        ],
        categoryId: categories[2].id, // Arts & Culture
        venueId: venues[1].id, // Transcorp Hilton
        cityId: cities[1].id, // Abuja
        tagIds: [tags[3].id], // Cultural
        publishedStatus: PublishedStatus.PUBLISHED,
        featured: false,
        ticketTypes: [{ name: 'Free Entry', price: 0, quantity: 300 }],
      },
      {
        title: 'Lagos Business Network Summit',
        slug: 'lagos-business-network-summit',
        description:
          'Premier networking event for business leaders, entrepreneurs, and professionals. Connect, learn, and grow your business network.',
        location: 'Victoria Island, Lagos',
        coverImageUrl:
          'https://images.unsplash.com/photo-1511578314322-379afb476865',
        startDateTime: new Date('2025-04-10T08:00:00Z'),
        endDateTime: new Date('2025-04-10T17:00:00Z'),
        isFree: false,
        url: 'https://lagosbusinesssummit.ng',
        idRequired: true,
        attendeeLimit: 500,
        dressCode: DressCode.BUSINESS_CASUAL,
        age: AgeRestriction.AGE_21_PLUS,
        imageUrls: [
          'https://images.unsplash.com/photo-1511578314322-379afb476865',
          'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4',
        ],
        categoryId: categories[1].id, // Business & Networking
        venueId: venues[0].id, // Eko Hotel
        cityId: cities[0].id, // Lagos
        tagIds: [tags[1].id], // Networking
        publishedStatus: PublishedStatus.PUBLISHED,
        featured: false,
        ticketTypes: [
          { name: 'Early Bird', price: 15000, quantity: 200 },
          { name: 'Regular', price: 25000, quantity: 300 },
        ],
      },
      {
        title: 'Nigerian Fashion Week',
        slug: 'nigerian-fashion-week',
        description:
          'Showcase of the best in Nigerian fashion design. Runway shows, designer exhibitions, and fashion networking events.',
        location: 'Victoria Island, Lagos',
        coverImageUrl:
          'https://images.unsplash.com/photo-1558769132-cb1aea458c5e',
        startDateTime: new Date('2025-03-25T16:00:00Z'),
        endDateTime: new Date('2025-03-27T22:00:00Z'),
        isFree: false,
        url: 'https://nigerianfashionweek.ng',
        idRequired: true,
        attendeeLimit: 1200,
        dressCode: DressCode.FORMAL,
        age: AgeRestriction.AGE_18_PLUS,
        imageUrls: [
          'https://images.unsplash.com/photo-1558769132-cb1aea458c5e',
          'https://images.unsplash.com/photo-1469334031218-e382a71b716b',
        ],
        categoryId: categories[2].id, // Arts & Culture
        venueId: venues[2].id, // Landmark Center
        cityId: cities[0].id, // Lagos
        tagIds: [tags[3].id], // Cultural
        publishedStatus: PublishedStatus.PUBLISHED,
        featured: true,
        ticketTypes: [
          { name: 'Day Pass', price: 18000, quantity: 800 },
          { name: 'Full Access', price: 45000, quantity: 400 },
        ],
      },
      {
        title: 'Kano Cultural Festival',
        slug: 'kano-cultural-festival',
        description:
          'Traditional Northern Nigerian cultural celebration featuring Hausa music, dance, crafts, and local cuisine.',
        location: 'Kano, Kano State',
        coverImageUrl:
          'https://images.unsplash.com/photo-1445019980597-93fa8acb246c',
        startDateTime: new Date('2025-01-15T14:00:00Z'),
        endDateTime: new Date('2025-01-17T20:00:00Z'),
        isFree: true,
        idRequired: false,
        attendeeLimit: 2000,
        dressCode: DressCode.THEMED_COSTUME,
        age: AgeRestriction.ALL_AGES,
        imageUrls: [
          'https://images.unsplash.com/photo-1445019980597-93fa8acb246c',
          'https://images.unsplash.com/photo-1578662996442-48f60103fc96',
        ],
        categoryId: categories[2].id, // Arts & Culture
        venueId: venues[0].id, // Using Eko Hotel as placeholder
        cityId: cities[2].id, // Kano
        tagIds: [tags[3].id, tags[4].id], // Cultural, Food
        publishedStatus: PublishedStatus.PUBLISHED,
        featured: false,
        ticketTypes: [{ name: 'Free Entry', price: 0, quantity: 2000 }],
      },
    ];

    // Create events with ticket types
    for (const eventData of events) {
      const { ticketTypes, tagIds, ...eventInfo } = eventData;

      const event = await prisma.event.create({
        data: {
          ...eventInfo,
          userId: organizer.id,
          tags: {
            connect: tagIds.map((id) => ({ id })),
          },
        },
      });

      // Create ticket types for this event
      for (const ticketType of ticketTypes) {
        await prisma.ticketType.create({
          data: {
            ...ticketType,
            eventId: event.id,
          },
        });
      }

      console.log(`✅ Created event: ${event.title}`);
    }

    console.log('🎉 Successfully seeded 12 events!');
  } catch (error) {
    console.error('❌ Error seeding events:', error);
    throw error;
  }
}

async function main() {
  try {
    await seedEvents();
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
main().catch((error) => {
  console.error('Failed to seed events:', error);
  process.exit(1);
});

export default main;
