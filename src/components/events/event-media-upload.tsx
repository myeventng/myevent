'use client';

import { useState } from 'react';
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
import { FileUploader } from '@/components/layout/file-uploader';
import { VideoIcon, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Form schema for this step
const formSchema = z.object({
  coverImageUrl: z.string().min(1, 'Cover image is required'),
  imageUrls: z.array(z.string()),
  embeddedVideoUrl: z.string().url().optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

interface EventMediaUploadProps {
  formData: any;
  updateFormData: (data: Partial<FormValues>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function EventMediaUpload({
  formData,
  updateFormData,
  onNext,
  onPrevious,
}: EventMediaUploadProps) {
  const [coverFiles, setCoverFiles] = useState<File[]>([]);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      coverImageUrl: formData.coverImageUrl || '',
      imageUrls: Array.isArray(formData.imageUrls) ? formData.imageUrls : [],
      embeddedVideoUrl: formData.embeddedVideoUrl || '',
    },
  });

  // Helper to convert YouTube embed URLs
  const convertYouTubeUrl = (url: string): string => {
    if (!url) return '';

    // Convert YouTube watch URLs to embed format
    const youtubeRegex =
      /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(youtubeRegex);

    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }

    return url;
  };

  // Handle form submission
  const onSubmit = (values: FormValues) => {
    // Convert YouTube URL if provided
    if (values.embeddedVideoUrl) {
      values.embeddedVideoUrl = convertYouTubeUrl(values.embeddedVideoUrl);
    }

    updateFormData(values);
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Event Media</h2>
        <p className="text-muted-foreground">
          Upload images and add videos for your event.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="coverImageUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cover Image</FormLabel>

                <Alert className="mb-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Usage:</strong> This image will be used in the
                    homepage slider and event detail page.
                    <br />
                    <strong>Recommended dimension:</strong> 1200x630 pixels
                    (maintains 16:9 aspect ratio)
                  </AlertDescription>
                </Alert>

                <FormControl>
                  <FileUploader
                    onFieldChange={field.onChange}
                    imageUrls={field.value || ''}
                    setFiles={setCoverFiles}
                    endpoint="eventCover"
                  />
                </FormControl>
                <FormDescription>
                  Upload a high-quality cover image for your event (recommended
                  size: 1200x630 pixels).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="imageUrls"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Event Gallery</FormLabel>

                <Alert className="mb-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Usage:</strong> The first image will be used as the
                    featured image in event cards, listings, and thumbnails.
                    <br />
                    <strong>Recommended dimension:</strong> 800x600 pixels
                    (maintains 4:3 aspect ratio for better card display)
                    <br />
                    <strong>Additional images:</strong> Will appear in the event
                    gallery section.
                  </AlertDescription>
                </Alert>

                <FormControl>
                  <FileUploader
                    onFieldChange={field.onChange}
                    imageUrls={Array.isArray(field.value) ? field.value : []}
                    setFiles={setGalleryFiles}
                    endpoint="eventImage"
                    multipleImages={true}
                    maxFiles={5}
                  />
                </FormControl>
                <FormDescription>
                  Upload additional images for your event gallery (up to 5
                  images). The first image is particularly important as it will
                  be your primary display image.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="embeddedVideoUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Video URL</FormLabel>
                <FormControl>
                  <div className="flex">
                    <div className="bg-muted p-2 flex items-center rounded-l-md border border-r-0">
                      <VideoIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <Input
                      placeholder="YouTube or Vimeo URL"
                      className="rounded-l-none"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  Add a YouTube or Vimeo video URL to showcase your event.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.watch('embeddedVideoUrl') && (
            <div className="border rounded-md p-4">
              <h3 className="font-medium mb-2">Video Preview:</h3>
              <div className="aspect-video">
                <iframe
                  src={convertYouTubeUrl(form.watch('embeddedVideoUrl') || '')}
                  className="w-full h-full"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={onPrevious}>
              Previous
            </Button>
            <Button type="submit">Next</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}