// src/actions/voting-contest.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { VotingType, ContestantStatus, EventType } from '@/generated/prisma';
import { createNotification } from '@/actions/notification.actions';
import { getPlatformFeePercentage } from '@/actions/platform-settings.actions';

interface ActionResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

// Cast a free vote - COMPLETED
export async function castFreeVote(
  contestantId: string
): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { success: false, message: 'Please log in to vote' };
  }

  try {
    // Get contestant and contest info
    const contestant = await prisma.contestant.findUnique({
      where: { id: contestantId },
      include: {
        contest: {
          include: {
            event: true,
          },
        },
      },
    });

    if (!contestant) {
      return { success: false, message: 'Contestant not found' };
    }

    const contest = contestant.contest;

    // Check if voting is allowed
    if (contest.votingType !== VotingType.FREE) {
      return { success: false, message: 'This is not a free voting contest' };
    }

    // Check if contestant is active
    if (contestant.status !== ContestantStatus.ACTIVE) {
      return { success: false, message: 'This contestant is not active' };
    }

    // Check voting window
    const now = new Date();
    if (contest.votingStartDate && now < contest.votingStartDate) {
      return { success: false, message: 'Voting has not started yet' };
    }

    if (contest.votingEndDate && now > contest.votingEndDate) {
      return { success: false, message: 'Voting has ended' };
    }

    // Check if user has already voted for this contestant (for free votes)
    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_contestantId_voteType: {
          userId: session.user.id,
          contestantId: contestantId,
          voteType: VotingType.FREE,
        },
      },
    });

    if (existingVote) {
      return {
        success: false,
        message: 'You have already voted for this contestant',
      };
    }

    // Check if multiple votes are allowed
    if (!contest.allowMultipleVotes) {
      const hasVotedInContest = await prisma.vote.findFirst({
        where: {
          userId: session.user.id,
          contestId: contest.id,
          voteType: VotingType.FREE,
        },
      });

      if (hasVotedInContest) {
        return {
          success: false,
          message: 'You can only vote for one contestant in this contest',
        };
      }
    }

    // Check vote limit per user
    if (contest.maxVotesPerUser) {
      const userVoteCount = await prisma.vote.count({
        where: {
          userId: session.user.id,
          contestId: contest.id,
          voteType: VotingType.FREE,
        },
      });

      if (userVoteCount >= contest.maxVotesPerUser) {
        return {
          success: false,
          message: `You have reached the maximum of ${contest.maxVotesPerUser} votes`,
        };
      }
    }

    // Get user's IP address
    const forwardedFor = headersList.get('x-forwarded-for');
    const ipAddress = forwardedFor
      ? forwardedFor.split(',')[0]
      : headersList.get('x-real-ip') || 'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';

    // Cast the vote
    const vote = await prisma.vote.create({
      data: {
        userId: session.user.id,
        contestId: contest.id,
        contestantId: contestantId,
        voteType: VotingType.FREE,
        ipAddress,
        userAgent,
      },
    });

    // Create notification for the contest owner
    await createNotification({
      type: 'VOTE_PURCHASED',
      title: 'New Vote Cast',
      message: `${session.user.name} voted for ${contestant.name} in ${contest.event.title}`,
      userId: contest.event.userId || undefined, // Handle null case
      metadata: {
        contestantId,
        voterName: session.user.name,
        contestantName: contestant.name,
        eventId: contest.eventId, // Move eventId to metadata
      },
    });

    revalidatePath(`/events/${contest.event.slug || contest.eventId}`);
    revalidatePath(`/voting/${contest.id}`);

    return {
      success: true,
      message: `Vote cast successfully for ${contestant.name}!`,
      data: vote,
    };
  } catch (error) {
    console.error('Error casting free vote:', error);
    return { success: false, message: 'Failed to cast vote' };
  }
}

