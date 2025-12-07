// src/components/organizer/order-detail-modal.tsx
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
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
    User,
    Mail,
    Phone,
    Calendar,
    MapPin,
    CreditCard,
    Receipt,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Download,
    Send,
    DollarSign,
    Ticket as TicketIcon,
    QrCode,
    FileText,
} from 'lucide-react';
import { PaymentStatus, RefundStatus } from '@/generated/prisma';

interface OrderDetailModalProps {
    order: any;
    isOpen: boolean;
    onClose: () => void;
    onRefundAction?: (orderId: string, approve: boolean, notes?: string) => void;
    onRefundRequest?: (orderId: string, reason: string) => void;
    isOrganizer?: boolean;
    userRole?: string;
    userSubRole?: string;
}

// Helper function to extract guest information from order
const getGuestInfo = (order: any) => {
    if (order.buyer) {
        return null; // Not a guest purchase
    }

    try {
        const purchaseData = JSON.parse(order.purchaseNotes || '{}');
        if (purchaseData.isGuestPurchase) {
            return {
                name: purchaseData.guestName || 'Guest User',
                email: purchaseData.guestEmail || 'No email',
                phone: purchaseData.guestPhone || null,
            };
        }
    } catch (error) {
        console.error('Failed to parse guest info:', error);
    }

    return null;
};

// Helper function to get customer info (guest or registered)
const getCustomerInfo = (order: any) => {
    const guestInfo = getGuestInfo(order);

    if (guestInfo) {
        return {
            name: guestInfo.name,
            email: guestInfo.email,
            phone: guestInfo.phone,
            isGuest: true,
        };
    }

    return {
        name: order.buyer?.name || 'Unknown',
        email: order.buyer?.email || 'Unknown',
        phone: order.buyer?.phone || null,
        isGuest: false,
    };
};

