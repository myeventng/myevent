'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Building, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getUserOrganizerProfile } from '@/actions/organizer.actions';
import { OrganizerProfileForm } from '../events/organizer-profile-form';

interface OrganizerProfileRequiredProps {
  children: React.ReactNode;
  redirectUrl?: string;
}

export function OrganizerProfileRequired({
  children,
  redirectUrl = '/dashboard/events/create',
}: OrganizerProfileRequiredProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);

  useEffect(() => {
    const checkProfile = async () => {
      try {
        setIsLoading(true);
        const response = await getUserOrganizerProfile();

        if (response.success && response.data) {
          setHasProfile(true);
        } else {
          setHasProfile(false);
        }
      } catch (error) {
        console.error('Error checking organizer profile:', error);
        setHasProfile(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkProfile();
  }, []);

  const handleProfileComplete = () => {
    setHasProfile(true);

    // Redirect after a short delay
    setTimeout(() => {
      router.push(redirectUrl);
    }, 1500);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Checking your profile...</p>
      </div>
    );
  }

  if (!hasProfile) {
    return (
      <div className="space-y-8">
        {!showProfileForm ? (
          <div className="flex flex-col items-center text-center py-8">
            <Building className="h-16 w-16 text-primary mb-4" />
            <h2 className="text-2xl font-bold mb-2">
              Organizer Profile Required
            </h2>
            <p className="text-muted-foreground max-w-md mb-6">
              To create and manage events, you need to set up your organizer
              profile first. This information will be shown to attendees of your
              events.
            </p>
            <Button onClick={() => setShowProfileForm(true)}>
              Create Organizer Profile
            </Button>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <OrganizerProfileForm onCompleted={handleProfileComplete} />
          </div>
        )}
      </div>
    );
  }

  if (hasProfile) {
    return <>{children}</>;
  }

  return null;
}
