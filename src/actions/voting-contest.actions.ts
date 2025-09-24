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

// Cast a free vote - UPDATED with guest voting support
export async function castFreeVote(
  contestantId: string,
  guestIdentifier?: string // For guest voting
): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  // For guest voting, we need either a session or a guest identifier
  if (!session && !guestIdentifier) {
    return {
      success: false,
      message: 'Authentication required or provide guest identifier',
    };
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

    const userId = session?.user?.id;

    // Handle guest voting vs authenticated voting differently
    if (contest.allowGuestVoting && !userId) {
      // Guest voting - check by IP address and guest identifier
      const forwardedFor = headersList.get('x-forwarded-for');
      const ipAddress = forwardedFor
        ? forwardedFor.split(',')[0]
        : headersList.get('x-real-ip') || 'unknown';

      // Check if this IP/guest combination has already voted for this contestant
      const existingVote = await prisma.vote.findFirst({
        where: {
          contestId: contest.id,
          contestantId: contestantId,
          ipAddress: ipAddress,
          userId: null, // Guest votes have no userId
        },
      });

      if (existingVote) {
        return {
          success: false,
          message: 'You have already voted for this contestant',
        };
      }

      // For guest voting, we typically don't allow multiple votes
      // Check if this guest has voted in the contest already
      const hasVotedInContest = await prisma.vote.findFirst({
        where: {
          contestId: contest.id,
          ipAddress: ipAddress,
          userId: null,
        },
      });

      if (hasVotedInContest) {
        return {
          success: false,
          message: 'You can only vote once in this contest',
        };
      }

      // Cast guest vote
      const vote = await prisma.vote.create({
        data: {
          userId: null, // No user for guest votes
          contestId: contest.id,
          contestantId: contestantId,
          voteType: VotingType.FREE,
          ipAddress,
          userAgent: headersList.get('user-agent') || 'unknown',
        },
      });

      // Create notification for the contest owner (no voter name for guests)
      await createNotification({
        type: 'VOTE_PURCHASED',
        title: 'New Vote Cast',
        message: `A guest voter voted for ${contestant.name} in ${contest.event.title}`,
        userId: contest.event.userId || undefined,
        metadata: {
          contestantId,
          contestantName: contestant.name,
          isGuest: true,
          eventId: contest.eventId,
        },
      });

      revalidatePath(`/events/${contest.event.slug || contest.eventId}`);
      revalidatePath(`/voting/${contest.id}`);

      return {
        success: true,
        message: `Vote cast successfully for ${contestant.name}!`,
        data: vote,
      };
    } else if (userId) {
      // Authenticated voting - check for existing vote using separate queries
      const existingVote = await prisma.vote.findFirst({
        where: {
          userId: userId,
          contestantId: contestantId,
          voteType: VotingType.FREE,
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
            userId: userId,
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
            userId: userId,
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
          userId: userId,
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
        userId: contest.event.userId || undefined,
        metadata: {
          contestantId,
          voterName: session.user.name,
          contestantName: contestant.name,
          eventId: contest.eventId,
        },
      });

      revalidatePath(`/events/${contest.event.slug || contest.eventId}`);
      revalidatePath(`/voting/${contest.id}`);

      return {
        success: true,
        message: `Vote cast successfully for ${contestant.name}!`,
        data: vote,
      };
    } else {
      return { success: false, message: 'Unable to process vote' };
    }
  } catch (error) {
    return { success: false, message: 'Failed to cast vote' };
  }
}

