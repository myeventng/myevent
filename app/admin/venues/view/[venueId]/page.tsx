'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getVenue } from '@/lib/actions/venue.actions';
import { VenueView } from '@/components/shared/VenueView';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ViewVenuePage() {
  const [venue, setVenue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const params = useParams();

  useEffect(() => {
    const fetchVenue = async () => {
      try {
        if (params.venueId) {
          const venueData = await getVenue(params.venueId as string);
          setVenue(venueData);
        }
      } catch (error) {
        console.error('Error fetching venue:', error);
        toast.error('Failed to fetch venue details');
      } finally {
        setLoading(false);
      }
    };

    fetchVenue();
  }, [params.venueId]);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!venue) {
    return <div className="p-6">Venue not found</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Link href="/admin/venues" className="mr-4">
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Venue Details</h1>
      </div>

      <VenueView venue={venue} />
    </div>
  );
}
