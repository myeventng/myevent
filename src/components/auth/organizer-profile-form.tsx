'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, User } from 'lucide-react';
import { FileUploader } from '@/components/layout/file-uploader';

interface OrganizerProfile {
  organizationName: string;
  website?: string;
  bio?: string;
}

interface OrganizerProfileFormProps {
  profile?: OrganizerProfile;
}

export function OrganizerProfileForm({ profile }: OrganizerProfileFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [organizationName, setOrganizationName] = useState(
    profile?.organizationName || ''
  );
  const [website, setWebsite] = useState(profile?.website || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFiles, setLogoFiles] = useState<File[]>([]);
  const [brandColor, setBrandColor] = useState('#3b82f6');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organizationName.trim()) {
      toast.error('Organization name is required');
      return;
    }

    setLoading(true);

    try {
      // This would be your actual API call to update the organizer profile
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mock success
      toast.success('Organizer profile updated successfully');
      router.refresh();
    } catch (error) {
      console.error('Error updating organizer profile:', error);
      toast.error('Failed to update organizer profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="organizationName">Organization Name</Label>
          <Input
            id="organizationName"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            placeholder="Your organization name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://example.com"
            type="url"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell attendees about your organization"
          rows={5}
        />
        <p className="text-xs text-muted-foreground">
          {bio.length}/500 characters
        </p>
      </div>

      <div className="space-y-4">
        <Label>Organization Logo</Label>
        <FileUploader
          onFieldChange={(url) => {
            // Always treat as single URL for logo
            const singleUrl = Array.isArray(url) ? url[0] : url;
            setLogoUrl(singleUrl);
          }}
          imageUrls={logoUrl}
          setFiles={setLogoFiles}
          maxFiles={1}
          endpoint="venueImage" // Reusing venue image endpoint
          multipleImages={false}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="brandColor">Brand Color</Label>
        <div className="flex items-center gap-4">
          <input
            type="color"
            id="brandColor"
            value={brandColor}
            onChange={(e) => setBrandColor(e.target.value)}
            className="h-10 w-10 rounded cursor-pointer"
          />
          <span className="text-sm text-muted-foreground">
            Primary Color: {brandColor}
          </span>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
