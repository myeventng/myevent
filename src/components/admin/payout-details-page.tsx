// src/components/admin/payout-details-page.tsx
'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  ArrowLeft,
  User,
  Building2,
  CreditCard,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  Loader2,
} from 'lucide-react';
import { getAllPayoutRequests, processPayout } from '@/actions/payout.actions';

interface PayoutDetailsPageProps {
  payoutId: string;
}

export function PayoutDetailsPage({ payoutId }: PayoutDetailsPageProps) {
  const router = useRouter();
  const [payout, setPayout] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState('');

  // Fetch payout details
  const fetchPayoutDetails = async () => {
    setIsLoading(true);
    try {
      const response = await getAllPayoutRequests();
      if (response.success && response.data) {
        const payoutDetails = response.data.find((p: any) => p.id === payoutId);
        if (payoutDetails) {
          setPayout(payoutDetails);
        } else {
          toast.error('Payout request not found');
          router.push('/admin/dashboard/payouts');
        }
      }
    } catch (error) {
      console.error('Error fetching payout details:', error);
      toast.error('Failed to fetch payout details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayoutDetails();
  }, [payoutId]);

  // Handle payout processing
  const handleProcessPayout = async (approve: boolean, notes?: string) => {
    setIsProcessing(true);
    try {
      const response = await processPayout(payoutId, approve, notes);
      if (response.success) {
        toast.success(response.message);
        fetchPayoutDetails(); // Refresh data
        if (approve) {
          // Redirect to payouts list after successful approval
          setTimeout(() => {
            router.push('/admin/dashboard/payouts');
          }, 2000);
        }
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      console.error('Error processing payout:', error);
      toast.error('Failed to process payout');
    } finally {
      setIsProcessing(false);
      setRejectionNotes('');
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const variants = {
      PENDING: {
        variant: 'secondary' as const,
        color: 'bg-yellow-100 text-yellow-800',
        icon: Clock,
      },
      PROCESSING: {
        variant: 'default' as const,
        color: 'bg-blue-100 text-blue-800',
        icon: Loader2,
      },
      COMPLETED: {
        variant: 'default' as const,
        color: 'bg-green-100 text-green-800',
        icon: CheckCircle,
      },
      FAILED: {
        variant: 'destructive' as const,
        color: 'bg-red-100 text-red-800',
        icon: XCircle,
      },
    };

    const config =
      variants[status as keyof typeof variants] || variants.PENDING;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!payout) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-lg font-medium">Payout request not found</p>
        <Button
          onClick={() => router.push('/admin/dashboard/payouts')}
          className="mt-4"
        >
          Back to Payouts
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Payout Request Details</h1>
            <p className="text-muted-foreground">Request ID: {payout.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(payout.status)}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Payout Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Payout Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Gross Amount</p>
                  <p className="text-2xl font-bold">
                    ₦{payout.amount.toLocaleString()}
                  </p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Platform Fee</p>
                  <p className="text-2xl font-bold text-red-600">
                    -₦{payout.platformFee.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {((payout.platformFee / payout.amount) * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Net Amount</p>
                  <p className="text-2xl font-bold text-green-600">
                    ₦{payout.netAmount.toLocaleString()}
                  </p>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Payout Period
                  </p>
                  <p className="font-medium">
                    {format(new Date(payout.periodStart), 'MMM d, yyyy')} -{' '}
                    {format(new Date(payout.periodEnd), 'MMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Request Date
                  </p>
                  <p className="font-medium">
                    {format(new Date(payout.createdAt), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                {payout.processedAt && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Processed Date
                    </p>
                    <p className="font-medium">
                      {format(
                        new Date(payout.processedAt),
                        'MMM d, yyyy h:mm a'
                      )}
                    </p>
                  </div>
                )}
                {payout.failureReason && (
                  <div>
                    <p className="text-sm font-medium text-red-600">
                      Failure Reason
                    </p>
                    <p className="text-sm">{payout.failureReason}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bank Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Bank Account Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Account Name
                  </p>
                  <p className="font-medium">{payout.accountName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Account Number
                  </p>
                  <p className="font-medium">{payout.bankAccount || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Bank Code
                  </p>
                  <p className="font-medium">{payout.bankCode || 'N/A'}</p>
                </div>
                {payout.transferCode && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Transfer Code
                    </p>
                    <p className="font-medium">{payout.transferCode}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Organizer Details Sidebar */}
        <div className="space-y-6">
          {/* Organizer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Organizer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-white font-medium">
                    {payout.organizer.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{payout.organizer.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {payout.organizer.email}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Organization</p>
                    <p className="text-sm text-muted-foreground">
                      {payout.organizer.organizerProfile?.organizationName ||
                        'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">
                      {payout.organizer.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Member Since</p>
                    <p className="text-sm text-muted-foreground">
                      {format(
                        new Date(payout.organizer.createdAt || Date.now()),
                        'MMM yyyy'
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          {payout.status === 'PENDING' && (
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
                <CardDescription>Process this payout request</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="w-full" disabled={isProcessing}>
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-1" />
                      )}
                      Approve Payout
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Approve Payout</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to approve this payout of ₦
                        {payout.netAmount.toLocaleString()}
                        to {payout.organizer.name}? This will initiate the
                        transfer process.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleProcessPayout(true)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Approve Payout
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      className="w-full"
                      disabled={isProcessing}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject Payout
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reject Payout</AlertDialogTitle>
                      <AlertDialogDescription>
                        Reject this payout request from {payout.organizer.name}?
                        Please provide a reason for rejection.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                      <Label htmlFor="rejection-notes">Rejection Reason</Label>
                      <Textarea
                        id="rejection-notes"
                        placeholder="Enter reason for rejection..."
                        value={rejectionNotes}
                        onChange={(e) => setRejectionNotes(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() =>
                          handleProcessPayout(false, rejectionNotes)
                        }
                        className="bg-red-600 hover:bg-red-700"
                        disabled={!rejectionNotes.trim()}
                      >
                        Reject Payout
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          )}

          {/* Status Information */}
          <Card>
            <CardHeader>
              <CardTitle>Status Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Current Status</span>
                  {getStatusBadge(payout.status)}
                </div>

                {payout.status === 'PENDING' && (
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800">
                          Awaiting Review
                        </p>
                        <p className="text-sm text-yellow-700">
                          This payout request is pending admin approval.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {payout.status === 'COMPLETED' && (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-800">
                          Successfully Processed
                        </p>
                        <p className="text-sm text-green-700">
                          Payout has been transferred to the organizer&apos;s
                          account.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {payout.status === 'FAILED' && (
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-red-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-800">
                          Processing Failed
                        </p>
                        <p className="text-sm text-red-700">
                          {payout.failureReason ||
                            'Payout could not be processed.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
