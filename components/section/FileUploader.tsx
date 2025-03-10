'use client';

import { useState, useCallback } from 'react';
import { FileWithPath } from 'react-dropzone';
import { useDropzone } from 'react-dropzone';
import { generateClientDropzoneAccept } from 'uploadthing/client';
import { UploadButton, UploadDropzone, Uploader } from '@/lib/uploadthings';
import type { OurFileRouter } from '@/app/api/uploadthing/core'; // Import your router type
import { Loader2, X, FileImage, Upload } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

// Define a type for the endpoint to handle different file categories
type UploadEndpoint =
  | 'eventImage'
  | 'eventCover'
  | 'profileImage'
  | 'venueImage';

interface FileUploaderProps {
  onFieldChange: (url: string) => void;
  imageUrl: string;
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  maxFiles?: number;
  disabled?: boolean;
  endpoint: UploadEndpoint;
}

export const FileUploader = ({
  onFieldChange,
  imageUrl,
  setFiles,
  maxFiles = 1,
  disabled = false,
  endpoint,
}: FileUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  // Handle file upload completion
  const onComplete = (res: { url: string }[]) => {
    const uploadedImageUrl = res[0]?.url;
    if (uploadedImageUrl) {
      onFieldChange(uploadedImageUrl);
      setIsUploading(false);
    }
  };

  // Handle upload start
  const onUploadStart = () => {
    setIsUploading(true);
  };

  // Handle file drop with react-dropzone
  const onDrop = useCallback(
    (acceptedFiles: FileWithPath[]) => {
      setFiles(acceptedFiles);
    },
    [setFiles]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: generateClientDropzoneAccept(['image/*']),
    maxFiles,
    disabled: isUploading || disabled,
  });

  // Handle remove image
  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFieldChange('');
  };

  return (
    <div>
      {imageUrl && isImageLoaded ? (
        <div className="relative w-full h-64 border border-gray-200 rounded-md overflow-hidden">
          <Image
            src={imageUrl}
            alt="Uploaded image"
            fill
            className="object-cover"
            onLoad={() => setIsImageLoaded(true)}
          />
          <div className="absolute top-2 right-2">
            <Button
              variant="destructive"
              size="icon"
              onClick={handleRemoveImage}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed border-gray-300 rounded-lg p-8 ${
            disabled ? 'opacity-50' : 'hover:border-primary'
          } transition-all flex flex-col items-center justify-center min-h-[200px]`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <p className="mt-2 text-sm text-gray-500">Uploading...</p>
            </div>
          ) : (
            <UploadDropzone<OurFileRouter, UploadEndpoint>
              endpoint={endpoint}
              onClientUploadComplete={onComplete}
              onUploadBegin={onUploadStart}
              className="w-full ut-button:bg-primary ut-button:ut-readying:bg-primary/80 ut-button:ut-uploading:bg-primary/80 ut-label:text-primary"
              config={{ mode: 'auto' }}
              content={{
                label: ({ isDragActive }: { isDragActive: boolean }) =>
                  isDragActive
                    ? 'Drop files here'
                    : `Drag & drop or click to upload (max ${maxFiles} files)`,
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};
