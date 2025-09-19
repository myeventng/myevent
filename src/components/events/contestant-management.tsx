'use client';

import { useState, useEffect } from 'react';
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
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Edit2,
  Trash2,
  User,
  Image as ImageIcon,
  Instagram,
  Twitter,
  Facebook,
  Upload,
  X,
} from 'lucide-react';
import { FileUploader } from '@/components/layout/file-uploader';
import { toast } from 'sonner';
import Image from 'next/image';
import { ContestantStatus } from '@/generated/prisma';

// Fixed schema with proper validation and defaults
const contestantSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  bio: z
    .string()
    .min(10, 'Bio must be at least 10 characters')
    .optional()
    .or(z.literal('')),
  imageUrl: z.string().min(1, 'Profile image is required'),
  contestNumber: z.string().min(1, 'Contest number is required'),
  instagramUrl: z
    .string()
    .url('Invalid Instagram URL')
    .optional()
    .or(z.literal('')),
  twitterUrl: z
    .string()
    .url('Invalid Twitter URL')
    .optional()
    .or(z.literal('')),
  facebookUrl: z
    .string()
    .url('Invalid Facebook URL')
    .optional()
    .or(z.literal('')),
  status: z.nativeEnum(ContestantStatus),
});

type ContestantValues = z.infer<typeof contestantSchema>;

