import { notFound } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { EditEventForm } from '@/components/events/edit-event-form';
import { getEventById } from '@/actions/event.actions';
import { getContestResults } from '@/actions/voting-contest.actions';
import { getTicketTypesWithSalesData } from '@/actions/ticket.actions';
import { getServerSideAuth } from '@/lib/auth-server';

interface AdminEditEventPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AdminEditEventPage({
  params,
}: AdminEditEventPageProps) {
  const session = await getServerSideAuth({
    roles: ['ADMIN'],
    subRoles: ['STAFF', 'SUPER_ADMIN'],
  });

  if (!session) {
    notFound();
  }

  const { id } = await params;
  const response = await getEventById(id);

  if (!response.success || !response.data) {
    notFound();
  }

  const event = response.data;
  const enhancedEventData = { ...event };

  try {
    if (event.eventType === 'VOTING_CONTEST' && event.votingContest) {
      const contestResults = await getContestResults(event.votingContest.id);

      if (contestResults.success && contestResults.data) {
        const contestants = contestResults.data.results
          ? contestResults.data.results.map((result: any) => ({
              id: result.id,
              name: result.name,
              bio: result.bio || '',
              imageUrl: result.imageUrl || '',
              contestNumber: result.contestNumber,
              instagramUrl: result.socialLinks?.instagram || '',
              twitterUrl: result.socialLinks?.twitter || '',
              facebookUrl: result.socialLinks?.facebook || '',
              status: result.status,
            }))
          : [];

        enhancedEventData.votingContest = {
          ...event.votingContest,
          contestants: contestants,
          votePackages: contestResults.data.votePackages || [],
        };

        enhancedEventData.contestants = contestants;
      } else {
        enhancedEventData.votingContest = {
          ...event.votingContest,
          contestants: [],
          votePackages: [],
        };
        enhancedEventData.contestants = [];
      }
    } else if (event.eventType === 'STANDARD') {
      const ticketTypesResult = await getTicketTypesWithSalesData(event.id);

      if (ticketTypesResult.success) {
        enhancedEventData.ticketTypes = ticketTypesResult.data;
      } else {
        enhancedEventData.ticketTypes = [];
      }
    }
  } catch (error) {
    if (event.eventType === 'VOTING_CONTEST') {
      enhancedEventData.contestants = [];
      if (enhancedEventData.votingContest) {
        enhancedEventData.votingContest.contestants = [];
        enhancedEventData.votingContest.votePackages = [];
      }
    } else {
      enhancedEventData.ticketTypes = [];
    }
  }

  return (
    <DashboardLayout session={session}>
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Edit Event</h1>
            <p className="text-muted-foreground mt-2">
              Update your event details, manage contestants, or modify ticket
              types.
            </p>
            <div className="mt-2 text-sm text-gray-600">
              Editing: <span className="font-medium">{event.title}</span>
              {event.eventType === 'VOTING_CONTEST' && (
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                  Voting Contest ({enhancedEventData.contestants?.length || 0}{' '}
                  contestants)
                </span>
              )}
            </div>
          </div>

          <EditEventForm
            initialData={enhancedEventData}
            isEditing={true}
            userRole={session.user.role}
            userSubRole={session.user.subRole}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
