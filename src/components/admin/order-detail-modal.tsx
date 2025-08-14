// src/components/admin/order-detail-modal.tsx
'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
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
import { toast } from 'sonner';
import {
  User,
  Mail,
  Calendar,
  MapPin,
  CreditCard,
  Receipt,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  DollarSign,
  Ticket,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { PaymentStatus, RefundStatus } from '@/generated/prisma';

interface OrderDetailModalProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
  onRefundAction?: (orderId: string, approve: boolean, notes?: string) => void;
  userRole: string;
  userSubRole: string;
  isOrganizerView?: boolean;
}

export function OrderDetailModal({
  order,
  isOpen,
  onClose,
  onRefundAction,
  userRole,
  userSubRole,
  isOrganizerView = false,
}: OrderDetailModalProps) {
  const [refundNotes, setRefundNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  // Get payment status badge
  const getPaymentStatusBadge = (status: PaymentStatus) => {
    const variants = {
      PENDING: { variant: 'secondary' as const, text: 'Pending', icon: Clock },
      COMPLETED: {
        variant: 'default' as const,
        text: 'Completed',
        icon: CheckCircle,
      },
      FAILED: {
        variant: 'destructive' as const,
        text: 'Failed',
        icon: XCircle,
      },
      REFUNDED: {
        variant: 'outline' as const,
        text: 'Refunded',
        icon: AlertCircle,
      },
    };

    const config = variants[status] || variants.PENDING;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    );
  };

  // Get refund status badge
  const getRefundStatusBadge = (status: RefundStatus | null) => {
    if (!status) return null;

    const variants = {
      INITIATED: {
        variant: 'secondary' as const,
        text: 'Pending',
        icon: Clock,
      },
      PROCESSED: {
        variant: 'default' as const,
        text: 'Processed',
        icon: CheckCircle,
      },
      FAILED: {
        variant: 'destructive' as const,
        text: 'Failed',
        icon: XCircle,
      },
      REJECTED: {
        variant: 'destructive' as const,
        text: 'Rejected',
        icon: XCircle,
      },
    };

    const config = variants[status] || variants.INITIATED;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        Refund {config.text}
      </Badge>
    );
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  // Handle refund action
  const handleRefundAction = async (approve: boolean) => {
    if (!onRefundAction) return;

    setIsProcessing(true);
    try {
      await onRefundAction(order.id, approve, refundNotes);
      onClose();
    } catch (error) {
      console.error('Error processing refund:', error);
    } finally {
      setIsProcessing(false);
      setRefundNotes('');
    }
  };

  if (!order) return null;

  const canProcessRefund =
    !isOrganizerView &&
    userRole === 'ADMIN' &&
    ['STAFF', 'SUPER_ADMIN'].includes(userSubRole);

  const canInitiateRefund =
    isOrganizerView &&
    order.paymentStatus === 'COMPLETED' &&
    !order.refundStatus;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Order Details
          </DialogTitle>
          <DialogDescription>
            Complete information about order #{order.id.slice(-8)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Receipt className="w-4 h-4" />
                  Order Information
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Venue</span>
                    <span className="text-sm">{order.event.venue.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Location
                    </span>
                    <span className="text-sm">
                      {order.event.venue.city?.name}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Purchase Notes */}
          {order.purchaseNotes && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Purchase Notes</h3>
              <p className="text-sm text-muted-foreground">
                {order.purchaseNotes}
              </p>
            </div>
          )}

          {/* Tickets Information */}
          {order.tickets && order.tickets.length > 0 && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Ticket className="w-4 h-4" />
                Generated Tickets ({order.tickets.length})
              </h3>
              <div className="space-y-2">
                {order.tickets.map((ticket: any, index: number) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div>
                      <span className="font-mono text-sm">
                        {ticket.ticketId}
                      </span>
                      <span className="ml-2 text-sm text-muted-foreground">
                        ({ticket.ticketType?.name})
                      </span>
                    </div>
                    <Badge
                      variant={
                        ticket.status === 'USED' ? 'default' : 'secondary'
                      }
                    >
                      {ticket.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Refund Section for Admins */}
          {canProcessRefund && order.refundStatus === 'INITIATED' && (
            <div className="border rounded-lg p-4 bg-orange-50">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-orange-800">
                <AlertCircle className="w-4 h-4" />
                Refund Request Pending
              </h3>
              <p className="text-sm text-orange-700 mb-4">
                This order has a pending refund request that requires admin
                approval.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">
                    Admin Notes (Optional)
                  </label>
                  <Textarea
                    placeholder="Add notes about the refund decision..."
                    value={refundNotes}
                    onChange={(e) => setRefundNotes(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="flex gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="default" disabled={isProcessing}>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve Refund
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Approve Refund</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to approve this refund of{' '}
                          {formatCurrency(order.totalAmount)}? This action
                          cannot be undone. The customer will be notified and
                          the refund will be processed with Paystack.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRefundAction(true)}
                        >
                          Approve Refund
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={isProcessing}>
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject Refund
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reject Refund</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to reject this refund request?
                          The customer will be notified of the rejection.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRefundAction(false)}
                        >
                          Reject Refund
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          )}

          {/* Refund Initiation for Organizers */}
          {canInitiateRefund && (
            <div className="border rounded-lg p-4 bg-blue-50">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-blue-800">
                <AlertCircle className="w-4 h-4" />
                Initiate Refund
              </h3>
              <p className="text-sm text-blue-700 mb-4">
                You can initiate a refund request for this order. The request
                will be sent to administrators for approval.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Refund Reason</label>
                  <Textarea
                    placeholder="Please provide a reason for the refund request..."
                    value={refundNotes}
                    onChange={(e) => setRefundNotes(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={isProcessing || !refundNotes.trim()}
                    >
                      <AlertCircle className="w-4 h-4 mr-1" />
                      Request Refund
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Request Refund</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to request a refund for this order
                        of {formatCurrency(order.totalAmount)}? The request will
                        be sent to administrators for review and approval.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleRefundAction(true)}
                      >
                        Submit Request
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}

          {/* Additional Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  window.open(`mailto:${order.buyer.email}`, '_blank')
                }
              >
                <Mail className="w-4 h-4 mr-1" />
                Email Customer
              </Button>

              {order.paystackId && (
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(order.paystackId)}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy Paystack ID
                </Button>
              )}
            </div>

            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
