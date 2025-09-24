'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  AlertTriangle,
  CheckCircle,
  Ban,
  X,
  Loader2,
} from 'lucide-react';
import { FileUploader } from '@/components/layout/file-uploader';
import { toast } from 'sonner';
import Image from 'next/image';
import { ContestantStatus } from '@/generated/prisma';

// Enhanced schema with proper validation
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
  onDeleteContestant?: (contestantId: string) => void;
  isEditMode?: boolean;
}

export function ContestantManagement({
  formData,
  updateFormData,
  onNext,
  onPrevious,
  onDeleteContestant,
  isEditMode = false,
}: ContestantManagementProps) {
  // State management with error handling
  const [contestants, setContestants] = useState<ContestantValues[]>([]);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogMode, setIsEditDialogMode] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [statusChangeIndex, setStatusChangeIndex] = useState<number | null>(
    null
  );
  const [newStatus, setNewStatus] = useState<ContestantStatus>(
    ContestantStatus.ACTIVE
  );

  // Form with error boundary
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

  // Memoized helper function to extract contestants from formData
  const extractContestantsFromFormData = useCallback(
    (data: any): ContestantValues[] => {
      try {
        console.log('=== EXTRACTING CONTESTANTS FROM FORM DATA ===');
        console.log('Raw formData:', data);

        if (!data) {
          console.log('No data provided');
          return [];
        }

        let extractedContestants: any[] = [];

        // Try multiple sources for contestants data with validation
        if (Array.isArray(data.contestants)) {
          console.log(
            'Found contestants at root level:',
            data.contestants.length
          );
          extractedContestants = data.contestants;
        } else if (Array.isArray(data.votingContest?.contestants)) {
          console.log(
            'Found contestants in votingContest:',
            data.votingContest.contestants.length
          );
          extractedContestants = data.votingContest.contestants;
        } else {
          console.log('No valid contestants array found');
          return [];
        }

        // Normalize and validate contestant data
        const normalizedContestants = extractedContestants
          .filter((contestant) => contestant && typeof contestant === 'object')
          .map((contestant: any, index: number) => {
            try {
              return {
                id: contestant.id || `temp-contestant-${Date.now()}-${index}`,
                name: String(contestant.name || ''),
                bio: String(contestant.bio || ''),
                imageUrl: String(contestant.imageUrl || ''),
                contestNumber: String(
                  contestant.contestNumber || String(index + 1).padStart(3, '0')
                ),
                instagramUrl: String(contestant.instagramUrl || ''),
                twitterUrl: String(contestant.twitterUrl || ''),
                facebookUrl: String(contestant.facebookUrl || ''),
                status: contestant.status || ContestantStatus.ACTIVE,
              };
            } catch (error) {
              console.error('Error normalizing contestant:', error);
              return null;
            }
          })
          .filter(Boolean) as ContestantValues[];

        console.log('Normalized contestants:', normalizedContestants);
        return normalizedContestants;
      } catch (error) {
        console.error('Error extracting contestants:', error);
        setError('Failed to load contestant data');
        return [];
      }
    },
    []
  );

  // Initialize contestants from formData with error handling
  useEffect(() => {
    if (!initialDataLoaded && formData) {
      try {
        console.log('=== INITIALIZING CONTESTANTS FROM FORM DATA ===');
        console.log('formData received:', formData);

        setIsLoading(true);
        setError(null);

        const extractedContestants = extractContestantsFromFormData(formData);

        console.log('Setting initial contestants:', extractedContestants);
        setContestants(extractedContestants);
        setInitialDataLoaded(true);
      } catch (error) {
        console.error('Error during initialization:', error);
        setError('Failed to initialize contestant data');
      } finally {
        setIsLoading(false);
      }
    }
  }, [formData, initialDataLoaded, extractContestantsFromFormData]);

  // Sync contestants back to formData with debouncing
  useEffect(() => {
    if (initialDataLoaded && !isLoading) {
      try {
        console.log('=== SYNCING CONTESTANTS TO FORM DATA ===');
        console.log('Current contestants state:', contestants);

        const timeoutId = setTimeout(() => {
          updateFormData({
            contestants: contestants.map((contestant) => ({
              ...contestant,
              bio: contestant.bio || '',
              imageUrl: contestant.imageUrl || '',
              instagramUrl: contestant.instagramUrl || '',
              twitterUrl: contestant.twitterUrl || '',
              facebookUrl: contestant.facebookUrl || '',
              status: contestant.status || ContestantStatus.ACTIVE,
            })),
          });
        }, 100); // Small debounce to prevent rapid updates

        return () => clearTimeout(timeoutId);
      } catch (error) {
        console.error('Error syncing contestants:', error);
        setError('Failed to sync contestant data');
      }
    }
  }, [contestants, initialDataLoaded, isLoading, updateFormData]);

  // Memoized next contest number generator
  const generateNextContestNumber = useMemo(() => {
    if (contestants.length === 0) return '001';

    const existingNumbers = contestants
      .map((c) => parseInt(c.contestNumber) || 0)
      .filter((num) => !isNaN(num) && num > 0);

    const maxNumber = Math.max(0, ...existingNumbers);
    return String(maxNumber + 1).padStart(3, '0');
  }, [contestants]);

  // Enhanced contestant submission with better error handling
  const onSubmitContestant = async (values: ContestantValues) => {
    try {
      console.log('=== SUBMITTING CONTESTANT ===');
      console.log('Raw values:', values);

      setIsLoading(true);
      setError(null);

      // Validate required fields
      if (!values.name.trim()) {
        toast.error('Name is required');
        return;
      }

      if (!values.contestNumber.trim()) {
        toast.error('Contest number is required');
        return;
      }

      if (!values.imageUrl.trim()) {
        toast.error('Profile image is required');
        return;
      }

      // Clean up data
      const cleanedValues: ContestantValues = {
        ...values,
        name: values.name.trim(),
        bio: values.bio?.trim() || '',
        contestNumber: values.contestNumber.trim(),
        instagramUrl: values.instagramUrl?.trim() || '',
        twitterUrl: values.twitterUrl?.trim() || '',
        facebookUrl: values.facebookUrl?.trim() || '',
      };

      // Auto-prefix URLs if they don't start with http
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

      // Ensure we have an ID for new contestants
      if (!cleanedValues.id || cleanedValues.id === '') {
        cleanedValues.id = `temp-contestant-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      }

      console.log('Cleaned values:', cleanedValues);

      // Check for duplicate contest numbers
      const isDuplicate = contestants.some(
        (c, index) =>
          c.contestNumber === cleanedValues.contestNumber &&
          (isEditDialogMode ? index !== editIndex : true)
      );

      if (isDuplicate) {
        toast.error(
          'Contest number already exists. Please use a different number.'
        );
        return;
      }

      // Update or add contestant
      if (isEditDialogMode && editIndex !== null) {
        console.log('Updating contestant at index:', editIndex);
        setContestants((prev) => {
          const updated = [...prev];
          updated[editIndex] = cleanedValues;
          return updated;
        });
        toast.success('Contestant updated successfully');
      } else {
        console.log('Adding new contestant');
        setContestants((prev) => [...prev, cleanedValues]);
        toast.success('Contestant added successfully');
      }

      // Close dialog and reset
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error submitting contestant:', error);
      setError('Failed to save contestant');
      toast.error('Failed to save contestant');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form with proper defaults
  const resetForm = useCallback(() => {
    try {
      const nextNumber = generateNextContestNumber;
      form.reset({
        name: '',
        bio: '',
        imageUrl: '',
        contestNumber: nextNumber,
        instagramUrl: '',
        twitterUrl: '',
        facebookUrl: '',
        status: ContestantStatus.ACTIVE,
      });
      setImageFiles([]);
      setIsEditDialogMode(false);
      setEditIndex(null);
    } catch (error) {
      console.error('Error resetting form:', error);
    }
  }, [form, generateNextContestNumber]);

  // Enhanced deletion handler
  const handleDeleteContestant = useCallback(() => {
    if (deleteIndex === null) return;

    try {
      const contestantToDelete = contestants[deleteIndex];

      if (!contestantToDelete) {
        toast.error('Contestant not found');
        return;
      }

      console.log('=== DELETING CONTESTANT ===');
      console.log('Contestant to delete:', contestantToDelete);

      // Update state by removing contestant
      setContestants((prev) => {
        const updated = [...prev];
        updated.splice(deleteIndex, 1);
        return updated;
      });

      // Notify parent component about deletion (for database deletion in edit mode)
      if (
        onDeleteContestant &&
        contestantToDelete.id &&
        !contestantToDelete.id.startsWith('temp-')
      ) {
        console.log('Notifying parent of deletion for database cleanup');
        onDeleteContestant(contestantToDelete.id);
      }

      setIsDeleteDialogOpen(false);
      setDeleteIndex(null);
      toast.success(
        `${contestantToDelete.name} has been removed from the contest`
      );
    } catch (error) {
      console.error('Error deleting contestant:', error);
      toast.error('Failed to delete contestant');
    }
  }, [deleteIndex, contestants, onDeleteContestant]);

  // Enhanced edit handler
  const handleEditContestant = useCallback(
    (index: number) => {
      try {
        const contestant = contestants[index];

        if (!contestant) {
          toast.error('Contestant not found');
          return;
        }

        console.log('=== EDITING CONTESTANT ===');
        console.log('Contestant to edit:', contestant);

        setIsEditDialogMode(true);
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
      } catch (error) {
        console.error('Error editing contestant:', error);
        toast.error('Failed to load contestant data');
      }
    },
    [contestants, form]
  );

  // Enhanced status change handler
  const handleStatusChange = useCallback(() => {
    if (statusChangeIndex === null) return;

    try {
      console.log('=== CHANGING CONTESTANT STATUS ===');
      console.log('Index:', statusChangeIndex, 'New status:', newStatus);

      setContestants((prev) => {
        const updated = [...prev];
        if (updated[statusChangeIndex]) {
          updated[statusChangeIndex] = {
            ...updated[statusChangeIndex],
            status: newStatus,
          };
        }
        return updated;
      });

      setIsStatusDialogOpen(false);
      setStatusChangeIndex(null);
      toast.success('Contestant status updated successfully');
    } catch (error) {
      console.error('Error changing status:', error);
      toast.error('Failed to update status');
    }
  }, [statusChangeIndex, newStatus]);

  // Enhanced next step validation
  const handleNext = useCallback(() => {
    try {
      console.log('=== HANDLE NEXT STEP ===');
      console.log('Current contestants:', contestants);

      // Ensure at least one contestant exists
      if (contestants.length === 0) {
        toast.error('Please add at least one contestant before proceeding.');
        return;
      }

      // Validate all contestants have required data
      const invalidContestants = contestants.filter(
        (contestant) =>
          !contestant.name?.trim() ||
          !contestant.imageUrl?.trim() ||
          !contestant.contestNumber?.trim()
      );

      if (invalidContestants.length > 0) {
        console.log('Invalid contestants found:', invalidContestants);
        toast.error(
          'All contestants must have a name, image, and contest number.'
        );
        return;
      }

      // Check for duplicate contest numbers
      const contestNumbers = contestants.map((c) => c.contestNumber);
      const uniqueNumbers = new Set(contestNumbers);

      if (contestNumbers.length !== uniqueNumbers.size) {
        toast.error(
          'Duplicate contest numbers found. Each contestant must have a unique number.'
        );
        return;
      }

      console.log('Moving to next step with contestants:', contestants);
      onNext();
    } catch (error) {
      console.error('Error in next step validation:', error);
      toast.error('Validation failed');
    }
  }, [contestants, onNext]);

  // Helper functions for status display
  const getStatusBadgeVariant = (status: ContestantStatus) => {
    switch (status) {
      case ContestantStatus.ACTIVE:
        return 'default';
      case ContestantStatus.DISQUALIFIED:
        return 'destructive';
      case ContestantStatus.WITHDRAWN:
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: ContestantStatus) => {
    switch (status) {
      case ContestantStatus.ACTIVE:
        return CheckCircle;
      case ContestantStatus.DISQUALIFIED:
        return Ban;
      case ContestantStatus.WITHDRAWN:
        return X;
      default:
        return CheckCircle;
    }
  };

  // Error boundary component
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <User className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Contest Participants</h2>
        </div>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Error loading contestants</span>
            </div>
            <p className="text-sm text-red-600 mt-1">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                setError(null);
                setInitialDataLoaded(false);
              }}
            >
              Retry
            </Button>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={onPrevious}>
            Previous
          </Button>
          <Button disabled>Next</Button>
        </div>
      </div>
    );
  }

  console.log('=== RENDER DEBUG ===');
  console.log('contestants.length:', contestants.length);
  console.log('initialDataLoaded:', initialDataLoaded);
  console.log('isLoading:', isLoading);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <User className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Contest Participants</h2>
        </div>
        <p className="text-muted-foreground">
          {isEditMode
            ? 'Manage contestants who will participate in your voting contest. You can add new contestants, edit existing ones, or remove them.'
            : 'Add contestants who will participate in your voting contest. Each contestant needs a profile image, bio, and unique contest number.'}
        </p>

        {/* Debug info - can be removed in production */}
        <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600">
          <p>Debug Info:</p>
          <p>• Contestants loaded: {contestants.length}</p>
          <p>• Initial data loaded: {initialDataLoaded ? 'Yes' : 'No'}</p>
          <p>• Loading: {isLoading ? 'Yes' : 'No'}</p>
          <p>• Edit mode: {isEditMode ? 'Yes' : 'No'}</p>
          {contestants.length > 0 && (
            <p>• Names: {contestants.map((c) => c.name).join(', ')}</p>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading contestants...</span>
        </div>
      )}

      {/* Contestants Grid */}
      {!isLoading && (
        <div className="space-y-4">
          {contestants.length === 0 ? (
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center">
              <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold mb-2">
                No contestants added yet
              </h3>
              <p className="text-muted-foreground mb-4">
                Add your first contestant to get started with the voting
                contest.
              </p>
              <Button
                onClick={() => {
                  resetForm();
                  setIsDialogOpen(true);
                }}
              >
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
                <Button
                  onClick={() => {
                    resetForm();
                    setIsDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contestant
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {contestants.map((contestant, index) => {
                  const StatusIcon = getStatusIcon(contestant.status);
                  return (
                    <Card
                      key={contestant.id || `contestant-${index}`}
                      className="overflow-hidden"
                    >
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
                            <div className="absolute top-2 right-2 flex gap-2">
                              <Badge
                                variant={getStatusBadgeVariant(
                                  contestant.status
                                )}
                                className="flex items-center gap-1"
                              >
                                <StatusIcon className="h-3 w-3" />
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
                        <div className="flex gap-2 mb-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleEditContestant(index)}
                            disabled={isLoading}
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
                            disabled={isLoading}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Status Change Button */}
                        {isEditMode &&
                          contestant.status === ContestantStatus.ACTIVE && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                setStatusChangeIndex(index);
                                setNewStatus(ContestantStatus.DISQUALIFIED);
                                setIsStatusDialogOpen(true);
                              }}
                              disabled={isLoading}
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Change Status
                            </Button>
                          )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
          disabled={isLoading}
        >
          Previous
        </Button>
        <Button onClick={handleNext} disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Next
        </Button>
      </div>

      {/* Add/Edit Contestant Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditDialogMode ? 'Edit Contestant' : 'Add Contestant'}
            </DialogTitle>
            <DialogDescription>
              Fill in the contestant's information. Name, contest number, and
              profile image are required.
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
                          <Input
                            placeholder="e.g., Jane Ahmed"
                            {...field}
                            disabled={isLoading}
                          />
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
                          <Input
                            placeholder="e.g., 001"
                            {...field}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormDescription>
                          Unique identifier for this contestant
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Status Field for Edit Mode */}
                {isEditMode && (
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isLoading}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={ContestantStatus.ACTIVE}>
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                Active
                              </div>
                            </SelectItem>
                            <SelectItem value={ContestantStatus.DISQUALIFIED}>
                              <div className="flex items-center gap-2">
                                <Ban className="h-4 w-4 text-red-600" />
                                Disqualified
                              </div>
                            </SelectItem>
                            <SelectItem value={ContestantStatus.WITHDRAWN}>
                              <div className="flex items-center gap-2">
                                <X className="h-4 w-4 text-gray-600" />
                                Withdrawn
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Current status of this contestant in the contest
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

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
                          disabled={isLoading}
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
                          disabled={isLoading}
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
                            disabled={isLoading}
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
                            disabled={isLoading}
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
                            disabled={isLoading}
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
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {isEditDialogMode ? 'Updating...' : 'Adding...'}
                    </>
                  ) : isEditDialogMode ? (
                    'Update Contestant'
                  ) : (
                    'Add Contestant'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <AlertDialog
        open={isStatusDialogOpen}
        onOpenChange={setIsStatusDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Contestant Status</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change the status of{' '}
              {contestants[statusChangeIndex || 0]?.name || 'this contestant'}{' '}
              to {newStatus.toLowerCase()}?
              {newStatus === ContestantStatus.DISQUALIFIED && (
                <span className="block mt-2 text-red-600 font-medium">
                  Warning: Disqualifying a contestant cannot be easily undone
                  and may affect existing votes.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <FormLabel>New Status</FormLabel>
            <Select
              value={newStatus}
              onValueChange={(value: ContestantStatus) => setNewStatus(value)}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ContestantStatus.ACTIVE}>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Active
                  </div>
                </SelectItem>
                <SelectItem value={ContestantStatus.DISQUALIFIED}>
                  <div className="flex items-center gap-2">
                    <Ban className="h-4 w-4 text-red-600" />
                    Disqualified
                  </div>
                </SelectItem>
                <SelectItem value={ContestantStatus.WITHDRAWN}>
                  <div className="flex items-center gap-2">
                    <X className="h-4 w-4 text-gray-600" />
                    Withdrawn
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setStatusChangeIndex(null)}
              disabled={isLoading}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStatusChange}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                'Change Status'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              {isEditMode && (
                <span className="block mt-2 text-amber-600 font-medium">
                  Note: If this contestant has existing votes, they cannot be
                  deleted. Consider disqualifying them instead.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setDeleteIndex(null)}
              disabled={isLoading}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteContestant}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete Contestant'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
