'use client';

import { useState, useRef } from 'react';
import { updateUser } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Upload, X, User } from 'lucide-react';
import { FileUploader } from '@/components/layout/file-uploader';

interface UpdateUserFormProps {
  name: string;
  image: string;
}

export function UpdateUserForm({ name, image }: UpdateUserFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState(name);
  const [userImage, setUserImage] = useState(image);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await updateUser({
        name: userName,
        image: userImage,
      });

      toast.success('Profile updated successfully');
      router.refresh();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="profileImage">Profile Image</Label>
        <FileUploader
          onFieldChange={(url) => {
            // Always treat as single URL for profile image
            const singleUrl = Array.isArray(url) ? url[0] : url;
            setUserImage(singleUrl);
          }}
          imageUrls={userImage}
          setFiles={setImageFiles}
          maxFiles={1}
          endpoint="profileImage"
          multipleImages={false}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Your full name"
          required
        />
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? 'Updating...' : 'Update Profile'}
        </Button>
      </div>
    </form>
  );
}
