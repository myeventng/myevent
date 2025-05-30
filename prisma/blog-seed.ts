import { prisma } from '@/lib/prisma';

const defaultBlogCategories = [
  {
    name: 'Event Planning Tips',
    slug: 'event-planning-tips',
    description:
      'Expert advice and best practices for planning successful events',
    color: '#FF6B6B', // Vibrant red
  },
  {
    name: 'Industry Trends',
    slug: 'industry-trends',
    description:
      'Latest trends and innovations in the event management industry',
    color: '#4ECDC4', // Teal
  },
  {
    name: 'Technology & Innovation',
    slug: 'technology-innovation',
    description: 'How technology is transforming event experiences',
    color: '#45B7D1', // Blue
  },
  {
    name: 'Marketing & Promotion',
    slug: 'marketing-promotion',
    description: 'Strategies to promote and market your events effectively',
    color: '#96CEB4', // Mint green
  },
  {
    name: 'Case Studies',
    slug: 'case-studies',
    description:
      'Real-world examples and success stories from event organizers',
    color: '#FFEAA7', // Light yellow
  },
  {
    name: 'Venue & Location',
    slug: 'venue-location',
    description: 'Tips for selecting and managing event venues and locations',
    color: '#DDA0DD', // Plum
  },
  {
    name: 'Budget & Finance',
    slug: 'budget-finance',
    description: 'Financial planning and budgeting strategies for events',
    color: '#98D8C8', // Light teal
  },
  {
    name: 'Sustainability',
    slug: 'sustainability',
    description: 'Eco-friendly practices and sustainable event management',
    color: '#95E1D3', // Mint
  },
  {
    name: 'Corporate Events',
    slug: 'corporate-events',
    description:
      'Specialized content for corporate event planning and management',
    color: '#F7DC6F', // Gold
  },
  {
    name: 'Entertainment & Music',
    slug: 'entertainment-music',
    description:
      'Content related to entertainment events, concerts, and music festivals',
    color: '#BB8FCE', // Light purple
  },
  {
    name: 'Wedding & Social',
    slug: 'wedding-social',
    description: 'Planning guides for weddings and social celebrations',
    color: '#F8C8DC', // Light pink
  },
  {
    name: 'Safety & Security',
    slug: 'safety-security',
    description: 'Best practices for ensuring event safety and security',
    color: '#FF8A80', // Light coral
  },
];

