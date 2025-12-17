'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Eye,
  Calendar,
  MapPin,
  User,
  CreditCard,
  Ticket,
  Clock,
  QrCode,
  Download,
  Mail,
  FileText,
  UserX,
  UserCheck,
  Phone,
} from 'lucide-react';
import { TicketStatus } from '@/generated/prisma';
import { toast } from 'sonner';
import { generateTicketPDF } from '@/utils/pdf-ticket-generator';
import { resendTicketEmail } from '@/actions/email-ticket-actions';

interface TicketPreviewModalProps {
  ticket: any;
  trigger?: React.ReactNode;
}

interface GuestInfo {
  name: string;
  email: string;
  phone?: string;
}

export function TicketPreviewModal({
  ticket,
  trigger,
}: TicketPreviewModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Extract guest info from ticket
  const extractGuestInfo = (ticket: any): GuestInfo | null => {
    if (ticket.guestInfo) return ticket.guestInfo;

    if (!ticket.userId && ticket.order?.purchaseNotes) {
      try {
        const notes = JSON.parse(ticket.order.purchaseNotes);
        if (notes.isGuestPurchase) {
          return {
            name: notes.guestName,
            email: notes.guestEmail,
            phone: notes.guestPhone,
          };
        }
      } catch (error) {
        console.error('Failed to parse guest info:', error);
      }
    }
    return null;
  };

  const guestInfo = extractGuestInfo(ticket);
  const isGuest = !ticket.userId || !!guestInfo;

  // Format date and time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'PPP p');
  };

  // Format currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(price);
  };

  // Get status badge
  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'USED':
        return (
          <Badge
            variant="outline"
            className="bg-green-100 text-green-800 border-green-300"
          >
            <Clock className="h-3 w-3 mr-1" />
            Used
          </Badge>
        );
      case 'UNUSED':
        return (
          <Badge
            variant="outline"
            className="bg-blue-100 text-blue-800 border-blue-300"
          >
            <Ticket className="h-3 w-3 mr-1" />
            Unused
          </Badge>
        );
      case 'REFUNDED':
        return (
          <Badge
            variant="outline"
            className="bg-amber-100 text-amber-800 border-amber-300"
          >
            <CreditCard className="h-3 w-3 mr-1" />
            Refunded
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge
            variant="outline"
            className="bg-red-100 text-red-800 border-red-300"
          >
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // Download ticket as PDF
  const handleDownloadTicket = () => {
    try {
      generateTicketPDF(ticket);
      toast.success('Ticket PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading ticket PDF:', error);
      toast.error('Failed to download ticket PDF');
    }
  };

  // Download ticket as JSON
  const handleDownloadTicketJSON = () => {
    try {
      const ticketJSON = {
        ticketInfo: {
          ticketId: ticket.ticketId,
          status: ticket.status,
          purchasedAt: ticket.purchasedAt,
          usedAt: ticket.usedAt,
        },
        event: {
          title: ticket.ticketType.event.title,
          startDateTime: ticket.ticketType.event.startDateTime,
          venue: {
            name: ticket.ticketType.event.venue.name,
            city: ticket.ticketType.event.venue.city?.name,
          },
        },
        ticketType: {
          name: ticket.ticketType.name,
          price: ticket.ticketType.price,
        },
        customer: isGuest && guestInfo ? {
          type: 'guest',
          name: guestInfo.name,
          email: guestInfo.email,
          phone: guestInfo.phone,
        } : {
          type: 'authenticated',
          name: ticket.user?.name,
          email: ticket.user?.email,
        },
        order: ticket.order
          ? {
            id: ticket.order.id,
            paymentStatus: ticket.order.paymentStatus,
            totalAmount: ticket.order.totalAmount,
            quantity: ticket.order.quantity,
          }
          : null,
        downloadedAt: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(ticketJSON, null, 2)], {
        type: 'application/json;charset=utf-8;',
      });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `ticket_${ticket.ticketId}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Ticket data downloaded as JSON');
    } catch (error) {
      console.error('Error downloading ticket JSON:', error);
      toast.error('Failed to download ticket data');
    }
  };

  const handleEmailTicket = async () => {
    const email = ticket.user?.email || guestInfo?.email;
    if (!email) {
      toast.error('No email address found for this customer');
      return;
    }

    try {
      const result = await resendTicketEmail(ticket.id);

      if (result.success) {
        toast.success(result.message || 'Ticket email sent successfully');
      } else {
        toast.error(result.message || 'Failed to send ticket email');
      }
    } catch (error) {
      console.error('Error sending ticket email:', error);
      toast.error('Failed to send ticket email');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Ticket Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Ticket Header */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold">
                {ticket.ticketType.event.title}
              </h3>
              <p className="text-sm text-muted-foreground font-mono">
                Ticket ID: {ticket.ticketId}
              </p>
            </div>
            <div className="flex flex-col gap-2 items-end">
              {getStatusBadge(ticket.status)}
              {isGuest && (
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
                  <UserX className="h-3 w-3 mr-1" />
                  Guest Purchase
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Event Details */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Event Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Event Date
                </p>
                <p className="text-sm">
                  {formatDateTime(ticket.ticketType.event.startDateTime)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Venue
                </p>
                <p className="text-sm">
                  {ticket.ticketType.event.venue.name}
                  {ticket.ticketType.event.venue.city?.name &&
                    `, ${ticket.ticketType.event.venue.city.name}`}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Ticket Type Details */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              Ticket Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Ticket Type
                </p>
                <p className="text-sm font-medium">{ticket.ticketType.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Price
                </p>
                <p className="text-sm font-medium">
                  {formatPrice(ticket.ticketType.price)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Purchase Date
                </p>
                <p className="text-sm">{formatDateTime(ticket.purchasedAt)}</p>
              </div>
              {ticket.usedAt && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Used Date
                  </p>
                  <p className="text-sm">{formatDateTime(ticket.usedAt)}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Customer Details */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Customer Information
            </h4>
            <div className="pl-6">
              {ticket.user ? (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <UserCheck className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-900">Authenticated User</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Name</p>
                      <p className="text-sm">{ticket.user.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <p className="text-sm">{ticket.user.email}</p>
                    </div>
                  </div>
                </div>
              ) : guestInfo ? (
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2 mb-2">
                    <UserX className="h-4 w-4 text-orange-600" />
                    <span className="font-medium text-orange-900">Guest User</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Name</p>
                      <p className="text-sm">{guestInfo.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <p className="text-sm">{guestInfo.email}</p>
                    </div>
                    {guestInfo.phone && (
                      <div className="col-span-2">
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          Phone
                        </p>
                        <p className="text-sm">{guestInfo.phone}</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-orange-300">
                    <p className="text-xs text-orange-700">
                      This ticket was purchased without creating an account. Guest information is stored from the purchase details.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2">
                    <UserX className="h-4 w-4 text-gray-600" />
                    <span className="font-medium text-gray-900">Guest User (No Information Available)</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Order Information */}
          {ticket.order && (
            <>
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Order Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Order ID
                    </p>
                    <p className="text-sm font-mono">{ticket.order.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Payment Status
                    </p>
                    <Badge
                      variant={
                        ticket.order.paymentStatus === 'COMPLETED'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {ticket.order.paymentStatus}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Amount
                    </p>
                    <p className="text-sm font-medium">
                      {formatPrice(ticket.order.totalAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Quantity
                    </p>
                    <p className="text-sm">{ticket.order.quantity} ticket(s)</p>
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* QR Code Section */}
          {ticket.qrCodeData && (
            <>
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  QR Code
                </h4>
                <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <QrCode className="h-16 w-16 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      QR Code Available
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Can be used for event entry validation
                    </p>
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Transfer Information */}
          {ticket.transferredTo && (
            <>
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Transfer Information
                </h4>
                <div className="pl-6">
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                    <p className="text-sm">
                      <strong>Transferred to:</strong> {ticket.transferredTo}
                    </p>
                    {ticket.transferredAt && (
                      <p className="text-sm text-muted-foreground">
                        <strong>Transfer Date:</strong>{' '}
                        {formatDateTime(ticket.transferredAt)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Validation History */}
          {ticket.validations && ticket.validations.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Validation History
              </h4>
              <div className="pl-6 space-y-2">
                {ticket.validations.map((validation: any, index: number) => (
                  <div
                    key={index}
                    className="bg-green-50 p-3 rounded-lg border border-green-200"
                  >
                    <p className="text-sm">
                      <strong>Validated by:</strong>{' '}
                      {validation.validator?.name || 'Unknown'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Date:</strong>{' '}
                      {formatDateTime(validation.validatedAt)}
                    </p>
                    {validation.location && (
                      <p className="text-sm text-muted-foreground">
                        <strong>Location:</strong> {validation.location}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            <Button variant="outline" size="sm" onClick={handleDownloadTicket}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTicketJSON}
            >
              <FileText className="h-4 w-4 mr-2" />
              Download JSON
            </Button>
            {(ticket.user?.email || guestInfo?.email) && (
              <Button variant="outline" size="sm" onClick={handleEmailTicket}>
                <Mail className="h-4 w-4 mr-2" />
                {isGuest ? 'Send to Guest Email' : 'Resend Email'}
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <a href={`/admin/events/${ticket.ticketType.event.id}`}>
                <Eye className="h-4 w-4 mr-2" />
                View Event
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}