// Get contest results with voting statistics - NEW FUNCTION
export async function getContestResults(
  contestId: string
): Promise<ActionResponse<any>> {
  try {
    // Get contest with all related data
    const contest = await prisma.votingContest.findUnique({
      where: { id: contestId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            userId: true,
            startDateTime: true,
            endDateTime: true,
          },
        },
        contestants: {
          include: {
            _count: {
              select: {
                votes: true,
              },
            },
          },
          orderBy: {
            contestNumber: 'asc',
          },
        },
        votePackages: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
        votes: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            contestant: {
              select: {
                id: true,
                name: true,
                contestNumber: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!contest) {
      return { success: false, message: 'Contest not found' };
    }

    // Calculate total votes
    const totalVotes = await prisma.vote.count({
      where: { contestId },
    });

    // Calculate vote statistics for each contestant
    const results = contest.contestants.map((contestant) => {
      const voteCount = contestant._count.votes;
      const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;

      return {
        id: contestant.id,
        name: contestant.name,
        bio: contestant.bio,
        imageUrl: contestant.imageUrl,
        contestNumber: contestant.contestNumber,
        status: contestant.status,
        socialLinks: {
          instagram: contestant.instagramUrl,
          twitter: contestant.twitterUrl,
          facebook: contestant.facebookUrl,
        },
        voteCount,
        percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
        rank: 0, // Will be calculated after sorting
      };
    });

    // Sort by vote count (descending) and assign ranks
    results.sort((a, b) => b.voteCount - a.voteCount);
    results.forEach((result, index) => {
      result.rank = index + 1;
    });

    // Get voting activity by date (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyVotes = await prisma.vote.groupBy({
      by: ['createdAt'],
      where: {
        contestId,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      _count: {
        id: true,
      },
    });

    // Group votes by day
    const votingActivity = dailyVotes.reduce((acc: any, vote) => {
      const date = vote.createdAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + vote._count.id;
      return acc;
    }, {});

    // Get top voters (for paid contests)
    const topVoters = await prisma.vote.groupBy({
      by: ['userId'],
      where: { contestId },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    });

    // Get user details for top voters
    const voterDetails = await prisma.user.findMany({
      where: {
        id: {
          in: topVoters.map((voter) => voter.userId),
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    const topVotersWithDetails = topVoters.map((voter) => {
      const user = voterDetails.find((u) => u.id === voter.userId);
      return {
        userId: voter.userId,
        name: user?.name || 'Unknown',
        email: user?.email || '',
        voteCount: voter._count.id,
      };
    });

    // Calculate revenue (for paid contests)
    let totalRevenue = 0;
    let platformFee = 0;

    if (contest.votingType === VotingType.PAID) {
      const voteOrders = await prisma.voteOrder.aggregate({
        where: {
          contestId,
          paymentStatus: 'COMPLETED',
        },
        _sum: {
          totalAmount: true,
          platformFee: true,
        },
      });

      totalRevenue = voteOrders._sum.totalAmount || 0;
      platformFee = voteOrders._sum.platformFee || 0;
    }

    return {
      success: true,
      data: {
        contest: {
          id: contest.id,
          votingType: contest.votingType,
          votePackagesEnabled: contest.votePackagesEnabled,
          showLiveResults: contest.showLiveResults,
          showVoterNames: contest.showVoterNames,
          allowMultipleVotes: contest.allowMultipleVotes,
          maxVotesPerUser: contest.maxVotesPerUser,
          votingStartDate: contest.votingStartDate,
          votingEndDate: contest.votingEndDate,
        },
        event: contest.event,
        results,
        votePackages: contest.votePackages,
        statistics: {
          totalVotes,
          totalContestants: contest.contestants.length,
          totalRevenue,
          platformFee,
          netRevenue: totalRevenue - platformFee,
        },
        votingActivity,
        topVoters: topVotersWithDetails,
        recentVotes: contest.votes.slice(0, 50), // Last 50 votes
      },
    };
  } catch (error) {
    console.error('Error getting contest results:', error);
    return { success: false, message: 'Failed to get contest results' };
  }
}

// Get contest results for public viewing (limited data)
export async function getPublicContestResults(
  contestId: string
): Promise<ActionResponse<any>> {
  try {
    const contest = await prisma.votingContest.findUnique({
      where: { id: contestId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            startDateTime: true,
            endDateTime: true,
            publishedStatus: true,
          },
        },
        contestants: {
          where: {
            status: ContestantStatus.ACTIVE,
          },
          include: {
            _count: {
              select: {
                votes: true,
              },
            },
          },
          orderBy: {
            contestNumber: 'asc',
          },
        },
      },
    });

    if (!contest) {
      return { success: false, message: 'Contest not found' };
    }

    if (contest.event.publishedStatus !== 'PUBLISHED') {
      return { success: false, message: 'Contest is not published' };
    }

    // Only show results if live results are enabled
    if (!contest.showLiveResults) {
      return {
        success: true,
        data: {
          contest: {
            id: contest.id,
            showLiveResults: false,
          },
          contestants: contest.contestants.map((contestant) => ({
            id: contestant.id,
            name: contestant.name,
            bio: contestant.bio,
            imageUrl: contestant.imageUrl,
            contestNumber: contestant.contestNumber,
            socialLinks: {
              instagram: contestant.instagramUrl,
              twitter: contestant.twitterUrl,
              facebook: contestant.facebookUrl,
            },
          })),
        },
      };
    }

    // Calculate total votes
    const totalVotes = await prisma.vote.count({
      where: { contestId },
    });

    // Calculate results
    const results = contest.contestants.map((contestant) => {
      const voteCount = contestant._count.votes;
      const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;

      return {
        id: contestant.id,
        name: contestant.name,
        bio: contestant.bio,
        imageUrl: contestant.imageUrl,
        contestNumber: contestant.contestNumber,
        socialLinks: {
          instagram: contestant.instagramUrl,
          twitter: contestant.twitterUrl,
          facebook: contestant.facebookUrl,
        },
        voteCount,
        percentage: Math.round(percentage * 100) / 100,
        rank: 0,
      };
    });

    // Sort and rank
    results.sort((a, b) => b.voteCount - a.voteCount);
    results.forEach((result, index) => {
      result.rank = index + 1;
    });

    return {
      success: true,
      data: {
        contest: {
          id: contest.id,
          showLiveResults: contest.showLiveResults,
          showVoterNames: contest.showVoterNames,
        },
        event: contest.event,
        results,
        statistics: {
          totalVotes,
          totalContestants: contest.contestants.length,
        },
      },
    };
  } catch (error) {
    console.error('Error getting public contest results:', error);
    return { success: false, message: 'Failed to get contest results' };
  }
}

// Updated interface - removed redundant fields that exist in parent Event model
export async function createVotingContest(data: {
  eventId: string;
  votingType: VotingType;
  votePackagesEnabled?: boolean;
  maxVotesPerUser?: number;
  allowMultipleVotes?: boolean;
  showLiveResults?: boolean;
  showVoterNames?: boolean;
}): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { success: false, message: 'Not authenticated' };
  }

  try {
    // Check if user owns the event or is admin
    const event = await prisma.event.findUnique({
      where: { id: data.eventId },
      select: {
        userId: true,
        eventType: true,
        startDateTime: true,
        endDateTime: true,
      },
    });

    if (!event) {
      return { success: false, message: 'Event not found' };
    }

    const isAdmin = session.user.role === 'ADMIN';
    const isOwner = event.userId === session.user.id;

    if (!isAdmin && !isOwner) {
      return { success: false, message: 'Not authorized' };
    }

    if (event.eventType !== EventType.VOTING_CONTEST) {
      return { success: false, message: 'Event must be a voting contest type' };
    }

    // Create voting contest - using event dates for voting window by default
    const votingContest = await prisma.votingContest.create({
      data: {
        eventId: data.eventId,
        votingType: data.votingType,
        votePackagesEnabled: data.votePackagesEnabled || false,
        maxVotesPerUser: data.maxVotesPerUser,
        allowMultipleVotes: data.allowMultipleVotes !== false,
        // Use event's start/end dates as default voting window
        votingStartDate: event.startDateTime,
        votingEndDate: event.endDateTime,
        showLiveResults: data.showLiveResults !== false,
        showVoterNames: data.showVoterNames || false,
      },
    });

    revalidatePath(`/dashboard/events/${data.eventId}`);
    return {
      success: true,
      message: 'Voting contest created successfully',
      data: votingContest,
    };
  } catch (error) {
    console.error('Error creating voting contest:', error);
    return { success: false, message: 'Failed to create voting contest' };
  }
}

// Updated interface - using event-based scheduling
export async function updateVotingContest(data: {
  contestId: string;
  votingType?: VotingType;
  votePackagesEnabled?: boolean;
  maxVotesPerUser?: number;
  allowMultipleVotes?: boolean;
  showLiveResults?: boolean;
  showVoterNames?: boolean;
}): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { success: false, message: 'Not authenticated' };
  }

  try {
    // Check permissions
    const contest = await prisma.votingContest.findUnique({
      where: { id: data.contestId },
      include: {
        event: {
          select: {
            userId: true,
            startDateTime: true,
            endDateTime: true,
          },
        },
      },
    });

    if (!contest) {
      return { success: false, message: 'Contest not found' };
    }

    const isAdmin = session.user.role === 'ADMIN';
    const isOwner = contest.event.userId === session.user.id;

    if (!isAdmin && !isOwner) {
      return { success: false, message: 'Not authorized' };
    }

    // Update contest - sync voting dates with event dates
    const updatedContest = await prisma.votingContest.update({
      where: { id: data.contestId },
      data: {
        ...data,
        // Keep voting window in sync with event dates
        votingStartDate: contest.event.startDateTime,
        votingEndDate: contest.event.endDateTime,
      },
    });

    revalidatePath(`/dashboard/events/${contest.eventId}`);
    return {
      success: true,
      message: 'Voting contest updated successfully',
      data: updatedContest,
    };
  } catch (error) {
    console.error('Error updating voting contest:', error);
    return { success: false, message: 'Failed to update voting contest' };
  }
}

