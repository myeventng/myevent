import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  RefreshCw,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  User,
  Ticket,
  CreditCard,
} from 'lucide-react';
import { toast } from 'sonner';
import { RefundStatus } from '@/generated/prisma'; // Import the actual enum

interface RefundRequest {
  id: string;
  orderId: string;
  totalAmount: number;
  refundStatus: RefundStatus | null; // Use the actual Prisma enum
  createdAt: string;
  buyer: {
    name: string;
    email: string;
  };
  event: {
    title: string;
    startDateTime: string;
  };
  requestReason?: string;
}

interface RefundManagementProps {
  refundRequests: RefundRequest[];
  onRefundAction: (
    orderId: string,
    approve: boolean,
    notes?: string
  ) => Promise<void>;
  userRole: string;
}

export function RefundManagement({
  refundRequests,
  onRefundAction,
  userRole,
}: RefundManagementProps) {
  const [processingRefund, setProcessingRefund] = useState<string | null>(null);
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(
    null
  );
  const [adminNotes, setAdminNotes] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: RefundStatus | null) => {
    switch (status) {
      case 'INITIATED':
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'PROCESSED':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return null;
    }
  };

  const handleRefundAction = async (approve: boolean) => {
    if (!selectedRefund) return;

    setProcessingRefund(selectedRefund.orderId);

    try {
      await onRefundAction(selectedRefund.orderId, approve, adminNotes);

      // Show success message
      toast.success(
        approve
          ? 'Refund approved successfully'
          : 'Refund rejected successfully'
      );

      setShowDialog(false);
      setAdminNotes('');
      setSelectedRefund(null);

      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Error processing refund:', error);
      toast.error('Failed to process refund. Please try again.');
    } finally {
      setProcessingRefund(null);
    }
  };

  const openRefundDialog = (
    refund: RefundRequest,
    action: 'approve' | 'reject'
  ) => {
    setSelectedRefund(refund);
    setActionType(action);
    setAdminNotes('');
    setShowDialog(true);
  };

  // Filter refunds by status
  const pendingRefunds = refundRequests.filter(
    (r) => r.refundStatus === 'INITIATED'
  );
  const processedRefunds = refundRequests.filter(
    (r) => r.refundStatus === 'PROCESSED'
  );
  const rejectedRefunds = refundRequests.filter(
    (r) => r.refundStatus === 'REJECTED'
  );
  const failedRefunds = refundRequests.filter(
    (r) => r.refundStatus === 'FAILED'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6" />
          Refund Management
        </h2>
        <p className="text-muted-foreground">
          Process refund requests and manage payment reversals
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Pending
                </p>
                <p className="text-2xl font-bold text-yellow-600">
                  {pendingRefunds.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Approved
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {processedRefunds.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Rejected
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {rejectedRefunds.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-gray-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Failed
                </p>
                <p className="text-2xl font-bold text-gray-600">
                  {failedRefunds.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Refunded
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(
                    processedRefunds.reduce((sum, r) => sum + r.totalAmount, 0)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Refunds */}
      {pendingRefunds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-yellow-700">
              Pending Refund Requests ({pendingRefunds.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingRefunds.map((refund) => (
                <div
                  key={refund.id}
                  className="border rounded-lg p-4 bg-yellow-50 border-yellow-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-gray-600" />
                        <span className="font-medium">
                          {refund.event.title}
                        </span>
                        {getStatusBadge(refund.refundStatus)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <div>
                            <p className="font-medium">{refund.buyer.name}</p>
                            <p className="text-gray-600">
                              {refund.buyer.email}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-gray-500" />
                          <div>
                            <p className="font-medium">
                              {formatCurrency(refund.totalAmount)}
                            </p>
                            <p className="text-gray-600">Refund Amount</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <div>
                            <p className="font-medium">
                              {formatDate(refund.createdAt)}
                            </p>
                            <p className="text-gray-600">Requested</p>
                          </div>
                        </div>
                      </div>

                      {refund.requestReason && (
                        <div className="mt-2 p-2 bg-white rounded border">
                          <p className="text-sm text-gray-700">
                            <strong>Reason:</strong> {refund.requestReason}
                          </p>
                        </div>
                      )}
                    </div>

                    {userRole === 'ADMIN' && (
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-700 border-green-300 hover:bg-green-50"
                          onClick={() => openRefundDialog(refund, 'approve')}
                          disabled={processingRefund === refund.orderId}
                        >
                          {processingRefund === refund.orderId ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-700 border-red-300 hover:bg-red-50"
                          onClick={() => openRefundDialog(refund, 'reject')}
                          disabled={processingRefund === refund.orderId}
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processed Refunds */}
      {processedRefunds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-green-700">
              Approved Refunds ({processedRefunds.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {processedRefunds.slice(0, 5).map((refund) => (
                <div
                  key={refund.id}
                  className="border rounded-lg p-3 bg-green-50 border-green-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {refund.event.title}
                        </span>
                        {getStatusBadge(refund.refundStatus)}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <span>{refund.buyer.name}</span>
                        <span>{formatCurrency(refund.totalAmount)}</span>
                        <span>{formatDate(refund.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {processedRefunds.length > 5 && (
                <p className="text-sm text-gray-500 text-center">
                  And {processedRefunds.length - 5} more approved refunds...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Failed Refunds */}
      {failedRefunds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-gray-700">
              Failed Refunds ({failedRefunds.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {failedRefunds.slice(0, 3).map((refund) => (
                <div
                  key={refund.id}
                  className="border rounded-lg p-3 bg-gray-50 border-gray-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {refund.event.title}
                        </span>
                        {getStatusBadge(refund.refundStatus)}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <span>{refund.buyer.name}</span>
                        <span>{formatCurrency(refund.totalAmount)}</span>
                        <span>{formatDate(refund.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Refunds */}
      {refundRequests.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Refund Requests
            </h3>
            <p className="text-gray-500">
              There are currently no refund requests to process.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Refund Action Dialog - Same as before */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve Refund' : 'Reject Refund'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? 'This will process the refund and return the money to the customer.'
                : 'This will reject the refund request. Please provide a reason.'}
            </DialogDescription>
          </DialogHeader>

          {selectedRefund && (
            <div className="space-y-4">
              <div className="border rounded-lg p-3 bg-gray-50">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Event:</span>
                    <span className="font-medium">
                      {selectedRefund.event.title}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Customer:</span>
                    <span className="font-medium">
                      {selectedRefund.buyer.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-medium">
                      {formatCurrency(selectedRefund.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="adminNotes">
                  {actionType === 'approve'
                    ? 'Admin Notes (Optional)'
                    : 'Rejection Reason (Required)'}
                </Label>
                <Textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={
                    actionType === 'approve'
                      ? 'Add any notes about this approval...'
                      : 'Please explain why this refund is being rejected...'
                  }
                  className="mt-1"
                  rows={3}
                />
                {actionType === 'reject' && !adminNotes.trim() && (
                  <p className="text-sm text-red-600 mt-1">
                    Rejection reason is required
                  </p>
                )}
              </div>

              {actionType === 'approve' && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Once approved, this action cannot be undone. The refund will
                    be processed immediately through Paystack.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={processingRefund !== null}
            >
              Cancel
            </Button>
            <Button
              variant={actionType === 'approve' ? 'default' : 'destructive'}
              onClick={() => handleRefundAction(actionType === 'approve')}
              disabled={
                processingRefund !== null ||
                (actionType === 'reject' && !adminNotes.trim())
              }
            >
              {processingRefund ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : actionType === 'approve' ? (
                <CheckCircle className="h-4 w-4 mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              {actionType === 'approve' ? 'Approve Refund' : 'Reject Refund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
