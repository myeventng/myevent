'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface HardDeleteConfirmationDialogProps {
  trigger: React.ReactNode;
  event: {
    id: string;
    title: string;
    createdAt: string;
    publishedStatus: string;
    user?: {
      name: string;
    } | null;
  };
  isLoading: boolean;
  onConfirm: (eventId: string, eventTitle: string) => Promise<void>;
}

export function HardDeleteConfirmationDialog({
  trigger,
  event,
  isLoading,
  onConfirm,
}: HardDeleteConfirmationDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [adminConfirmation, setAdminConfirmation] = useState('');

  const isConfirmed =
    confirmationText === event.title &&
    adminConfirmation.toLowerCase() === 'permanently delete';

  const handleConfirm = async () => {
    if (isConfirmed) {
      await onConfirm(event.id, event.title);
      setIsOpen(false);
      setConfirmationText('');
      setAdminConfirmation('');
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setConfirmationText('');
      setAdminConfirmation('');
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'PPP p');
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            DANGER: Hard Delete Event
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="font-medium text-red-800 mb-2">
                  ⚠️ This is a PERMANENT and IRREVERSIBLE action!
                </p>
                <p className="text-red-700">
                  You are about to permanently delete &quot;{event.title}&quot;
                  and ALL related data including:
                </p>
                <ul className="list-disc list-inside text-red-700 mt-2 space-y-1">
                  <li>All tickets and ticket types</li>
                  <li>All orders and payment records</li>
                  <li>All ratings and reviews</li>
                  <li>All notifications</li>
                  <li>All waiting list entries</li>
                  <li>All ticket validations</li>
                  <li>All audit logs related to this event</li>
                </ul>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="font-medium text-yellow-800 mb-2">
                  📋 Audit Trail Notice
                </p>
                <p className="text-yellow-700">
                  This action will be logged in the audit trail with your admin
                  details, IP address, timestamp, and all deleted data for
                  security and compliance purposes.
                </p>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="font-medium text-blue-800 mb-2">
                  📊 Event Details
                </p>
                <div className="text-sm text-blue-700 space-y-1">
                  <div>
                    <strong>ID:</strong> {event.id}
                  </div>
                  <div>
                    <strong>Title:</strong> {event.title}
                  </div>
                  <div>
                    <strong>Created:</strong> {formatDateTime(event.createdAt)}
                  </div>
                  <div>
                    <strong>Status:</strong> {event.publishedStatus}
                  </div>
                  <div>
                    <strong>Organizer:</strong> {event.user?.name || 'Unknown'}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="event-title-confirmation"
                    className="text-red-700 font-medium"
                  >
                    Type the exact event title to confirm:
                  </Label>
                  <p className="text-sm text-gray-600 mb-2">
                    Required: &quot;
                    <span className="font-mono">{event.title}</span>&quot;
                  </p>
                  <Input
                    id="event-title-confirmation"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    placeholder="Enter event title exactly as shown above"
                    className={`${
                      confirmationText && confirmationText !== event.title
                        ? 'border-red-300 focus:border-red-500'
                        : confirmationText === event.title
                          ? 'border-green-300 focus:border-green-500'
                          : ''
                    }`}
                  />
                </div>

                <div>
                  <Label
                    htmlFor="admin-confirmation"
                    className="text-red-700 font-medium"
                  >
                    Type &quot;permanently delete&quot; to confirm you
                    understand this action:
                  </Label>
                  <Input
                    id="admin-confirmation"
                    value={adminConfirmation}
                    onChange={(e) => setAdminConfirmation(e.target.value)}
                    placeholder="Type: permanently delete"
                    className={`${
                      adminConfirmation &&
                      adminConfirmation.toLowerCase() !== 'permanently delete'
                        ? 'border-red-300 focus:border-red-500'
                        : adminConfirmation.toLowerCase() ===
                            'permanently delete'
                          ? 'border-green-300 focus:border-green-500'
                          : ''
                    }`}
                  />
                </div>

                {confirmationText && confirmationText !== event.title && (
                  <p className="text-sm text-red-600">
                    ❌ Event title does not match exactly
                  </p>
                )}

                {adminConfirmation &&
                  adminConfirmation.toLowerCase() !== 'permanently delete' && (
                    <p className="text-sm text-red-600">
                      ❌ Please type &quot;permanently delete&quot; exactly
                    </p>
                  )}

                {isConfirmed && (
                  <p className="text-sm text-green-600 font-medium">
                    ✅ Confirmation complete - You may proceed with hard delete
                  </p>
                )}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-3">
          <div className="flex gap-2 w-full">
            <AlertDialogCancel
              className="flex-1"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={!isConfirmed || isLoading}
              className={`flex-1 ${
                isConfirmed
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {isLoading
                ? 'Permanently Deleting...'
                : isConfirmed
                  ? 'PERMANENTLY DELETE'
                  : 'Complete Confirmation Required'}
            </AlertDialogAction>
          </div>
          <div className="text-xs text-gray-500 text-center space-y-1">
            <p>This action cannot be undone and will be fully audited</p>
            <p className="font-medium">
              Only proceed if you are absolutely certain
            </p>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