// Create a contestant
export async function createContestant(data: {
  contestId: string;
  name: string;
  bio?: string;
  imageUrl?: string;
  contestNumber: string;
  instagramUrl?: string;
  twitterUrl?: string;
  facebookUrl?: string;
}): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { success: false, message: 'Not authenticated' };
  }

  try {
    // Check permissions
    const contest = await prisma.votingContest.findUnique({
      where: { id: data.contestId },
      include: { event: { select: { userId: true } } },
    });

    if (!contest) {
      return { success: false, message: 'Contest not found' };
    }

    const isAdmin = session.user.role === 'ADMIN';
    const isOwner = contest.event.userId === session.user.id;

    if (!isAdmin && !isOwner) {
      return { success: false, message: 'Not authorized' };
    }

    // Create contestant
    const contestant = await prisma.contestant.create({
      data: {
        contestId: data.contestId,
        name: data.name,
        bio: data.bio,
        imageUrl: data.imageUrl,
        contestNumber: data.contestNumber,
        instagramUrl: data.instagramUrl,
        twitterUrl: data.twitterUrl,
        facebookUrl: data.facebookUrl,
      },
    });

    revalidatePath(`/dashboard/contests/${data.contestId}`);
    return {
      success: true,
      message: 'Contestant created successfully',
      data: contestant,
    };
  } catch (error) {
    console.error('Error creating contestant:', error);
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return { success: false, message: 'Contest number already exists' };
    }
    return { success: false, message: 'Failed to create contestant' };
  }
}

