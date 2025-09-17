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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { toast } from 'sonner';

// Schema for vote package - remove .default() to make sortOrder required
const votePackageSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Package name must be at least 2 characters'),
  description: z.string().optional(),
  voteCount: z.coerce.number().int().min(1, 'Vote count must be at least 1'),
  price: z.coerce.number().min(0, 'Price must be 0 or greater'),
  sortOrder: z.coerce.number().int(), // Remove .default() to make it required
});

// Main form schema - remove .default() from boolean fields
const formSchema = z.object({
  votingType: z.nativeEnum(VotingType),
  votePackagesEnabled: z.boolean(), // Remove .default()
  maxVotesPerUser: z.coerce.number().int().optional(),
  allowMultipleVotes: z.boolean(), // Remove .default()
  votingStartDate: z.date().optional(),
  votingEndDate: z.date().optional(),
  showLiveResults: z.boolean(), // Remove .default()
  showVoterNames: z.boolean(), // Remove .default()
});

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
  const [votePackages, setVotePackages] = useState<VotePackageValues[]>(
    formData.votePackages || []
  );
  const [isPackageDialogOpen, setIsPackageDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      votingType: formData.votingType || VotingType.FREE,
      votePackagesEnabled: formData.votePackagesEnabled || false, // Set explicit default
      maxVotesPerUser: formData.maxVotesPerUser || undefined,
      allowMultipleVotes: formData.allowMultipleVotes !== false, // Set explicit default
      votingStartDate: formData.votingStartDate || undefined,
      votingEndDate: formData.votingEndDate || undefined,
      showLiveResults: formData.showLiveResults !== false, // Set explicit default
      showVoterNames: formData.showVoterNames || false, // Set explicit default
    },
  });

  const packageForm = useForm<VotePackageValues>({
    resolver: zodResolver(votePackageSchema),
    defaultValues: {
      name: '',
      description: '',
      voteCount: undefined,
      price: undefined,
      sortOrder: 0, // Set explicit default
    },
  });

  const votingType = form.watch('votingType');
  const votePackagesEnabled = form.watch('votePackagesEnabled');

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
        voteCount: undefined,
        price: undefined,
        sortOrder: 0, // Reset with explicit default
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

  // Handle main form submission
  const onSubmit = (values: FormValues) => {
    const contestData = {
      ...values,
      votePackages: votePackagesEnabled ? votePackages : [],
    };

    updateFormData({
      votingContest: contestData,
    });

    onNext();
  };

  // Format price as currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(price);
  };

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
                        onClick={() => field.onChange(VotingType.FREE)}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Vote className="h-5 w-5 text-green-600" />
                            Free Voting
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            Users can vote for free. Each user gets one vote per
                            contestant.
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

          {/* Vote Packages (Only for PAID voting) */}
          {votingType === VotingType.PAID && (
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="votePackagesEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-semibold flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Enable Vote Packages
                      </FormLabel>
                      <FormDescription>
                        Create different vote packages with varying quantities
                        and prices.
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
                          voteCount: undefined,
                          price: undefined,
                          sortOrder: 0,
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
                        package.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {votePackages.map((pkg, index) => (
                        <Card key={pkg.id}>
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

          {/* Voting Rules */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Voting Rules
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

              <FormField
                control={form.control}
                name="allowMultipleVotes"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-8">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Allow Multiple Votes</FormLabel>
                      <FormDescription>
                        Allow users to vote for multiple contestants.
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
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Show Voter Names</FormLabel>
                      <FormDescription>
                        Display the names of people who voted (for
                        transparency).
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
                        />
                      </FormControl>
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
