'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Building, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { canUserCreateEvents } from '@/actions/organizer.actions';
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
  const [canCreate, setCanCreate] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Check if user can create events
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const response = await canUserCreateEvents();
        if (response.success && response.data) {
          setCanCreate(true);
        }
      } catch (error) {
        console.error('Error checking permissions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkPermissions();
  }, []);

  // Handle successful profile creation
  const handleProfileComplete = () => {
    setShowForm(false);
    setShowSuccess(true);

    // Redirect after showing success message
    setTimeout(() => {
      router.push(redirectUrl);
    }, 2000);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Checking your profile...</p>
      </div>
    );
  }

  // User can create events - show the children
  if (canCreate) {
    return <>{children}</>;
  }

  // Show success message after profile creation
  if (showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2 text-green-700">
          Profile Complete!
        </h2>
        <p className="text-muted-foreground mb-4 text-center">
          Your organizer profile has been created successfully.
          <br />
          You can now create and manage events!
        </p>
        <div className="animate-pulse text-sm text-gray-500">
          Redirecting you to create your first event...
        </div>
      </div>
    );
  }

  // Show profile creation form
  if (showForm) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => setShowForm(false)}
            className="mb-4"
          >
            ← Back
          </Button>
          <h2 className="text-2xl font-bold mb-2">Create Organizer Profile</h2>
          <p className="text-muted-foreground">
            Complete your profile to start creating events
          </p>
        </div>
        <OrganizerProfileForm onCompleted={handleProfileComplete} />
      </div>
    );
  }

  // Show initial prompt to create profile
  return (
    <div className="flex flex-col items-center text-center py-12">
      <Building className="h-16 w-16 text-primary mb-6" />
      <h2 className="text-2xl font-bold mb-4">Organizer Profile Required</h2>
      <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
        To create and manage events, you need to set up your organizer profile.
        This information will be displayed to attendees and helps build trust
        with your audience.
      </p>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 max-w-md">
        <p className="text-blue-800 text-sm">
          <strong>Quick Setup:</strong> Once you complete your profile, you can
          immediately start creating events!
        </p>
      </div>
      <Button onClick={() => setShowForm(true)} size="lg">
        Create Organizer Profile
      </Button>
    </div>
  );
}