// Create vote packages
export async function createVotePackage(data: {
  contestId: string;
  name: string;
  description?: string;
  voteCount: number;
  price: number;
  sortOrder?: number;
}): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { success: false, message: 'Not authenticated' };
  }

  try {
    // Check permissions
    const contest = await prisma.votingContest.findUnique({
      where: { id: data.contestId },
      include: { event: { select: { userId: true } } },
    });

    if (!contest) {
      return { success: false, message: 'Contest not found' };
    }

    const isAdmin = session.user.role === 'ADMIN';
    const isOwner = contest.event.userId === session.user.id;

    if (!isAdmin && !isOwner) {
      return { success: false, message: 'Not authorized' };
    }

    const votePackage = await prisma.votePackage.create({
      data: {
        contestId: data.contestId,
        name: data.name,
        description: data.description,
        voteCount: data.voteCount,
        price: data.price,
        sortOrder: data.sortOrder || 0,
      },
    });

    revalidatePath(`/dashboard/contests/${data.contestId}`);
    return {
      success: true,
      message: 'Vote package created successfully',
      data: votePackage,
    };
  } catch (error) {
    console.error('Error creating vote package:', error);
    return { success: false, message: 'Failed to create vote package' };
  }
}

// Batch create vote packages (for form submission)
export async function createVotePackages(data: {
  contestId: string;
  packages: Array<{
    name: string;
    description?: string;
    voteCount: number;
    price: number;
    sortOrder?: number;
  }>;
}): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { success: false, message: 'Not authenticated' };
  }

  try {
    // Check permissions
    const contest = await prisma.votingContest.findUnique({
      where: { id: data.contestId },
      include: { event: { select: { userId: true } } },
    });

    if (!contest) {
      return { success: false, message: 'Contest not found' };
    }

    const isAdmin = session.user.role === 'ADMIN';
    const isOwner = contest.event.userId === session.user.id;

    if (!isAdmin && !isOwner) {
      return { success: false, message: 'Not authorized' };
    }

    // Delete existing packages and create new ones
    await prisma.$transaction(async (tx) => {
      // Delete existing packages
      await tx.votePackage.deleteMany({
        where: { contestId: data.contestId },
      });

      // Create new packages
      if (data.packages.length > 0) {
        await tx.votePackage.createMany({
          data: data.packages.map((pkg) => ({
            contestId: data.contestId,
            ...pkg,
            sortOrder: pkg.sortOrder || 0,
          })),
        });
      }
    });

    revalidatePath(`/dashboard/contests/${data.contestId}`);
    return {
      success: true,
      message: `Successfully created ${data.packages.length} vote packages`,
    };
  } catch (error) {
    console.error('Error creating vote packages:', error);
    return { success: false, message: 'Failed to create vote packages' };
  }
}

