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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Vote,
  DollarSign,
  Users,
  Trophy,
  Clock,
  Package,
  Plus,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  Info,
} from 'lucide-react';
import { VotingType } from '@/generated/prisma';
import { DatePicker } from '@/components/layout/date-picker';
import { format } from 'date-fns';
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
import { getPublicPlatformSettings } from '@/actions/platform-settings.actions';
import { toast } from 'sonner';

// Schema for vote package
const votePackageSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Package name must be at least 2 characters'),
  description: z.string().optional(),
  voteCount: z.coerce.number().int().min(1, 'Vote count must be at least 1'),
  price: z.coerce.number().min(0, 'Price must be 0 or greater'),
  sortOrder: z.coerce.number().int(),
});

// Main form schema with proper defaults and conditional validation
const formSchema = z
  .object({
    votingType: z.nativeEnum(VotingType),
    votePackagesEnabled: z.boolean(),
    defaultVotePrice: z.coerce
      .number()
      .min(0, 'Price must be 0 or greater')
      .optional(),
    allowGuestVoting: z.boolean(),
    maxVotesPerUser: z.coerce.number().int().optional(),
    allowMultipleVotes: z.boolean(),
    votingStartDate: z.date().optional(),
    votingEndDate: z.date().optional(),
    showLiveResults: z.boolean(),
    showVoterNames: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.votingType === VotingType.PAID && !data.votePackagesEnabled) {
        return data.defaultVotePrice !== undefined && data.defaultVotePrice > 0;
      }
      return true;
    },
    {
      message:
        'Default vote price is required for paid voting when packages are not enabled',
      path: ['defaultVotePrice'],
    }
  );

type FormValues = z.infer<typeof formSchema>;
type VotePackageValues = z.infer<typeof votePackageSchema>;