const sampleBlogPosts = [
  {
    title: '10 Essential Event Planning Tips for 2025',
    slug: '10-essential-event-planning-tips-2025',
    excerpt:
      'Master the art of event planning with these proven strategies that will make your events unforgettable and stress-free.',
    content: `Planning an event can be overwhelming, but with the right strategies, you can create memorable experiences that leave lasting impressions. Here are the top 10 tips every event planner should know in 2025.
  
  ## 1. Start with Clear Objectives
  Before diving into logistics, define what success looks like for your event. Are you aiming to generate leads, build brand awareness, or celebrate achievements? Clear objectives guide every decision you make.
  
  ## 2. Create a Detailed Timeline
  Work backwards from your event date. Create milestones for 12 months, 6 months, 3 months, 1 month, and 1 week before the event. This prevents last-minute scrambling.
  
  ## 3. Budget Like a Pro
  Allocate your budget across key categories: venue (40%), catering (30%), entertainment (15%), marketing (10%), and contingency (5%). Always keep 10-15% extra for unexpected costs.
  
  ## 4. Choose the Right Venue
  Your venue sets the tone for everything. Consider location accessibility, capacity, tech capabilities, and alignment with your event's vibe. Visit potential venues in person, never book sight unseen.
  
  ## 5. Leverage Technology
  Use event management software to streamline registration, communication, and logistics. QR codes, mobile apps, and digital check-ins enhance the attendee experience.
  
  ## 6. Plan for Engagement
  Modern attendees expect interactive experiences. Incorporate live polls, Q&A sessions, networking activities, and social media integration to keep people engaged.
  
  ## 7. Prepare for the Unexpected
  Have backup plans for weather, tech failures, vendor cancellations, and other potential issues. Your contingency planning separates amateur from professional event management.
  
  ## 8. Focus on the Experience Journey
  Map out the entire attendee journey from registration to follow-up. Every touchpoint should reinforce your event's value and brand message.
  
  ## 9. Communicate Proactively
  Keep stakeholders informed with regular updates. Use multiple channels - email, social media, event apps - to ensure important information reaches everyone.
  
  ## 10. Measure and Learn
  Define KPIs before the event and measure them afterward. Collect feedback, analyze data, and document lessons learned for future events.
  
  Remember, great events don't happen by accident - they're the result of careful planning, attention to detail, and a focus on creating value for attendees.`,
    categorySlug: 'event-planning-tips',
    tags: ['planning', 'tips', '2025', 'strategy', 'best-practices'],
    featuredImage:
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=400&fit=crop',
    featured: true,
  },
  {
    title:
      'The Rise of Hybrid Events: Blending Physical and Digital Experiences',
    slug: 'rise-of-hybrid-events-2025',
    excerpt:
      'Discover how hybrid events are revolutionizing the industry by combining the best of in-person and virtual experiences.',
    content: `The event industry has undergone a dramatic transformation, with hybrid events emerging as the gold standard for modern gatherings. This approach combines physical and digital elements to create more inclusive, accessible, and engaging experiences.
  
  ## What Are Hybrid Events?
  
  Hybrid events seamlessly blend in-person and virtual components, allowing attendees to participate either on-site or remotely. This model has evolved from necessity to preference, offering unparalleled flexibility and reach.
  
  ## Key Benefits of Hybrid Events
  
  ### Expanded Reach
  Geographic barriers disappear when you offer virtual attendance options. Your local conference can now attract global participants, dramatically expanding your audience.
  
  ### Cost Efficiency
  While initial setup may require investment in streaming technology, hybrid events often reduce per-attendee costs by accommodating more participants without proportional venue size increases.
  
  ### Enhanced Data Collection
  Digital platforms provide rich analytics about attendee behavior, engagement levels, and content preferences that purely physical events can't match.
  
  ### Sustainability Impact
  Reducing travel requirements significantly decreases the carbon footprint of your events, aligning with corporate sustainability goals.
  
  ## Technology Requirements
  
  Success in hybrid events depends on robust technology infrastructure:
  
  - **High-quality streaming equipment** for professional broadcast quality
  - **Interactive platforms** that enable real-time Q&A and polling
  - **Reliable internet connectivity** with backup solutions
  - **User-friendly interfaces** that don't intimidate less tech-savvy attendees
  
  ## Best Practices for Hybrid Success
  
  ### Design for Both Audiences
  Create content and interactions that work equally well for in-person and virtual attendees. Avoid making either group feel like second-class participants.
  
  ### Invest in Production Quality
  Virtual attendees have high expectations shaped by professional media consumption. Poor audio or video quality will quickly lose their attention.
  
  ### Facilitate Cross-Pollination
  Enable meaningful interactions between in-person and virtual attendees through breakout rooms, shared digital tools, and collaborative activities.
  
  ### Plan for Technical Difficulties
  Have dedicated technical support for virtual attendees and backup systems for critical moments like keynote presentations.
  
  ## The Future is Hybrid
  
  As we move forward, hybrid events are becoming the default rather than the exception. Organizations that master this format will have significant competitive advantages in reaching diverse audiences and creating memorable experiences.
  
  The key to success lies in viewing hybrid not as "virtual plus in-person" but as a completely new event format that deserves its own strategic approach and creative thinking.`,
    categorySlug: 'technology-innovation',
    tags: ['hybrid-events', 'technology', 'virtual', 'innovation', 'future'],
    featuredImage:
      'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=800&h=400&fit=crop',
    featured: false,
  },
  {
    title: 'Event Marketing Strategies That Actually Work in 2025',
    slug: 'event-marketing-strategies-2025',
    excerpt:
      'Cut through the noise with proven marketing strategies that drive registrations and create buzz for your events.',
    content: `Event marketing has evolved dramatically in recent years. Traditional approaches are no longer sufficient to capture attention in our oversaturated digital landscape. Here are the strategies that are actually moving the needle in 2025.
  
  ## 1. Community-Driven Marketing
  
  The most successful events now build communities long before the event date. Instead of traditional push marketing, focus on creating value-driven communities where your target audience naturally congregates.
  
  ### Implementation:
  - Start LinkedIn or Discord groups around your event theme
  - Share valuable content consistently, not just event promotions
  - Encourage user-generated content and discussions
  - Use community insights to shape event programming
  
  ## 2. Micro-Influencer Partnerships
  
  Forget celebrity endorsements. Micro-influencers (1K-100K followers) in your industry niche deliver higher engagement and more authentic recommendations.
  
  ### Strategy:
  - Identify influencers whose audience matches your target demographic
  - Offer exclusive access, speaking opportunities, or co-creation partnerships
  - Focus on long-term relationships, not one-off posts
  - Measure engagement rates, not just follower counts
  
  ## 3. Video-First Content Strategy
  
  Video content receives 12x more engagement than text and image content combined. Your event marketing should be video-centric from day one.
  
  ### Content Types:
  - Behind-the-scenes venue tours
  - Speaker interview teasers
  - Previous event highlight reels
  - Live Q&A sessions with organizers
  - Countdown series building anticipation
  
  ## 4. Personalized Email Campaigns
  
  Generic mass emails are dead. Segmented, personalized campaigns based on attendee interests and behavior deliver 6x higher transaction rates.
  
  ### Segmentation Ideas:
  - Previous event attendance history
  - Industry/job function
  - Geographic location
  - Content engagement patterns
  - Registration status (registered, considering, first-time visitor)
  
  ## 5. Strategic Social Proof
  
  Modern buyers trust peer recommendations over brand messaging. Build social proof systematically throughout your marketing campaign.
  
  ### Tactics:
  - Showcase attendee testimonials prominently
  - Share real-time registration numbers and excitement
  - Highlight notable attendees and speakers
  - Create FOMO through limited availability messaging
  - Use countdown timers and urgency indicators
  
  ## 6. Cross-Platform Retargeting
  
  Most people need 7+ touchpoints before taking action. Create cohesive retargeting campaigns across multiple platforms to stay top-of-mind.
  
  ### Platform Strategy:
  - Facebook/Instagram for visual storytelling
  - LinkedIn for professional content
  - Twitter for real-time updates and conversations
  - YouTube for in-depth content
  - TikTok for reaching younger demographics
  
  ## 7. Partnership and Co-Marketing
  
  Leverage other organizations' audiences through strategic partnerships. This amplifies your reach without proportional cost increases.
  
  ### Partnership Types:
  - Industry associations
  - Complementary businesses
  - Media partners
  - Sponsor cross-promotion
  - Speaker networks
  
  ## 8. Interactive Pre-Event Experiences
  
  Engage your audience before they arrive with interactive experiences that build excitement and community.
  
  ### Ideas:
  - Virtual networking sessions
  - Pre-event challenges or contests
  - Exclusive webinars for registered attendees
  - Mobile app launches with gamification
  - Online polls to shape event content
  
  ## Measuring What Matters
  
  Track metrics that actually correlate with event success:
  
  - **Registration conversion rates** by traffic source
  - **Email engagement rates** by segment
  - **Social media engagement quality** (comments, shares, saves)
  - **Website session duration** and page depth
  - **Cost per registration** by channel
  - **Attendee lifetime value** for long-term ROI
  
  ## The Bottom Line
  
  Successful event marketing in 2025 requires treating marketing as an ongoing community-building exercise, not a campaign with start and end dates. The organizations that understand this shift will dominate their industries' event landscapes.
  
  Remember: people attend events for transformation, connection, and growth. Your marketing should promise and deliver these outcomes, not just communicate logistics and features.`,
    categorySlug: 'marketing-promotion',
    tags: [
      'marketing',
      'strategy',
      'social-media',
      'email-marketing',
      'community-building',
    ],
    featuredImage:
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop',
    featured: true,
  },
  {
    title: 'Sustainable Event Planning: Going Green Without Breaking the Bank',
    slug: 'sustainable-event-planning-guide',
    excerpt:
      'Learn practical strategies to make your events environmentally friendly while maintaining budget consciousness and attendee satisfaction.',
    content: `Sustainability in event planning isn't just trendy—it's becoming essential. Modern attendees, especially younger demographics, expect events to demonstrate environmental responsibility. Here's how to go green without compromising your budget or attendee experience.
  
  ## Why Sustainability Matters
  
  Beyond environmental benefits, sustainable practices often:
  - Reduce overall event costs
  - Enhance brand reputation
  - Attract environmentally conscious attendees
  - Meet corporate social responsibility goals
  - Future-proof your events against changing regulations
  
  ## Venue Selection: The Foundation of Green Events
  
  Your venue choice has the biggest environmental impact. Look for:
  
  ### Green Certifications
  - LEED certified buildings
  - Energy Star ratings
  - Local sustainability awards
  - Renewable energy usage
  
  ### Location Considerations
  - Public transportation accessibility
  - Walking distance accommodations
  - Local vendor proximity
  - Multi-purpose spaces reducing setup needs
  
  ## Waste Reduction Strategies
  
  ### Digital-First Approach
  - Electronic registration and check-in
  - Mobile app agendas instead of printed programs
  - QR codes for session feedback
  - Digital business card exchanges
  - Electronic receipts and follow-ups
  
  ### Smart Material Choices
  - Reusable signage and banners
  - Biodegradable name badges
  - Compostable food service items
  - Rental furniture instead of purchasing
  - Local flower arrangements (donated post-event)
  
  ## Sustainable Catering Solutions
  
  Food typically represents 30% of an event's environmental impact.
  
  ### Menu Planning
  - Seasonal, locally-sourced ingredients
  - Plant-forward options (not necessarily all vegetarian)
  - Smaller portion sizes with seconds available
  - Bulk water stations instead of individual bottles
  - Compostable or reusable serving items
  
  ### Waste Management
  - Accurate headcount projections to minimize food waste
  - Donation partnerships for excess food
  - Clearly marked recycling and compost stations
  - Staff training on waste sorting
  - Post-event waste audits
  
  ## Transportation and Logistics
  
  ### Attendee Transportation
  - Shuttle services from major transportation hubs
  - Bike valet services
  - Electric vehicle charging stations
  - Carbon offset programs for air travel
  - Virtual attendance options
  
  ### Shipping and Materials
  - Consolidated shipping schedules
  - Reusable shipping containers
  - Local vendor prioritization
  - Digital material distribution
  - Shared resources between multiple events
  
  ## Technology for Sustainability
  
  ### Event Apps
  - Comprehensive mobile apps reduce paper needs
  - Real-time updates eliminate reprinting
  - Networking features reduce business card waste
  - Feedback collection streamlines surveys
  
  ### Energy Management
  - LED lighting throughout
  - Smart climate control systems
  - Energy-efficient AV equipment
  - Solar charging stations for devices
  - Motion-sensor lighting in low-traffic areas
  
  ## Budget-Conscious Green Practices
  
  ### Cost-Neutral Changes
  - Digital marketing instead of print advertising
  - Bulk purchasing of reusable items
  - Energy-efficient equipment rentals
  - Local vendor partnerships
  - Waste reduction planning
  
  ### Money-Saving Green Initiatives
  - Reduced printing costs through digital alternatives
  - Lower shipping costs via local sourcing
  - Energy savings from efficient equipment
  - Tax incentives for sustainable practices
  - Potential sponsor interest in green initiatives
  
  ## Measuring Your Impact
  
  Track these sustainability metrics:
  - Waste diversion rates
  - Energy consumption per attendee
  - Transportation carbon footprint
  - Local vendor percentage
  - Digital vs. physical material usage
  
  ## Communicating Your Efforts
  
  ### Pre-Event Communication
  - Highlight sustainability features in marketing
  - Provide sustainable travel options
  - Set expectations for green practices
  - Offer digital-only communication options
  
  ### During the Event
  - Visible sustainability messaging
  - Staff education on green practices
  - Attendee engagement in sustainability efforts
  - Real-time impact sharing (waste diverted, energy saved)
  
  ### Post-Event Reporting
  - Share sustainability achievements
  - Quantify environmental impact
  - Highlight cost savings achieved
  - Gather feedback on green initiatives
  
  ## Common Pitfalls to Avoid
  
  - Greenwashing without substance
  - Over-complicating simple sustainable swaps
  - Ignoring attendee experience for sustainability
  - Not training staff on green practices
  - Failing to measure and communicate impact
  
  ## Getting Started: Your First Steps
  
  1. **Conduct a sustainability audit** of your current practices
  2. **Set realistic goals** for your next event
  3. **Choose 3-5 initiatives** to implement initially
  4. **Partner with green vendors** in your area
  5. **Communicate your commitment** to stakeholders
  
  ## The ROI of Green Events
  
  Sustainable events often see:
  - 15-25% reduction in waste management costs
  - 10-20% savings on printing and materials
  - Higher attendee satisfaction scores
  - Increased sponsor interest and support
  - Improved brand perception and loyalty
  
  Remember: sustainability is a journey, not a destination. Start with manageable changes and build momentum over time. Your attendees, budget, and the planet will thank you.`,
    categorySlug: 'sustainability',
    tags: [
      'sustainability',
      'green-events',
      'eco-friendly',
      'budget',
      'environment',
    ],
    featuredImage:
      'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&h=400&fit=crop',
    featured: false,
  },
];

