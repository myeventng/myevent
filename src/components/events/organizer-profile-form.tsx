'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  getUserOrganizerProfile,
  saveOrganizerProfile,
} from '@/actions/organizer.actions';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// Form schema
const formSchema = z.object({
  organizationName: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name must be at most 100 characters'),
  bio: z.string().max(500, 'Bio must be at most 500 characters').optional(),
  website: z
    .string()
    .url('Website must be a valid URL')
    .or(z.literal(''))
    .optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface OrganizerProfileFormProps {
  onCompleted?: () => void;
}

export function OrganizerProfileForm({
  onCompleted,
}: OrganizerProfileFormProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      organizationName: '',
      bio: '',
      website: '',
    },
  });

  // Fetch existing profile if available
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const response = await getUserOrganizerProfile();

        if (response.success && response.data) {
          setProfile(response.data);

          // Populate form with existing data
          form.reset({
            organizationName: response.data.organizationName || '',
            bio: response.data.bio || '',
            website: response.data.website || '',
          });
        }
      } catch (error) {
        console.error('Error fetching organizer profile:', error);
        toast.error('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      const response = await saveOrganizerProfile(values);

      if (response.success) {
        toast.success(
          profile
            ? 'Profile updated successfully'
            : 'Profile created successfully'
        );
        setProfile(response.data);

        // Call the completion callback if provided
        if (onCompleted) {
          onCompleted();
        }
      } else {
        toast.error(response.message || 'Failed to save profile');
      }
    } catch (error) {
      console.error('Error saving organizer profile:', error);
      toast.error('An error occurred while saving profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {profile ? 'Update Organizer Profile' : 'Create Organizer Profile'}
        </CardTitle>
        <CardDescription>
          {profile
            ? 'Update your organizer profile information.'
            : 'Complete your organizer profile to start creating events.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="organizationName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your organization name"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The name of your organization or brand.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us about your organization..."
                      className="min-h-32"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Briefly describe your organization or the types of events
                    you organize.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input placeholder="https://your-website.com" {...field} />
                  </FormControl>
                  <FormDescription>
                    Your organization's website (optional).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {profile ? 'Update Profile' : 'Create Profile'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