export function OrderDetailModal({
    order,
    isOpen,
    onClose,
    onRefundAction,
    onRefundRequest,
    isOrganizer = false,
    userRole,
    userSubRole,
}: OrderDetailModalProps) {
    const [refundNotes, setRefundNotes] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const customerInfo = getCustomerInfo(order);

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
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

    // Handle refund approval
    const handleApproveRefund = async () => {
        if (!onRefundAction) return;

        setIsProcessing(true);
        try {
            await onRefundAction(order.id, true, refundNotes);
            onClose();
        } catch (error) {
            console.error('Error approving refund:', error);
            toast.error('Failed to approve refund');
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle refund rejection
    const handleRejectRefund = async () => {
        if (!onRefundAction) return;

        if (!refundNotes.trim()) {
            toast.error('Please provide a reason for rejection');
            return;
        }

        setIsProcessing(true);
        try {
            await onRefundAction(order.id, false, refundNotes);
            onClose();
        } catch (error) {
            console.error('Error rejecting refund:', error);
            toast.error('Failed to reject refund');
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle refund request
    const handleRequestRefund = async () => {
        if (!onRefundRequest) return;

        if (!refundNotes.trim()) {
            toast.error('Please provide a reason for the refund request');
            return;
        }

        setIsProcessing(true);
        try {
            await onRefundRequest(order.id, refundNotes);
            onClose();
        } catch (error) {
            console.error('Error requesting refund:', error);
            toast.error('Failed to request refund');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Order Details</DialogTitle>
                    <DialogDescription>
                        Complete information about this order
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Order Status */}
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">
                                Order ID
                            </p>
                            <p className="text-lg font-bold font-mono">{order.id}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            {getPaymentStatusBadge(order.paymentStatus)}
                            {getRefundStatusBadge(order.refundStatus)}
                        </div>
                    </div>

                    {/* Customer Information */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center">
                            <User className="w-5 h-5 mr-2" />
                            Customer Information
                        </h3>
                        <div className="grid gap-3 p-4 border rounded-lg">
                            {customerInfo.isGuest && (
                                <div className="flex items-center gap-2 pb-2 border-b">
                                    <Badge variant="secondary">Guest Purchase</Badge>
                                    <p className="text-sm text-muted-foreground">
                                        Customer purchased without creating an account
                                    </p>
                                </div>
                            )}

                            <div className="flex items-start">
                                <User className="w-4 h-4 mr-3 mt-0.5 text-muted-foreground" />
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        Name
                                    </p>
                                    <p className="font-medium">{customerInfo.name}</p>
                                </div>
                            </div>

                            <div className="flex items-start">
                                <Mail className="w-4 h-4 mr-3 mt-0.5 text-muted-foreground" />
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        Email
                                    </p>
                                    <p className="font-medium">{customerInfo.email}</p>
                                </div>
                            </div>

                            {customerInfo.phone && (
                                <div className="flex items-start">
                                    <Phone className="w-4 h-4 mr-3 mt-0.5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">
                                            Phone
                                        </p>
                                        <p className="font-medium">{customerInfo.phone}</p>
                                    </div>
                                </div>
                            )}

                            {!customerInfo.isGuest && order.buyer?.id && (
                                <div className="flex items-start">
                                    <User className="w-4 h-4 mr-3 mt-0.5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">
                                            User ID
                                        </p>
                                        <p className="font-mono text-sm">{order.buyer.id}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Event Information */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center">
                            <Calendar className="w-5 h-5 mr-2" />
                            Event Information
                        </h3>
                        <div className="grid gap-3 p-4 border rounded-lg">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Event Title
                                </p>
                                <p className="font-medium text-lg">{order.event.title}</p>
                            </div>

                            {order.event.startDateTime && (
                                <div className="flex items-start">
                                    <Clock className="w-4 h-4 mr-3 mt-0.5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">
                                            Event Date & Time
                                        </p>
                                        <p className="font-medium">
                                            {format(
                                                new Date(order.event.startDateTime),
                                                'EEEE, MMMM d, yyyy'
                                            )}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {format(new Date(order.event.startDateTime), 'h:mm a')}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {order.event.location && (
                                <div className="flex items-start">
                                    <MapPin className="w-4 h-4 mr-3 mt-0.5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">
                                            Location
                                        </p>
                                        <p className="font-medium">{order.event.location}</p>
                                        {order.event.City?.name && (
                                            <p className="text-sm text-muted-foreground">
                                                {order.event.City.name}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {order.event.venue?.name && (
                                <div className="flex items-start">
                                    <MapPin className="w-4 h-4 mr-3 mt-0.5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">
                                            Venue
                                        </p>
                                        <p className="font-medium">{order.event.venue.name}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Ticket Information */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center">
                            <TicketIcon className="w-5 h-5 mr-2" />
                            Ticket Information
                        </h3>
                        <div className="space-y-3">
                            {order.tickets && order.tickets.length > 0 ? (
                                order.tickets.map((ticket: any, index: number) => (
                                    <div key={ticket.id} className="p-4 border rounded-lg">
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <p className="font-medium">
                                                    {ticket.ticketType?.name || 'General Admission'}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    Ticket #{index + 1}
                                                </p>
                                            </div>
                                            <Badge variant="outline">{ticket.status}</Badge>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <p className="text-muted-foreground">Ticket ID</p>
                                                <p className="font-mono">{ticket.id.slice(-8)}</p>
                                            </div>
                                            {ticket.qrCodeData && (
                                                <div>
                                                    <p className="text-muted-foreground">QR Code</p>
                                                    <p className="flex items-center gap-1">
                                                        <QrCode className="w-3 h-3" />
                                                        Available
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-4 border rounded-lg">
                                    <p className="font-medium">{order.quantity} Tickets</p>
                                    <p className="text-sm text-muted-foreground">
                                        Tickets will be generated upon payment completion
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Payment Information */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center">
                            <CreditCard className="w-5 h-5 mr-2" />
                            Payment Information
                        </h3>
                        <div className="grid gap-3 p-4 border rounded-lg">
                            <div className="flex justify-between items-center">
                                <p className="text-sm font-medium text-muted-foreground">
                                    Subtotal
                                </p>
                                <p className="font-medium">{formatCurrency(order.totalAmount)}</p>
                            </div>

                            {order.platformFee > 0 && (
                                <>
                                    <Separator />
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm font-medium text-muted-foreground">
                                            Platform Fee
                                        </p>
                                        <p className="font-medium text-orange-600">
                                            {formatCurrency(order.platformFee)}
                                        </p>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm font-medium text-muted-foreground">
                                            Net to Organizer
                                        </p>
                                        <p className="font-medium text-green-600">
                                            {formatCurrency(order.totalAmount - order.platformFee)}
                                        </p>
                                    </div>
                                </>
                            )}

                            <Separator />

                            <div className="flex justify-between items-center">
                                <p className="font-semibold">Total</p>
                                <p className="text-xl font-bold">
                                    {formatCurrency(order.totalAmount)}
                                </p>
                            </div>

                            <Separator />

                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Payment Method</p>
                                    <p className="font-medium">
                                        {order.paymentMethod || 'Online Payment'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Currency</p>
                                    <p className="font-medium">{order.currency || 'NGN'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Paystack ID</p>
                                    <p className="font-mono text-xs">{order.paystackId}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Order Date</p>
                                    <p className="font-medium">
                                        {format(new Date(order.createdAt), 'MMM d, yyyy')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Refund Section - Only for Admin */}
                    {!isOrganizer &&
                        order.refundStatus === 'INITIATED' &&
                        onRefundAction && (
                            <div>
                                <h3 className="text-lg font-semibold mb-3 flex items-center text-orange-600">
                                    <AlertCircle className="w-5 h-5 mr-2" />
                                    Refund Request
                                </h3>
                                <div className="p-4 border border-orange-200 bg-orange-50 rounded-lg space-y-4">
                                    <div>
                                        <p className="font-medium mb-1">Refund Reason:</p>
                                        <p className="text-sm text-muted-foreground">
                                            {order.refundReason || 'No reason provided'}
                                        </p>
                                    </div>

                                    <div>
                                        <Label htmlFor="refund-notes">
                                            Admin Notes (Optional)
                                        </Label>
                                        <Textarea
                                            id="refund-notes"
                                            placeholder="Add notes about this refund decision..."
                                            value={refundNotes}
                                            onChange={(e) => setRefundNotes(e.target.value)}
                                            rows={3}
                                            className="mt-1"
                                        />
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            onClick={handleApproveRefund}
                                            disabled={isProcessing}
                                            className="flex-1"
                                            variant="default"
                                        >
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            Approve Refund
                                        </Button>
                                        <Button
                                            onClick={handleRejectRefund}
                                            disabled={isProcessing}
                                            className="flex-1"
                                            variant="destructive"
                                        >
                                            <XCircle className="w-4 h-4 mr-2" />
                                            Reject Refund
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                    {/* Refund Request - Only for Organizer */}
                    {isOrganizer &&
                        order.paymentStatus === 'COMPLETED' &&
                        !order.refundStatus &&
                        onRefundRequest && (
                            <div>
                                <h3 className="text-lg font-semibold mb-3 flex items-center text-orange-600">
                                    <AlertCircle className="w-5 h-5 mr-2" />
                                    Request Refund
                                </h3>
                                <div className="p-4 border border-orange-200 bg-orange-50 rounded-lg space-y-4">
                                    <p className="text-sm text-muted-foreground">
                                        Request a refund for this order. The request will be
                                        reviewed by an administrator.
                                    </p>

                                    <div>
                                        <Label htmlFor="refund-reason">Refund Reason *</Label>
                                        <Textarea
                                            id="refund-reason"
                                            placeholder="Explain why you need to refund this order..."
                                            value={refundNotes}
                                            onChange={(e) => setRefundNotes(e.target.value)}
                                            rows={3}
                                            className="mt-1"
                                            required
                                        />
                                    </div>

                                    <Button
                                        onClick={handleRequestRefund}
                                        disabled={isProcessing || !refundNotes.trim()}
                                        className="w-full"
                                        variant="default"
                                    >
                                        <Send className="w-4 h-4 mr-2" />
                                        Submit Refund Request
                                    </Button>
                                </div>
                            </div>
                        )}

                    {/* Actions */}
                    <div className="flex gap-2">
                        {order.paymentStatus === 'COMPLETED' && (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() =>
                                        window.open(`/api/orders/${order.id}/tickets`, '_blank')
                                    }
                                    className="flex-1"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Download Tickets
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() =>
                                        window.open(`mailto:${customerInfo.email}`, '_blank')
                                    }
                                    className="flex-1"
                                >
                                    <Mail className="w-4 h-4 mr-2" />
                                    Email Customer
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}