interface ContestantManagementProps {
  formData: any;
  updateFormData: (data: any) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function ContestantManagement({
  formData,
  updateFormData,
  onNext,
  onPrevious,
}: ContestantManagementProps) {
  // Initialize contestants with proper fallback
  const [contestants, setContestants] = useState<ContestantValues[]>(() => {
    return formData.contestants || [];
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const form = useForm<ContestantValues>({
    resolver: zodResolver(contestantSchema),
    defaultValues: {
      name: '',
      bio: '',
      imageUrl: '',
      contestNumber: '',
      instagramUrl: '',
      twitterUrl: '',
      facebookUrl: '',
      status: ContestantStatus.ACTIVE,
    },
  });

  // Generate next contest number
  const generateNextContestNumber = () => {
    const existingNumbers = contestants.map(
      (c) => parseInt(c.contestNumber) || 0
    );
    const maxNumber = Math.max(0, ...existingNumbers);
    return String(maxNumber + 1).padStart(3, '0'); // e.g., "001", "002"
  };

  // Handle contestant submission with better validation
  const onSubmitContestant = async (values: ContestantValues) => {
    try {
      // Clean up empty strings to undefined for optional fields
      const cleanedValues = {
        ...values,
        bio: values.bio?.trim() || '',
        instagramUrl: values.instagramUrl?.trim() || '',
        twitterUrl: values.twitterUrl?.trim() || '',
        facebookUrl: values.facebookUrl?.trim() || '',
      };

      // Validate URLs if provided
      if (
        cleanedValues.instagramUrl &&
        !cleanedValues.instagramUrl.startsWith('http')
      ) {
        cleanedValues.instagramUrl = `https://${cleanedValues.instagramUrl}`;
      }
      if (
        cleanedValues.twitterUrl &&
        !cleanedValues.twitterUrl.startsWith('http')
      ) {
        cleanedValues.twitterUrl = `https://${cleanedValues.twitterUrl}`;
      }
      if (
        cleanedValues.facebookUrl &&
        !cleanedValues.facebookUrl.startsWith('http')
      ) {
        cleanedValues.facebookUrl = `https://${cleanedValues.facebookUrl}`;
      }

      if (!cleanedValues.id) {
        cleanedValues.id = `temp-contestant-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      }

      // Check for duplicate contest numbers
      const isDuplicate = contestants.some(
        (c, index) =>
          c.contestNumber === cleanedValues.contestNumber &&
          (isEditMode ? index !== editIndex : true)
      );

      if (isDuplicate) {
        toast.error(
          'Contest number already exists. Please use a different number.'
        );
        return;
      }

      if (isEditMode && editIndex !== null) {
        const updatedContestants = [...contestants];
        updatedContestants[editIndex] = cleanedValues;
        setContestants(updatedContestants);
        toast.success('Contestant updated successfully');
      } else {
        setContestants([...contestants, cleanedValues]);
        toast.success('Contestant added successfully');
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error submitting contestant:', error);
      toast.error('Failed to save contestant');
    }
  };

  // Reset form with proper defaults
  const resetForm = () => {
    form.reset({
      name: '',
      bio: '',
      imageUrl: '',
      contestNumber: generateNextContestNumber(),
      instagramUrl: '',
      twitterUrl: '',
      facebookUrl: '',
      status: ContestantStatus.ACTIVE,
    });
    setImageFiles([]);
    setIsEditMode(false);
    setEditIndex(null);
  };

  // Handle contestant deletion
  const handleDeleteContestant = () => {
    if (deleteIndex !== null) {
      const updatedContestants = [...contestants];
      const deletedContestant = updatedContestants.splice(deleteIndex, 1)[0];
      setContestants(updatedContestants);
      setIsDeleteDialogOpen(false);
      setDeleteIndex(null);
      toast.success(
        `${deletedContestant.name} has been removed from the contest`
      );
    }
  };

  // Handle edit contestant with proper data loading
  const handleEditContestant = (index: number) => {
    const contestant = contestants[index];
    setIsEditMode(true);
    setEditIndex(index);

    // Reset form with contestant data
    form.reset({
      ...contestant,
      bio: contestant.bio || '',
      instagramUrl: contestant.instagramUrl || '',
      twitterUrl: contestant.twitterUrl || '',
      facebookUrl: contestant.facebookUrl || '',
      status: contestant.status || ContestantStatus.ACTIVE,
    });

    setIsDialogOpen(true);
  };

  // Handle next step with validation
  const handleNext = () => {
    if (contestants.length === 0) {
      toast.error('Please add at least one contestant before proceeding.');
      return;
    }

    // Ensure all contestants have required data
    const invalidContestants = contestants.filter(
      (contestant) =>
        !contestant.name || !contestant.imageUrl || !contestant.contestNumber
    );

    if (invalidContestants.length > 0) {
      toast.error(
        'All contestants must have a name, image, and contest number.'
      );
      return;
    }

    // Update form data with proper structure
    updateFormData({
      contestants: contestants.map((contestant) => ({
        ...contestant,
        // Ensure all fields have proper defaults
        bio: contestant.bio || '',
        imageUrl: contestant.imageUrl || '',
        instagramUrl: contestant.instagramUrl || '',
        twitterUrl: contestant.twitterUrl || '',
        facebookUrl: contestant.facebookUrl || '',
        status: contestant.status || ContestantStatus.ACTIVE,
      })),
    });

    onNext();
  };

  // Sync contestants when form data changes
  useEffect(() => {
    if (formData.contestants && Array.isArray(formData.contestants)) {
      setContestants(formData.contestants);
    }
  }, [formData.contestants]);

  // Open add contestant dialog with proper initialization
  const handleAddContestant = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <User className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Contest Participants</h2>
        </div>
        <p className="text-muted-foreground">
          Add contestants who will participate in your voting contest. Each
          contestant needs a profile image, bio, and unique contest number.
        </p>
      </div>

      {/* Contestants Grid */}
      <div className="space-y-4">
        {contestants.length === 0 ? (
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center">
            <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">
              No contestants added yet
            </h3>
            <p className="text-muted-foreground mb-4">
              Add your first contestant to get started with the voting contest.
            </p>
            <Button onClick={handleAddContestant}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Contestant
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  Contestants ({contestants.length})
                </h3>
                <p className="text-sm text-muted-foreground">
                  Manage your contest participants
                </p>
              </div>
              <Button onClick={handleAddContestant}>
                <Plus className="h-4 w-4 mr-2" />
                Add Contestant
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {contestants.map((contestant, index) => (
                <Card key={contestant.id || index} className="overflow-hidden">
                  <div className="relative">
                    {contestant.imageUrl ? (
                      <div className="relative h-48 w-full">
                        <Image
                          src={contestant.imageUrl}
                          alt={contestant.name || 'Contestant'}
                          fill
                          className="object-cover"
                          onError={(e) => {
                            console.error(
                              'Image failed to load:',
                              contestant.imageUrl
                            );
                          }}
                        />
                        <div className="absolute top-2 left-2">
                          <Badge variant="secondary" className="font-mono">
                            #{contestant.contestNumber}
                          </Badge>
                        </div>
                        <div className="absolute top-2 right-2">
                          <Badge
                            variant={
                              contestant.status === ContestantStatus.ACTIVE
                                ? 'default'
                                : 'destructive'
                            }
                          >
                            {contestant.status}
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <div className="h-48 bg-muted flex flex-col items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No image
                        </p>
                      </div>
                    )}
                  </div>

                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">
                      {contestant.name || 'Unnamed Contestant'}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {contestant.bio || 'No bio provided'}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-0">
                    {/* Social Media Links */}
                    <div className="flex gap-2 mb-4">
                      {contestant.instagramUrl && (
                        <div className="p-1 bg-pink-100 rounded-full">
                          <Instagram className="h-3 w-3 text-pink-600" />
                        </div>
                      )}
                      {contestant.twitterUrl && (
                        <div className="p-1 bg-blue-100 rounded-full">
                          <Twitter className="h-3 w-3 text-blue-600" />
                        </div>
                      )}
                      {contestant.facebookUrl && (
                        <div className="p-1 bg-blue-100 rounded-full">
                          <Facebook className="h-3 w-3 text-blue-700" />
                        </div>
                      )}
                      {!contestant.instagramUrl &&
                        !contestant.twitterUrl &&
                        !contestant.facebookUrl && (
                          <span className="text-xs text-muted-foreground">
                            No social links
                          </span>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEditContestant(index)}
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setDeleteIndex(index);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onPrevious}>
          Previous
        </Button>
        <Button onClick={handleNext} disabled={contestants.length === 0}>
          {contestants.length === 0 ? 'Add contestants to continue' : 'Next'}
        </Button>
      </div>

      {/* Add/Edit Contestant Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Edit Contestant' : 'Add Contestant'}
            </DialogTitle>
            <DialogDescription>
              Fill in the contestant&apos;s information. Name, contest number,
              and profile image are required.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmitContestant)}
              className="space-y-6"
            >
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Basic Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Full Name <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Jane Ahmed" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contestNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Contest Number <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 001" {...field} />
                        </FormControl>
                        <FormDescription>
                          Unique identifier for this contestant (auto-generated
                          if empty)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Biography</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell us about this contestant..."
                          className="min-h-24"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Provide a compelling biography that voters will see
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Profile Image */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">
                  Profile Image <span className="text-red-500">*</span>
                </h3>

                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profile Photo</FormLabel>
                      <FormControl>
                        <FileUploader
                          onFieldChange={field.onChange}
                          imageUrls={field.value}
                          setFiles={setImageFiles}
                          endpoint="contestantImage"
                        />
                      </FormControl>
                      <FormDescription>
                        Upload a high-quality profile photo (recommended:
                        400x400 pixels)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Social Media Links */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Social Media (Optional)</h3>

                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="instagramUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Instagram className="h-4 w-4 text-pink-600" />
                          Instagram URL
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://instagram.com/username or instagram.com/username"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="twitterUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Twitter className="h-4 w-4 text-blue-600" />
                          Twitter URL
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://twitter.com/username or twitter.com/username"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="facebookUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Facebook className="h-4 w-4 text-blue-700" />
                          Facebook URL
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://facebook.com/profile or facebook.com/profile"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {isEditMode ? 'Update' : 'Add'} Contestant
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contestant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              {contestants[deleteIndex || 0]?.name || 'this contestant'} from
              the contest? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteIndex(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteContestant}>
              Delete Contestant
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