export async function createVotingContest(data: {
  eventId: string;
  votingType: VotingType;
  votePackagesEnabled?: boolean;
  defaultVotePrice?: number;
  allowGuestVoting?: boolean;
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
        votingContest: true,
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

    // Create voting contest with new fields
    const votingContest = await prisma.votingContest.create({
      data: {
        eventId: data.eventId,
        votingType: data.votingType,
        votePackagesEnabled: data.votePackagesEnabled || false,
        defaultVotePrice: data.defaultVotePrice,
        allowGuestVoting: data.allowGuestVoting || false,
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
    return {
      success: false,
      message: `Failed to create voting contest: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// Updated interface - using event-based scheduling
export async function updateVotingContest(data: {
  contestId: string;
  votingType?: VotingType;
  votePackagesEnabled?: boolean;
  defaultVotePrice?: number;
  allowGuestVoting?: boolean;
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

    // Update contest with new fields
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
    return { success: false, message: 'Failed to update voting contest' };
  }
}

// Rest of the existing functions remain the same...
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
        percentage: Math.round(percentage * 100) / 100,
        rank: 0,
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

    // Get top voters (exclude guest votes and show voter names only if enabled)
    const topVoters = await prisma.vote.groupBy({
      by: ['userId'],
      where: {
        contestId,
        userId: { not: null }, // Exclude guest votes
      },
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

    // Get user details for top voters (only if showVoterNames is enabled)
    let topVotersWithDetails: any[] = [];
    if (contest.showVoterNames) {
      const voterDetails = await prisma.user.findMany({
        where: {
          id: {
            in: topVoters
              .map((voter) => voter.userId)
              .filter((id): id is string => id !== null),
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      topVotersWithDetails = topVoters.map((voter) => {
        const user = voterDetails.find((u) => u.id === voter.userId);
        return {
          userId: voter.userId,
          name: user?.name || 'Unknown',
          email: user?.email || '',
          voteCount: voter._count.id,
        };
      });
    }

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

    // Count guest votes
    const guestVoteCount = await prisma.vote.count({
      where: {
        contestId,
        userId: null,
      },
    });

    return {
      success: true,
      data: {
        contest: {
          id: contest.id,
          votingType: contest.votingType,
          votePackagesEnabled: contest.votePackagesEnabled,
          defaultVotePrice: contest.defaultVotePrice,
          allowGuestVoting: contest.allowGuestVoting,
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
          guestVotes: guestVoteCount,
          registeredVotes: totalVotes - guestVoteCount,
          totalContestants: contest.contestants.length,
          totalRevenue,
          platformFee,
          netRevenue: totalRevenue - platformFee,
        },
        votingActivity,
        topVoters: topVotersWithDetails,
        recentVotes: contest.votes.slice(0, 50),
      },
    };
  } catch (error) {
    return { success: false, message: 'Failed to get contest results' };
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
    return { success: false, message: 'Failed to cast vote' };
  }
}

// Purchase vote with default pricing (when no packages are used)
export async function purchaseVoteWithDefaultPrice(data: {
  contestId: string;
  amount: number;
  voteCount?: number; // Defaults to 1
}): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { success: false, message: 'Please log in to purchase votes' };
  }

  try {
    // Get contest info
    const contest = await prisma.votingContest.findUnique({
      where: { id: data.contestId },
      include: {
        event: true,
      },
    });

    if (!contest) {
      return { success: false, message: 'Contest not found' };
    }

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
    const platformFee = (data.amount * platformFeePercentage) / 100;

    // Create a unique reference for Paystack
    const reference = `vote_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    // Create vote order with default pricing
    const voteOrder = await prisma.voteOrder.create({
      data: {
        userId: session.user.id,
        contestId: data.contestId,
        votePackageId: null, // No package for default pricing
        paystackId: reference,
        totalAmount: data.amount,
        platformFee,
        voteCount: data.voteCount || 1,
        votesRemaining: data.voteCount || 1,
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
        amount: data.amount,
        voteCount: data.voteCount || 1,
      },
    };
  } catch (error) {
    return { success: false, message: 'Failed to purchase vote' };
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
    return { success: false, message: 'Failed to get vote orders' };
  }
}

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
            allowGuestVoting: contest.allowGuestVoting,
            defaultVotePrice: contest.defaultVotePrice,
            votePackagesEnabled: contest.votePackagesEnabled,
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
          allowGuestVoting: contest.allowGuestVoting,
          defaultVotePrice: contest.defaultVotePrice,
          votePackagesEnabled: contest.votePackagesEnabled,
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
    return { success: false, message: 'Failed to get contest results' };
  }
}

// Update contestant
export async function updateContestant(data: {
  id: string;
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
    const contestant = await prisma.contestant.findUnique({
      where: { id: data.id },
      include: {
        contest: {
          include: { event: { select: { userId: true } } },
        },
      },
    });

    if (!contestant) {
      return { success: false, message: 'Contestant not found' };
    }

    const isAdmin = session.user.role === 'ADMIN';
    const isOwner = contestant.contest.event.userId === session.user.id;

    if (!isAdmin && !isOwner) {
      return { success: false, message: 'Not authorized' };
    }

    // Check for duplicate contest numbers (excluding current contestant)
    const duplicateCheck = await prisma.contestant.findFirst({
      where: {
        contestId: data.contestId,
        contestNumber: data.contestNumber,
        NOT: { id: data.id },
      },
    });

    if (duplicateCheck) {
      return { success: false, message: 'Contest number already exists' };
    }

    // Update contestant
    const updatedContestant = await prisma.contestant.update({
      where: { id: data.id },
      data: {
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
      message: 'Contestant updated successfully',
      data: updatedContestant,
    };
  } catch (error) {
    return { success: false, message: 'Failed to update contestant' };
  }
}

// Delete contestant
export async function deleteContestant(
  id: string
): Promise<ActionResponse<null>> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { success: false, message: 'Not authenticated' };
  }

  try {
    // Check permissions and get contestant data
    const contestant = await prisma.contestant.findUnique({
      where: { id },
      include: {
        contest: {
          include: { event: { select: { userId: true } } },
        },
        votes: true,
      },
    });

    if (!contestant) {
      return { success: false, message: 'Contestant not found' };
    }

    const isAdmin = session.user.role === 'ADMIN';
    const isOwner = contestant.contest.event.userId === session.user.id;

    if (!isAdmin && !isOwner) {
      return { success: false, message: 'Not authorized' };
    }

    // Check if contestant has votes
    if (contestant.votes.length > 0) {
      return {
        success: false,
        message:
          'Cannot delete contestant with existing votes. Consider disqualifying instead.',
      };
    }

    // Delete contestant
    await prisma.contestant.delete({
      where: { id },
    });

    revalidatePath(`/dashboard/contests/${contestant.contestId}`);
    return {
      success: true,
      message: 'Contestant deleted successfully',
    };
  } catch (error) {
    return { success: false, message: 'Failed to delete contestant' };
  }
}

// Update contestant status (for disqualification, etc.)
export async function updateContestantStatus(
  id: string,
  status: ContestantStatus
): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    return { success: false, message: 'Not authenticated' };
  }

  try {
    // Check permissions
    const contestant = await prisma.contestant.findUnique({
      where: { id },
      include: {
        contest: {
          include: { event: { select: { userId: true } } },
        },
      },
    });

    if (!contestant) {
      return { success: false, message: 'Contestant not found' };
    }

    const isAdmin = session.user.role === 'ADMIN';
    const isOwner = contestant.contest.event.userId === session.user.id;

    if (!isAdmin && !isOwner) {
      return { success: false, message: 'Not authorized' };
    }

    // Update status
    const updatedContestant = await prisma.contestant.update({
      where: { id },
      data: { status },
    });

    // Create notification if disqualified
    if (status === ContestantStatus.DISQUALIFIED) {
      await createNotification({
        type: 'CONTESTANT_DISQUALIFIED',
        title: 'Contestant Disqualified',
        message: `${contestant.name} has been disqualified from the contest`,
        userId: contestant.contest.event.userId || undefined,
        metadata: {
          contestantId: id,
          contestantName: contestant.name,
          eventId: contestant.contest.eventId,
        },
      });
    }

    revalidatePath(`/dashboard/contests/${contestant.contestId}`);
    return {
      success: true,
      message: `Contestant status updated to ${status.toLowerCase()}`,
      data: updatedContestant,
    };
  } catch (error) {
    return { success: false, message: 'Failed to update contestant status' };
  }
}

// Batch update vote packages
export async function updateVotePackages(data: {
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

    // Check if any vote packages have been purchased
    const existingPackagesWithOrders = await prisma.votePackage.findMany({
      where: {
        contestId: data.contestId,
        voteOrders: {
          some: {
            paymentStatus: 'COMPLETED',
          },
        },
      },
    });

    if (existingPackagesWithOrders.length > 0) {
      return {
        success: false,
        message: 'Cannot modify vote packages after purchases have been made',
      };
    }

    // Update packages in transaction - delete all and recreate
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
      message: `Successfully updated ${data.packages.length} vote packages`,
    };
  } catch (error) {
    return { success: false, message: 'Failed to update vote packages' };
  }
}