// Prisma seed function to create blog categories
async function seedBlogCategories() {
  console.log('🌱 Seeding blog categories...');

  for (const category of defaultBlogCategories) {
    try {
      const existingCategory = await prisma.blogCategory.findUnique({
        where: { slug: category.slug },
      });

      if (!existingCategory) {
        await prisma.blogCategory.create({
          data: category,
        });
        console.log(`✅ Created blog category: ${category.name}`);
      } else {
        console.log(`⏭️  Blog category already exists: ${category.name}`);
      }
    } catch (error) {
      console.error(`❌ Error creating blog category ${category.name}:`, error);
    }
  }

  console.log('✨ Blog categories seeding completed!');
}

// Function to create sample blog posts
async function seedSampleBlogPosts() {
  console.log('🌱 Seeding sample blog posts...');

  for (const post of sampleBlogPosts) {
    try {
      // Check if post already exists
      const existingPost = await prisma.blog.findUnique({
        where: { slug: post.slug },
      });

      if (!existingPost) {
        // Find the category
        const category = await prisma.blogCategory.findUnique({
          where: { slug: post.categorySlug },
        });

        if (!category) {
          console.log(`❌ Category not found for post: ${post.title}`);
          continue;
        }

        // Find a user to assign as author (preferably SUPER_ADMIN)
        const author = await prisma.user.findFirst({
          where: {
            role: 'ADMIN',
            subRole: 'SUPER_ADMIN',
          },
        });

        if (!author) {
          console.log(
            `❌ No admin user found to assign as author for: ${post.title}`
          );
          continue;
        }

        await prisma.blog.create({
          data: {
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt,
            content: post.content,
            featuredImage: post.featuredImage,
            metaTitle: post.title,
            metaDescription: post.excerpt,
            tags: post.tags,
            readingTime: Math.ceil(post.content.split(' ').length / 200),
            featured: post.featured,
            status: 'PUBLISHED',
            publishedAt: new Date(),
            authorId: author.id,
            categoryId: category.id,
          },
        });

        console.log(`✅ Created blog post: ${post.title}`);
      } else {
        console.log(`⏭️  Blog post already exists: ${post.title}`);
      }
    } catch (error) {
      console.error(`❌ Error creating blog post ${post.title}:`, error);
    }
  }

  console.log('✨ Sample blog posts seeding completed!');
}

// Complete seed function
async function seedBlogData() {
  await seedBlogCategories();
  await seedSampleBlogPosts();
}

// Main function to run the seed
async function main() {
  console.log('🚀 Starting blog seed...');
  await seedBlogData();
  console.log('🎉 Blog seeding completed!');
}

// Run the seed
main()
  .catch((e) => {
    console.error('❌ Blog seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
