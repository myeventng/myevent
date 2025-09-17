'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { FileWithPath } from 'react-dropzone';
import { useDropzone } from 'react-dropzone';
import { generateClientDropzoneAccept } from 'uploadthing/client';
import { UploadDropzone } from '@/lib/uploadthings';
import type { OurFileRouter } from '@/app/api/uploadthing/core';
import { Loader2, X, Plus, Upload } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

// Define a type for the endpoint to handle different file categories
type UploadEndpoint =
  | 'eventImage'
  | 'eventCover'
  | 'profileImage'
  | 'blogImage'
  | 'venueImage'
  | 'contestantImage';

interface FileUploaderProps {
  onFieldChange: (urls: string | string[]) => void;
  imageUrls: string | string[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  maxFiles?: number;
  disabled?: boolean;
  endpoint: UploadEndpoint;
  multipleImages?: boolean;
}

export const FileUploader = ({
  onFieldChange,
  imageUrls,
  setFiles,
  maxFiles = 1,
  disabled = false,
  endpoint,
  multipleImages = false,
}: FileUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
  const [key, setKey] = useState(0); // Add a key to force Image component remount
  const [showUploader, setShowUploader] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convert imageUrls to array format for internal use
  const imageUrlArray = Array.isArray(imageUrls)
    ? imageUrls
    : imageUrls
      ? [imageUrls]
      : [];

  // Debug logs to track props and state changes
  // useEffect(() => {
  //   console.log(`[FileUploader] Props imageUrl:`, imageUrls);
  //   console.log(`[FileUploader] imageUrlArray:`, imageUrlArray);
  //   console.log(`[FileUploader] loadedImages:`, loadedImages);
  //   console.log(`[FileUploader] key:`, key);
  //   console.log(`[FileUploader] showUploader:`, showUploader);
  // }, [imageUrls, imageUrlArray, loadedImages, key, showUploader]);

  // Reset loadedImages when imageUrl changes
  useEffect(() => {
    if (imageUrlArray.length > 0) {
      // console.log(`[FileUploader] imageUrls changed, resetting states`);
      // Initialize all images as not loaded
      const newLoadedState: Record<string, boolean> = {};
      imageUrlArray.forEach((url) => {
        newLoadedState[url] = false;
      });
      setLoadedImages(newLoadedState);
      // Force a remount of the Image components
      setKey((prev) => prev + 1);
    }
  }, [imageUrls]);

  // Handle upload start
  const onUploadStart = () => {
    // console.log('[FileUploader] Upload starting');
    setIsUploading(true);
  };

  // Handle upload completion
  const onComplete = (res: { url: string }[]) => {
    const uploadedUrls = res.map((item) => item.url);
    // console.log('[FileUploader] Upload complete, URLs:', uploadedUrls);

    if (uploadedUrls.length > 0) {
      // For single image mode, just return the first URL as a string
      if (!multipleImages) {
        // console.log(
        //   '[FileUploader] Single image mode - using first URL:',
        //   uploadedUrls[0]
        // );
        onFieldChange(uploadedUrls[0]);
      }
      // For multiple image mode, append to existing URLs
      else {
        const newUrls = [...imageUrlArray, ...uploadedUrls];
        console.log('[FileUploader] Multiple image mode - all URLs:', newUrls);
        onFieldChange(newUrls);
      }

      setIsUploading(false);
      setShowUploader(false); // Hide uploader after completion
    }
  };

  // Handle file drop with react-dropzone
  const onDrop = useCallback(
    (acceptedFiles: FileWithPath[]) => {
      // console.log('[FileUploader] Files dropped:', acceptedFiles);
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

  // Add this function to delete from UploadThing
  const deleteFromUploadThing = async (url: string) => {
    try {
      // console.log('[FileUploader] Deleting from UploadThing:', url);
      const response = await fetch('/api/uploadthing/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        console.error('[FileUploader] Failed to delete from UploadThing');
      } else {
        console.log('[FileUploader] Successfully deleted from UploadThing');
      }
    } catch (error) {
      console.error('[FileUploader] Error calling delete API:', error);
    }
  };

  // Handle remove image
  const handleRemoveImage = async (
    urlToRemove: string,
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    // console.log('[FileUploader] Removing image:', urlToRemove);

    if (urlToRemove) {
      // Delete from UploadThing first
      await deleteFromUploadThing(urlToRemove);

      // Then remove from UI
      const updatedUrls = imageUrlArray.filter((url) => url !== urlToRemove);
      onFieldChange(multipleImages ? updatedUrls : updatedUrls[0] || '');
    } else {
      // Clear all images - need to delete each one
      if (imageUrlArray.length > 0) {
        // Delete all images in parallel
        await Promise.all(
          imageUrlArray.map((url) => deleteFromUploadThing(url))
        );
      }
      onFieldChange(multipleImages ? [] : '');
    }
  };

  // Updated handleAddMore function to actually show the uploader
  const handleAddMore = () => {
    // console.log('[FileUploader] Opening upload for adding more images');
    setIsUploading(false);
    setShowUploader(true); // Show the uploader when "Add More" is clicked
  };

  // Mark an image as loaded
  const handleImageLoaded = (url: string) => {
    // console.log('[FileUploader] Image loaded successfully:', url);
    setLoadedImages((prev) => ({
      ...prev,
      [url]: true,
    }));
  };

  // Check all images
  const checkImageVisibility = () => {
    imageUrlArray.forEach((url) => {
      if (url && !loadedImages[url]) {
        // console.log('[FileUploader] Checking image at URL:', url);
        // Try to pre-load the image to see if it exists
        const img = new window.Image();
        img.onload = () => {
          // console.log('[FileUploader] Image pre-load successful for:', url);
          handleImageLoaded(url);
        };
        img.onerror = () => {
          console.error('[FileUploader] Image pre-load failed for:', url);
        };
        img.src = url;
      }
    });
  };

  // Check images after upload
  useEffect(() => {
    if (imageUrlArray.length > 0) {
      const timer = setTimeout(checkImageVisibility, 500);
      return () => clearTimeout(timer);
    }
  }, [imageUrlArray]);

  // Render a single image
  const renderSingleImage = (url: string) => (
    <div className="space-y-4">
      <div className="relative w-full h-64 border border-gray-200 rounded-md overflow-hidden">
        {!loadedImages[url] && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="ml-2 text-sm">Loading image...</p>
          </div>
        )}
        <Image
          key={`${key}-${url}`}
          src={url}
          alt="Uploaded image"
          fill
          className={`object-cover transition-opacity duration-300 ${
            loadedImages[url] ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => handleImageLoaded(url)}
          onError={(e) => {
            console.error('[FileUploader] Image failed to load:', url);
            setTimeout(() => setKey((prev) => prev + 1), 1000);
          }}
        />
        <div className="absolute top-2 right-2">
          <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={(e) => handleRemoveImage(url, e)}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Add button for replacing the cover image */}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            // This will replace the current image
            handleRemoveImage(url);
            // Then show the uploader
            setShowUploader(true);
          }}
          disabled={isUploading || disabled}
        >
          <Upload className="h-4 w-4 mr-1" /> Replace Image
        </Button>
      </div>
    </div>
  );

  // Render multiple images as a gallery
  const renderImageGallery = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {imageUrlArray.map((url, index) => (
        <div
          key={`gallery-${index}`}
          className="relative h-40 border border-gray-200 rounded-md overflow-hidden"
        >
          {!loadedImages[url] && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            </div>
          )}
          <Image
            key={`${key}-${url}`}
            src={url}
            alt={`Uploaded image ${index + 1}`}
            fill
            className={`object-cover transition-opacity duration-300 ${
              loadedImages[url] ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => handleImageLoaded(url)}
            onError={() => {
              console.error(
                '[FileUploader] Gallery image failed to load:',
                url
              );
              setTimeout(() => setKey((prev) => prev + 1), 1000);
            }}
          />
          <div className="absolute top-1 right-1">
            <Button
              variant="destructive"
              type="button"
              size="icon"
              className="h-6 w-6 min-h-0 min-w-0"
              onClick={(e) => handleRemoveImage(url, e)}
              disabled={disabled}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}

      {/* Add more images button */}
      {multipleImages &&
        imageUrlArray.length > 0 &&
        imageUrlArray.length < maxFiles && (
          <div
            className="h-40 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
            onClick={handleAddMore}
          >
            <div className="flex flex-col items-center">
              <Plus className="h-8 w-8 text-gray-400" />
              <p className="text-sm text-gray-500 mt-2">Add More</p>
            </div>
          </div>
        )}
    </div>
  );

  // Render the uploader dropzone
  const renderUploader = () => (
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
  );

  return (
    <div>
      {showUploader ? (
        // Show uploader when in add more mode
        <div className="space-y-4">
          {renderUploader()}

          {/* Cancel button */}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowUploader(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : imageUrlArray.length > 0 ? (
        <div className="space-y-4">
          {multipleImages
            ? renderImageGallery()
            : renderSingleImage(imageUrlArray[0])}

          {/* Button to add more images when in multi-image mode */}
          {multipleImages && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleRemoveImage('', undefined)}
                disabled={disabled}
                className="mr-2"
              >
                <X className="h-4 w-4 mr-1" /> Clear All
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddMore}
                disabled={
                  isUploading || disabled || imageUrlArray.length >= maxFiles
                }
              >
                <Upload className="h-4 w-4 mr-1" /> Add More Images
              </Button>
            </div>
          )}
        </div>
      ) : (
        renderUploader()
      )}

      {/* Hidden file input for direct file selection */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        multiple={multipleImages}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            const filesArray = Array.from(e.target.files);
            setFiles(filesArray);
          }
        }}
      />
    </div>
  );
};