// Get contestants for a contest
export async function getContestants(
  contestId: string
): Promise<ActionResponse<any[]>> {
  try {
    const contestants = await prisma.contestant.findMany({
      where: { contestId },
      include: {
        _count: {
          select: {
            votes: true,
          },
        },
      },
      orderBy: { contestNumber: 'asc' },
    });

    return {
      success: true,
      data: contestants,
    };
  } catch (error) {
    return { success: false, message: 'Failed to fetch contestants' };
  }
}

// Get vote packages for a contest
export async function getVotePackages(
  contestId: string
): Promise<ActionResponse<any[]>> {
  try {
    const votePackages = await prisma.votePackage.findMany({
      where: { contestId },
      include: {
        _count: {
          select: {
            voteOrders: {
              where: {
                paymentStatus: 'COMPLETED',
              },
            },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return {
      success: true,
      data: votePackages,
    };
  } catch (error) {
    return { success: false, message: 'Failed to fetch vote packages' };
  }
}
// Cast a paid vote using purchased votes
export async function castPaidVoteFromOrder(data: {
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
      userId: contest.event.userId || undefined,
      metadata: {
        contestantId: data.contestantId,
        voterName: session.user.name,
        contestantName: contestant.name,
        isPaid: true,
        eventId: contest.eventId,
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

// Get available vote orders for a user in a specific contests
export async function getUserVoteOrdersForContest(
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
        votesRemaining: {
          gt: 0, // Only orders with remaining votes
        },
        OR: [
          { expiresAt: null }, // No expiration
          { expiresAt: { gt: new Date() } }, // Not expired
        ],
      },
      include: {
        votePackage: {
          select: {
            id: true,
            name: true,
            voteCount: true,
            price: true,
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
        hasAvailableVotes: totalVotesRemaining > 0,
      },
    };
  } catch (error) {
    console.error('Error fetching user vote orders:', error);
    return { success: false, message: 'Failed to fetch vote orders' };
  }
}

// Get contest statistics for display
export async function getContestStatistics(
  contestId: string
): Promise<ActionResponse<any>> {
  try {
    const contest = await prisma.votingContest.findUnique({
      where: { id: contestId },
      include: {
        contestants: {
          include: {
            _count: {
              select: {
                votes: true,
              },
            },
          },
          where: {
            status: ContestantStatus.ACTIVE,
          },
        },
        _count: {
          select: {
            votes: true,
            VoteOrder: {
              where: {
                paymentStatus: 'COMPLETED',
              },
            },
          },
        },
      },
    });

    if (!contest) {
      return { success: false, message: 'Contest not found' };
    }

    // Calculate statistics
    const totalVotes = contest._count.votes;
    const totalOrders = contest._count.VoteOrder;
    const activeContestants = contest.contestants.length;

    // Calculate revenue for paid contests
    let totalRevenue = 0;
    if (contest.votingType === VotingType.PAID) {
      const revenueResult = await prisma.voteOrder.aggregate({
        where: {
          contestId,
          paymentStatus: 'COMPLETED',
        },
        _sum: {
          totalAmount: true,
        },
      });
      totalRevenue = revenueResult._sum.totalAmount || 0;
    }

    // Get top contestants
    const topContestants = contest.contestants
      .sort((a, b) => b._count.votes - a._count.votes)
      .slice(0, 3)
      .map((contestant, index) => ({
        id: contestant.id,
        name: contestant.name,
        contestNumber: contestant.contestNumber,
        voteCount: contestant._count.votes,
        rank: index + 1,
        percentage:
          totalVotes > 0 ? (contestant._count.votes / totalVotes) * 100 : 0,
      }));

    return {
      success: true,
      data: {
        totalVotes,
        totalOrders,
        activeContestants,
        totalRevenue,
        topContestants,
        votingType: contest.votingType,
        showLiveResults: contest.showLiveResults,
      },
    };
  } catch (error) {
    console.error('Error fetching contest statistics:', error);
    return { success: false, message: 'Failed to fetch contest statistics' };
  }
}

// Check if user can vote (for UI state management)
export async function checkVotingEligibility(
  contestId: string,
  contestantId?: string
): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  try {
    const contest = await prisma.votingContest.findUnique({
      where: { id: contestId },
      include: {
        contestants: {
          where: contestantId ? { id: contestantId } : undefined,
        },
      },
    });

    if (!contest) {
      return { success: false, message: 'Contest not found' };
    }

    // Check if voting is active
    const now = new Date();
    const isVotingActive =
      (!contest.votingStartDate || now >= contest.votingStartDate) &&
      (!contest.votingEndDate || now <= contest.votingEndDate);

    if (!isVotingActive) {
      return {
        success: false,
        message: 'Voting is not currently active',
        data: { canVote: false, reason: 'voting_inactive' },
      };
    }

    // For free voting with guest support
    if (contest.votingType === VotingType.FREE) {
      if (!session && !contest.allowGuestVoting) {
        return {
          success: false,
          message: 'Login required for voting',
          data: { canVote: false, reason: 'login_required' },
        };
      }

      // Check if user has already voted (for authenticated users)
      if (session && contestantId) {
        const existingVote = await prisma.vote.findFirst({
          where: {
            userId: session.user.id,
            contestantId,
            voteType: VotingType.FREE,
          },
        });

        if (existingVote) {
          return {
            success: false,
            message: 'You have already voted for this contestant',
            data: { canVote: false, reason: 'already_voted' },
          };
        }

        // Check vote limits
        if (contest.maxVotesPerUser) {
          const userVoteCount = await prisma.vote.count({
            where: {
              userId: session.user.id,
              contestId,
              voteType: VotingType.FREE,
            },
          });

          if (userVoteCount >= contest.maxVotesPerUser) {
            return {
              success: false,
              message: `You have reached the maximum of ${contest.maxVotesPerUser} votes`,
              data: { canVote: false, reason: 'vote_limit_reached' },
            };
          }
        }
      }

      return {
        success: true,
        data: {
          canVote: true,
          votingType: 'FREE',
          requiresLogin: !contest.allowGuestVoting && !session,
        },
      };
    }

    // For paid voting
    if (contest.votingType === VotingType.PAID) {
      if (!session) {
        return {
          success: false,
          message: 'Login required for paid voting',
          data: { canVote: false, reason: 'login_required' },
        };
      }

      // Check if user has available votes
      const availableVotes = await getUserVoteOrdersForContest(contestId);
      const hasVotes =
        availableVotes.success && availableVotes.data?.totalVotesRemaining > 0;

      return {
        success: true,
        data: {
          canVote: true,
          votingType: 'PAID',
          hasAvailableVotes: hasVotes,
          availableVotes: availableVotes.data?.totalVotesRemaining || 0,
        },
      };
    }

    return {
      success: false,
      message: 'Unknown voting type',
      data: { canVote: false, reason: 'unknown_voting_type' },
    };
  } catch (error) {
    console.error('Error checking voting eligibility:', error);
    return {
      success: false,
      message: 'Failed to check voting eligibility',
      data: { canVote: false, reason: 'system_error' },
    };
  }
}