interface VotingContestSetupProps {
  formData: any;
  updateFormData: (data: any) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function VotingContestSetup({
  formData,
  updateFormData,
  onNext,
  onPrevious,
}: VotingContestSetupProps) {
  // Initialize vote packages from form data with proper fallback
  const [votePackages, setVotePackages] = useState<VotePackageValues[]>(() => {
    const contestData = formData.votingContest || {};
    return contestData.votePackages || [];
  });

  const [isPackageDialogOpen, setIsPackageDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [platformFeePercentage, setPlatformFeePercentage] = useState(10);

  // Initialize form with proper defaults
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      votingType: formData.votingContest?.votingType || VotingType.FREE,
      votePackagesEnabled: formData.votingContest?.votePackagesEnabled || false,
      defaultVotePrice: formData.votingContest?.defaultVotePrice || undefined,
      allowGuestVoting: formData.votingContest?.allowGuestVoting || false,
      maxVotesPerUser: formData.votingContest?.maxVotesPerUser || undefined,
      allowMultipleVotes: formData.votingContest?.allowMultipleVotes !== false,
      votingStartDate: formData.votingContest?.votingStartDate
        ? new Date(formData.votingContest.votingStartDate)
        : undefined,
      votingEndDate: formData.votingContest?.votingEndDate
        ? new Date(formData.votingContest.votingEndDate)
        : undefined,
      showLiveResults: formData.votingContest?.showLiveResults !== false,
      showVoterNames: formData.votingContest?.showVoterNames || false,
    },
  });

  const packageForm = useForm<VotePackageValues>({
    resolver: zodResolver(votePackageSchema),
    defaultValues: {
      name: '',
      description: '',
      voteCount: 1,
      price: 0,
      sortOrder: 0,
    },
  });

  useEffect(() => {
    const loadPlatformFee = async () => {
      try {
        const result = await getPublicPlatformSettings();
        if (result.success && result.data) {
          setPlatformFeePercentage(result.data.defaultPlatformFeePercentage);
        } else {
          setPlatformFeePercentage(10);
        }
      } catch (error) {
        console.error('Error loading platform fee:', error);
        setPlatformFeePercentage(10);
      }
    };

    loadPlatformFee();
  }, []);

  const votingType = form.watch('votingType');
  const votePackagesEnabled = form.watch('votePackagesEnabled');
  const allowGuestVoting = form.watch('allowGuestVoting');
  const defaultVotePrice = form.watch('defaultVotePrice');

  // Calculate platform fee for a given amount
  const calculatePlatformFee = (amount: number) => {
    return (amount * platformFeePercentage) / 100;
  };

  // Format price as currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(price);
  };

  // Handle vote package submission
  const onSubmitVotePackage = (values: VotePackageValues) => {
    try {
      if (!values.id) {
        values.id = `temp-${Date.now()}`;
      }

      if (isEditMode && editIndex !== null) {
        const updatedPackages = [...votePackages];
        updatedPackages[editIndex] = values;
        setVotePackages(updatedPackages);
        toast.success('Vote package updated successfully');
      } else {
        setVotePackages([...votePackages, values]);
        toast.success('Vote package added successfully');
      }

      setIsPackageDialogOpen(false);
      packageForm.reset({
        name: '',
        description: '',
        voteCount: 1,
        price: 0,
        sortOrder: 0,
      });
      setIsEditMode(false);
      setEditIndex(null);
    } catch (error) {
      console.error('Error submitting vote package:', error);
      toast.error('Failed to save vote package');
    }
  };

  // Handle vote package deletion
  const handleDeleteVotePackage = () => {
    if (deleteIndex !== null) {
      const updatedPackages = [...votePackages];
      updatedPackages.splice(deleteIndex, 1);
      setVotePackages(updatedPackages);
      setIsDeleteDialogOpen(false);
      setDeleteIndex(null);
      toast.success('Vote package removed');
    }
  };

  // Handle main form submission - FIXED to properly structure data
  const onSubmit = (values: FormValues) => {
    // Validate packages if enabled
    if (values.votingType === VotingType.PAID && values.votePackagesEnabled) {
      if (votePackages.length === 0) {
        toast.error(
          'Please add at least one vote package or disable vote packages to use default pricing.'
        );
        return;
      }
    }

    // Construct voting contest data with proper structure
    const votingContestData = {
      votingType: values.votingType,
      votePackagesEnabled: values.votePackagesEnabled,
      defaultVotePrice: values.defaultVotePrice,
      allowGuestVoting: values.allowGuestVoting,
      maxVotesPerUser: values.maxVotesPerUser,
      allowMultipleVotes: values.allowMultipleVotes,
      votingStartDate: values.votingStartDate,
      votingEndDate: values.votingEndDate,
      showLiveResults: values.showLiveResults,
      showVoterNames: values.showVoterNames,
      votePackages: values.votePackagesEnabled ? votePackages : [],
    };

    // Update form data with the complete voting contest structure
    updateFormData({
      votingContest: votingContestData,
    });

    onNext();
  };

  // Sync vote packages when they change
  useEffect(() => {
    if (
      formData.votingContest?.votePackages &&
      Array.isArray(formData.votingContest.votePackages)
    ) {
      setVotePackages(formData.votingContest.votePackages);
    }
  }, [formData.votingContest?.votePackages]);

  // Auto-disable certain features when guest voting is enabled
  useEffect(() => {
    if (allowGuestVoting) {
      form.setValue('allowMultipleVotes', false);
      form.setValue('showVoterNames', false);
    }
  }, [allowGuestVoting, form]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Vote className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Voting Contest Setup</h2>
        </div>
        <p className="text-muted-foreground">
          Configure the voting rules, pricing, and settings for your contest.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Voting Type */}
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="votingType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-semibold flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Voting Type
                  </FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card
                        className={`cursor-pointer transition-all ${
                          field.value === VotingType.FREE
                            ? 'ring-2 ring-primary'
                            : ''
                        }`}
                        onClick={() => {
                          field.onChange(VotingType.FREE);
                          // Reset paid voting specific fields
                          form.setValue('votePackagesEnabled', false);
                          form.setValue('defaultVotePrice', undefined);
                          setVotePackages([]);
                        }}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Vote className="h-5 w-5 text-green-600" />
                            Free Voting
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            Users can vote for free. Each user gets limited
                            votes based on your rules.
                          </p>
                        </CardContent>
                      </Card>

                      <Card
                        className={`cursor-pointer transition-all ${
                          field.value === VotingType.PAID
                            ? 'ring-2 ring-primary'
                            : ''
                        }`}
                        onClick={() => field.onChange(VotingType.PAID)}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-blue-600" />
                            Paid Voting
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            Users purchase votes or vote packages to participate
                            in the contest.
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Paid Voting Settings */}
          {votingType === VotingType.PAID && (
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="defaultVotePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Default Vote Price (NGN){' '}
                      {!votePackagesEnabled && (
                        <span className="text-red-500">*</span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g., 100"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(
                            value === '' ? undefined : parseFloat(value)
                          );
                        }}
                        value={field.value === undefined ? '' : field.value}
                      />
                    </FormControl>
                    <FormDescription>
                      Price for a single vote.{' '}
                      {votePackagesEnabled
                        ? 'This will be used as fallback when vote packages are not available.'
                        : 'This is required when vote packages are not enabled.'}
                    </FormDescription>
                    {field.value && field.value > 0 && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="text-sm text-blue-800 space-y-1">
                          <p>
                            <strong>Vote Price:</strong>{' '}
                            {formatPrice(field.value)}
                          </p>
                          <p>
                            <strong>
                              Platform Fee ({platformFeePercentage}%):
                            </strong>{' '}
                            {formatPrice(calculatePlatformFee(field.value))}
                          </p>
                          <p>
                            <strong>Your Earnings:</strong>{' '}
                            {formatPrice(
                              field.value - calculatePlatformFee(field.value)
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="votePackagesEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          if (!checked) {
                            setVotePackages([]);
                          }
                        }}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-semibold flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Enable Vote Packages (Optional)
                      </FormLabel>
                      <FormDescription>
                        Create different vote packages with varying quantities
                        and prices. When disabled, users will pay the default
                        price above.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {votePackagesEnabled && (
                <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Vote Packages</h3>
                    <Button
                      type="button"
                      onClick={() => {
                        setIsEditMode(false);
                        setIsPackageDialogOpen(true);
                        packageForm.reset({
                          name: '',
                          description: '',
                          voteCount: 1,
                          price: 0,
                          sortOrder: votePackages.length,
                        });
                      }}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Package
                    </Button>
                  </div>

                  {votePackages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No vote packages created yet.</p>
                      <p className="text-sm">
                        Click &quot;Add Package&quot; to create your first
                        package, or users will pay the default price above.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {votePackages.map((pkg, index) => (
                        <Card key={pkg.id || index}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">
                              {pkg.name}
                            </CardTitle>
                            <CardDescription>
                              {formatPrice(pkg.price)}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pb-2">
                            <p className="text-sm text-muted-foreground">
                              {pkg.voteCount} votes
                            </p>
                            <p className="text-xs text-blue-600">
                              Platform fee:{' '}
                              {formatPrice(calculatePlatformFee(pkg.price))}
                            </p>
                            <p className="text-xs text-green-600">
                              Your earnings:{' '}
                              {formatPrice(
                                pkg.price - calculatePlatformFee(pkg.price)
                              )}
                            </p>
                            {pkg.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {pkg.description}
                              </p>
                            )}
                          </CardContent>
                          <CardContent className="pt-0 flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setIsEditMode(true);
                                setEditIndex(index);
                                setIsPackageDialogOpen(true);
                                packageForm.reset(pkg);
                              }}
                            >
                              <Edit2 className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setDeleteIndex(index);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Voter Access Control */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Voter Access
            </h3>

            <FormField
              control={form.control}
              name="allowGuestVoting"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="font-medium">
                      Allow Guest Voting
                    </FormLabel>
                    <FormDescription>
                      Allow users to vote without creating an account. Guest
                      voters will be identified by IP address.
                      {votingType === VotingType.PAID &&
                        ' Note: Guest voting is not recommended for paid contests due to payment verification requirements.'}
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {allowGuestVoting && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-900">
                      Guest Voting Enabled
                    </h4>
                    <ul className="text-sm text-amber-800 mt-1 space-y-1">
                      <li>• Voter names will be hidden for privacy</li>
                      <li>• Multiple votes per contestant are disabled</li>
                      <li>• Vote tracking relies on IP addresses</li>
                      {votingType === VotingType.PAID && (
                        <li>
                          • Payment verification may be more complex for guest
                          users
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Voting Rules */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Voting Rules
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {!allowGuestVoting && (
                <FormField
                  control={form.control}
                  name="maxVotesPerUser"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Votes Per User</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          placeholder="Unlimited"
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(
                              value === '' ? undefined : parseInt(value, 10)
                            );
                          }}
                          value={field.value === undefined ? '' : field.value}
                        />
                      </FormControl>
                      <FormDescription>
                        Leave empty for unlimited votes per user.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="allowMultipleVotes"
                render={({ field }) => (
                  <FormItem
                    className={`flex flex-row items-start space-x-3 space-y-0 ${allowGuestVoting ? 'pt-0' : 'pt-8'}`}
                  >
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={allowGuestVoting}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel
                        className={
                          allowGuestVoting ? 'text-muted-foreground' : ''
                        }
                      >
                        Allow Multiple Votes
                      </FormLabel>
                      <FormDescription>
                        {allowGuestVoting
                          ? 'Disabled when guest voting is enabled'
                          : 'Allow users to vote for multiple contestants.'}
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Voting Schedule */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Voting Schedule
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="votingStartDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Voting Start Date (Optional)</FormLabel>
                    <FormControl>
                      <DatePicker
                        date={field.value}
                        onSelect={field.onChange}
                        placeholder="Select start date"
                      />
                    </FormControl>
                    <FormDescription>
                      When voting should begin. Leave empty to start immediately
                      when published.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="votingEndDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Voting End Date (Optional)</FormLabel>
                    <FormControl>
                      <DatePicker
                        date={field.value}
                        onSelect={field.onChange}
                        placeholder="Select end date"
                      />
                    </FormControl>
                    <FormDescription>
                      When voting should end. Leave empty for no end date.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {form.watch('votingStartDate') && form.watch('votingEndDate') && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Voting Period:</strong>{' '}
                  {format(form.watch('votingStartDate')!, 'PPP')}
                  {' to '} {format(form.watch('votingEndDate')!, 'PPP')}
                </p>
              </div>
            )}
          </div>

          {/* Results & Display Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Results & Display
            </h3>

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="showLiveResults"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Show Live Results</FormLabel>
                      <FormDescription>
                        Display real-time vote counts to voters.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="showVoterNames"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={allowGuestVoting}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel
                        className={
                          allowGuestVoting ? 'text-muted-foreground' : ''
                        }
                      >
                        Show Voter Names
                      </FormLabel>
                      <FormDescription>
                        {allowGuestVoting
                          ? 'Disabled when guest voting is enabled (privacy protection)'
                          : 'Display the names of people who voted (for transparency).'}
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={onPrevious}>
              Previous
            </Button>
            <Button type="submit">Next</Button>
          </div>
        </form>
      </Form>

      {/* Vote Package Dialog */}
      <Dialog open={isPackageDialogOpen} onOpenChange={setIsPackageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Edit Vote Package' : 'Add Vote Package'}
            </DialogTitle>
            <DialogDescription>
              Create packages with different vote quantities and prices.
            </DialogDescription>
          </DialogHeader>

          <Form {...packageForm}>
            <form
              onSubmit={packageForm.handleSubmit(onSubmitVotePackage)}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={packageForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Package Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., 5 Votes, 20 Votes"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={packageForm.control}
                  name="voteCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Votes</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          placeholder="e.g., 5"
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(
                              value === '' ? 1 : parseInt(value, 10)
                            );
                          }}
                          value={field.value || 1}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={packageForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (NGN)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="e.g., 1000"
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(
                              value === '' ? 0 : parseFloat(value)
                            );
                          }}
                          value={field.value || 0}
                        />
                      </FormControl>
                      {field.value && field.value > 0 && (
                        <FormDescription className="space-y-1">
                          <div className="text-blue-600">
                            Platform fee ({platformFeePercentage}%):{' '}
                            {formatPrice(calculatePlatformFee(field.value))}
                          </div>
                          <div className="text-green-600">
                            Your earnings:{' '}
                            {formatPrice(
                              field.value - calculatePlatformFee(field.value)
                            )}
                          </div>
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={packageForm.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort Order</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(
                              value === '' ? 0 : parseInt(value, 10)
                            );
                          }}
                          value={field.value || 0}
                        />
                      </FormControl>
                      <FormDescription>
                        Lower numbers appear first.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={packageForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Perfect for casual voting"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPackageDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {isEditMode ? 'Update' : 'Add'} Package
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
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this
              vote package.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteIndex(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteVotePackage}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