// Purchase vote package for paid voting
export async function purchaseVotePackage(data: {
  votePackageId: string;
  contestId: string;
}): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { success: false, message: 'Please log in to purchase votes' };
  }

  try {
    // Get vote package and contest info
    const votePackage = await prisma.votePackage.findUnique({
      where: { id: data.votePackageId },
      include: {
        contest: {
          include: {
            event: true,
          },
        },
      },
    });

    if (!votePackage) {
      return { success: false, message: 'Vote package not found' };
    }

    const contest = votePackage.contest;

    // Check if voting is allowed
    if (contest.votingType !== VotingType.PAID) {
      return { success: false, message: 'This is not a paid voting contest' };
    }

    // Check voting window
    const now = new Date();
    if (contest.votingStartDate && now < contest.votingStartDate) {
      return { success: false, message: 'Voting has not started yet' };
    }

    if (contest.votingEndDate && now > contest.votingEndDate) {
      return { success: false, message: 'Voting has ended' };
    }

    // Get platform fee percentage
    const platformFeePercentage = await getPlatformFeePercentage();
    const platformFee = (votePackage.price * platformFeePercentage) / 100;

    // Create a unique reference for Paystack
    const reference = `vote_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    // Create vote order
    const voteOrder = await prisma.voteOrder.create({
      data: {
        userId: session.user.id,
        contestId: data.contestId,
        votePackageId: data.votePackageId,
        paystackId: reference,
        totalAmount: votePackage.price,
        platformFee,
        voteCount: votePackage.voteCount,
        votesRemaining: votePackage.voteCount,
        paymentStatus: 'PENDING',
        currency: 'NGN',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      },
    });

    return {
      success: true,
      message: 'Vote order created successfully',
      data: {
        orderId: voteOrder.id,
        reference: voteOrder.paystackId,
        amount: votePackage.price,
        voteCount: votePackage.voteCount,
      },
    };
  } catch (error) {
    console.error('Error purchasing vote package:', error);
    return { success: false, message: 'Failed to purchase vote package' };
  }
}

// Cast a paid vote (using purchased votes)
export async function castPaidVote(data: {
  contestantId: string;
  voteOrderId: string;
}): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { success: false, message: 'Please log in to vote' };
  }

  try {
    // Get vote order and contestant info
    const voteOrder = await prisma.voteOrder.findUnique({
      where: { id: data.voteOrderId },
      include: {
        contest: {
          include: {
            event: true,
          },
        },
      },
    });

    const contestant = await prisma.contestant.findUnique({
      where: { id: data.contestantId },
    });

    if (!voteOrder) {
      return { success: false, message: 'Vote order not found' };
    }

    if (!contestant) {
      return { success: false, message: 'Contestant not found' };
    }

    // Check if user owns the vote order
    if (voteOrder.userId !== session.user.id) {
      return { success: false, message: 'Not authorized to use these votes' };
    }

    // Check if payment is completed
    if (voteOrder.paymentStatus !== 'COMPLETED') {
      return {
        success: false,
        message: 'Payment not completed for this vote package',
      };
    }

    // Check if votes are available
    if (voteOrder.votesRemaining <= 0) {
      return { success: false, message: 'No votes remaining in this package' };
    }

    // Check if votes have expired
    if (voteOrder.expiresAt && new Date() > voteOrder.expiresAt) {
      return { success: false, message: 'Vote package has expired' };
    }

    const contest = voteOrder.contest;

    // Check if contestant is active
    if (contestant.status !== ContestantStatus.ACTIVE) {
      return { success: false, message: 'This contestant is not active' };
    }

    // Check voting window
    const now = new Date();
    if (contest.votingStartDate && now < contest.votingStartDate) {
      return { success: false, message: 'Voting has not started yet' };
    }

    if (contest.votingEndDate && now > contest.votingEndDate) {
      return { success: false, message: 'Voting has ended' };
    }

    // Check if multiple votes are allowed
    if (!contest.allowMultipleVotes) {
      const hasVotedInContest = await prisma.vote.findFirst({
        where: {
          userId: session.user.id,
          contestId: contest.id,
        },
      });

      if (hasVotedInContest) {
        return {
          success: false,
          message: 'You can only vote for one contestant in this contest',
        };
      }
    }

    // Get user's IP address
    const forwardedFor = headersList.get('x-forwarded-for');
    const ipAddress = forwardedFor
      ? forwardedFor.split(',')[0]
      : headersList.get('x-real-ip') || 'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';

    // Cast the vote and update vote order in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the vote
      const vote = await tx.vote.create({
        data: {
          userId: session.user.id,
          contestId: contest.id,
          contestantId: data.contestantId,
          voteOrderId: data.voteOrderId,
          voteType: VotingType.PAID,
          ipAddress,
          userAgent,
        },
      });

      // Update vote order
      await tx.voteOrder.update({
        where: { id: data.voteOrderId },
        data: {
          votesUsed: {
            increment: 1,
          },
          votesRemaining: {
            decrement: 1,
          },
        },
      });

      return vote;
    });

    // Create notification for the contest owner
    await createNotification({
      type: 'VOTE_PURCHASED',
      title: 'New Paid Vote Cast',
      message: `${session.user.name} used a paid vote for ${contestant.name} in ${contest.event.title}`,
      userId: contest.event.userId || undefined, // Handle null case
      metadata: {
        contestantId: data.contestantId,
        voterName: session.user.name,
        contestantName: contestant.name,
        isPaid: true,
        eventId: contest.eventId, // Move eventId to metadata
      },
    });

    revalidatePath(`/events/${contest.event.slug || contest.eventId}`);
    revalidatePath(`/voting/${contest.id}`);

    return {
      success: true,
      message: `Paid vote cast successfully for ${contestant.name}!`,
      data: {
        vote: result,
        votesRemaining: voteOrder.votesRemaining - 1,
      },
    };
  } catch (error) {
    console.error('Error casting paid vote:', error);
    return { success: false, message: 'Failed to cast vote' };
  }
}

// Verify vote payment (called by Paystack webhook or payment verification)
export async function verifyVotePayment(data: {
  voteOrderId: string;
  paystackReference: string;
  paystackData: any;
}): Promise<ActionResponse<any>> {
  try {
    // Find the vote order
    const voteOrder = await prisma.voteOrder.findUnique({
      where: {
        id: data.voteOrderId,
        paystackId: data.paystackReference,
      },
      include: {
        contest: {
          include: {
            event: true,
          },
        },
        user: true,
      },
    });

    if (!voteOrder) {
      return { success: false, message: 'Vote order not found' };
    }

    if (voteOrder.paymentStatus === 'COMPLETED') {
      return { success: true, message: 'Payment already verified' };
    }

    // Update payment status
    await prisma.voteOrder.update({
      where: { id: data.voteOrderId },
      data: {
        paymentStatus: 'COMPLETED',
        paymentMethod: data.paystackData.channel || 'card',
      },
    });

    // Create notification for user
    await createNotification({
      type: 'VOTE_PURCHASED',
      title: 'Vote Package Purchase Confirmed',
      message: `Your purchase of ${voteOrder.voteCount} votes for ${voteOrder.contest.event.title} has been confirmed`,
      userId: voteOrder.userId,
      metadata: {
        voteCount: voteOrder.voteCount,
        amount: voteOrder.totalAmount,
        contestTitle: voteOrder.contest.event.title,
        eventId: voteOrder.contest.eventId, // Move eventId to metadata
      },
    });

    // Create notification for contest owner
    await createNotification({
      type: 'VOTE_PURCHASED',
      title: 'New Vote Package Purchased',
      message: `${voteOrder.user.name} purchased ${voteOrder.voteCount} votes for ${voteOrder.contest.event.title}`,
      userId: voteOrder.contest.event.userId || undefined, // Handle null case
      metadata: {
        buyerName: voteOrder.user.name,
        voteCount: voteOrder.voteCount,
        amount: voteOrder.totalAmount,
        platformFee: voteOrder.platformFee,
        eventId: voteOrder.contest.eventId, // Move eventId to metadata
      },
    });
    revalidatePath(`/voting/${voteOrder.contestId}`);
    revalidatePath(`/dashboard/votes`);

    return {
      success: true,
      message: 'Vote payment verified successfully',
      data: voteOrder,
    };
  } catch (error) {
    console.error('Error verifying vote payment:', error);
    return { success: false, message: 'Failed to verify payment' };
  }
}

// Get user's vote orders and remaining votes
export async function getUserVoteOrders(
  contestId: string
): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { success: false, message: 'Not authenticated' };
  }

  try {
    const voteOrders = await prisma.voteOrder.findMany({
      where: {
        userId: session.user.id,
        contestId,
        paymentStatus: 'COMPLETED',
      },
      include: {
        votePackage: true,
        votes: {
          include: {
            contestant: {
              select: {
                id: true,
                name: true,
                contestNumber: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const totalVotesRemaining = voteOrders.reduce(
      (sum, order) => sum + order.votesRemaining,
      0
    );

    return {
      success: true,
      data: {
        voteOrders,
        totalVotesRemaining,
        totalVotesPurchased: voteOrders.reduce(
          (sum, order) => sum + order.voteCount,
          0
        ),
        totalAmountSpent: voteOrders.reduce(
          (sum, order) => sum + order.totalAmount,
          0
        ),
      },
    };
  } catch (error) {
    console.error('Error getting user vote orders:', error);
    return { success: false, message: 'Failed to get vote orders' };
  }
}
