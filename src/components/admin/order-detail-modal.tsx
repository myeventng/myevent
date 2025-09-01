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
  Download,
  Copy,
  ExternalLink,
  FileText,
  Users,
  Hash,
  Tag,
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

  const isAdmin =
    !isOrganizerView &&
    userRole === 'ADMIN' &&
    ['STAFF', 'SUPER_ADMIN'].includes(userSubRole);

  const orderIsCompleted = order.paymentStatus === 'COMPLETED';

  const canProcessRefund =
    !isOrganizerView &&
    userRole === 'ADMIN' &&
    ['STAFF', 'SUPER_ADMIN'].includes(userSubRole);

  const canInitiateRefund =
    isOrganizerView &&
    order.paymentStatus === 'COMPLETED' &&
    !order.refundStatus;

  // Group tickets by type for better display
  const ticketsByType =
    order.tickets?.reduce((acc: any, ticket: any) => {
      const typeId = ticket.ticketType.id;
      if (!acc[typeId]) {
        acc[typeId] = {
          ticketType: ticket.ticketType,
          tickets: [],
          quantity: 0,
          totalValue: 0,
        };
      }
      acc[typeId].tickets.push(ticket);
      acc[typeId].quantity += 1;
      acc[typeId].totalValue += ticket.ticketType.price;
      return acc;
    }, {}) || {};

  const ticketTypeGroups = Object.values(ticketsByType);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Basic Order Info */}
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Receipt className="w-4 h-4" />
                  Order Information
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Date</span>
                    <span className="text-sm">
                      {format(
                        new Date(order.event.startDateTime),
                        'MMM d, yyyy'
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment & Status Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Payment Information
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Payment Status
                  </span>
                  {getPaymentStatusBadge(order.paymentStatus)}
                </div>
                {order.refundStatus && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Refund Status
                    </span>
                    {getRefundStatusBadge(order.refundStatus)}
                  </div>
                )}
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Subtotal
                  </span>
                  <span className="text-sm">
                    {formatCurrency(order.totalAmount)}
                  </span>
                </div>
                {order.platformFee > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Platform Fee
                    </span>
                    <span className="text-sm">
                      {formatCurrency(order.platformFee)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center font-semibold">
                  <span className="text-sm">Total Amount</span>
                  <span className="text-sm">
                    {formatCurrency(order.totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Order Summary
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Total Tickets
                  </span>
                  <span className="text-sm font-medium">{order.quantity}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Ticket Types
                  </span>
                  <span className="text-sm">{ticketTypeGroups.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Generated Tickets
                  </span>
                  <span className="text-sm">{order.tickets?.length || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Ticket Type Breakdown */}
          {ticketTypeGroups.length > 0 && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Ticket Type Breakdown
              </h3>
              <div className="space-y-3">
                {ticketTypeGroups.map((group: any, index: number) => (
                  <div
                    key={group.ticketType.id}
                    className="p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{group.ticketType.name}</h4>
                        {group.ticketType.description && (
                          <p className="text-sm text-muted-foreground">
                            {group.ticketType.description}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline">
                        {group.quantity} ticket{group.quantity > 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Unit Price:
                        </span>
                        <span>{formatCurrency(group.ticketType.price)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span className="font-medium">
                          {formatCurrency(group.totalValue)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                <Separator />
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span>Total for all ticket types:</span>
                  <span>{formatCurrency(order.totalAmount)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Purchase Notes */}
          {order.purchaseNotes && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Purchase Notes</h3>
              <p className="text-sm text-muted-foreground">
                {order.purchaseNotes}
              </p>
            </div>
          )}

          {/* Generated Tickets Information */}
          {order.tickets && order.tickets.length > 0 && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Ticket className="w-4 h-4" />
                Generated Tickets ({order.tickets.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {order.tickets.map((ticket: any, index: number) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded border"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-medium">
                          {ticket.ticketId}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {ticket.ticketType?.name}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Price: {formatCurrency(ticket.ticketType?.price || 0)} •
                        Purchased:{' '}
                        {format(new Date(ticket.purchasedAt), 'MMM d, h:mm a')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          ticket.status === 'USED'
                            ? 'default'
                            : ticket.status === 'UNUSED'
                              ? 'secondary'
                              : 'destructive'
                        }
                        className="text-xs"
                      >
                        {ticket.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(ticket.ticketId)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Tickets Warning */}
          {(!order.tickets || order.tickets.length === 0) &&
            orderIsCompleted && (
              <div className="border rounded-lg p-4 bg-orange-50 border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  <h3 className="font-semibold text-orange-800">
                    No Tickets Generated
                  </h3>
                </div>
                <p className="text-sm text-orange-700">
                  This order is marked as completed but no tickets have been
                  generated. This might indicate an issue with the ticket
                  generation process.
                </p>
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
            <div className="flex gap-2 flex-wrap">
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

              {/* Download tickets (admins & organizers) - only if tickets exist */}
              {orderIsCompleted && order.tickets?.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => window.open(`/api/orders/${order.id}/tickets`)}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download Tickets (PDF)
                </Button>
              )}

              {/* Send tickets (admins only) - only if tickets exist */}
              {orderIsCompleted && isAdmin && order.tickets?.length > 0 && (
                <Button
                  onClick={async () => {
                    try {
                      setIsProcessing(true);
                      const { resendOrderTickets } = await import(
                        '@/actions/order.actions'
                      );
                      const res = await resendOrderTickets(order.id);
                      if (res.success) toast.success('Tickets email sent');
                      else
                        toast.error(
                          res.message || 'Failed to send tickets email'
                        );
                    } finally {
                      setIsProcessing(false);
                    }
                  }}
                  disabled={isProcessing}
                >
                  <Mail className="w-4 h-4 mr-1" />
                  Send Tickets by Email
                </Button>
              )}

              {/* Generate Tickets Button - for completed orders without tickets */}
              {orderIsCompleted &&
                (!order.tickets || order.tickets.length === 0) && (
                  <Button
                    variant="default"
                    onClick={async () => {
                      try {
                        setIsProcessing(true);
                        // Call an action to regenerate tickets for this order
                        const response = await fetch(
                          `/api/orders/${order.id}/regenerate-tickets`,
                          {
                            method: 'POST',
                          }
                        );
                        const result = await response.json();

                        if (result.success) {
                          toast.success('Tickets generated successfully');
                          // Refresh the modal data or close and reopen
                          onClose();
                        } else {
                          toast.error(
                            result.message || 'Failed to generate tickets'
                          );
                        }
                      } catch (error) {
                        toast.error('Failed to generate tickets');
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
                    disabled={isProcessing}
                  >
                    <Ticket className="w-4 h-4 mr-1" />
                    Generate Tickets
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
