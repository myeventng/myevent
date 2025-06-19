'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  toggleUserSuspension,
  addUserNote,
  sendUserNotification,
} from '@/actions/user.actions';
import { banUserAction } from '@/actions/ban-user-actions';
import { toast } from 'sonner';

interface UserData {
  id: string;
  name: string;
  banned?: boolean;
}

interface UserActionDialogsProps {
  user: UserData;
  onRefresh: () => void;
}

export default function UserActionDialogs({
  user,
  onRefresh,
}: UserActionDialogsProps) {
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [isNotificationDialogOpen, setIsNotificationDialogOpen] =
    useState(false);
  const [statusAction, setStatusAction] = useState<
    'suspend' | 'activate' | 'ban'
  >('suspend');
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const confirmStatusChange = async () => {
    try {
      setActionLoading(true);
      let response;

      if (statusAction === 'ban') {
        response = await banUserAction({
          userId: user.id,
          banReason: reason,
          isBan: true,
        });
      } else if (statusAction === 'suspend') {
        response = await toggleUserSuspension({
          userId: user.id,
          suspend: true,
          reason,
        });
      } else if (statusAction === 'activate') {
        response = await banUserAction({
          userId: user.id,
          banReason: '',
          isBan: false,
        });
      }

      if (response?.success) {
        toast.success(response.message);
        onRefresh();
        setIsStatusDialogOpen(false);
      } else {
        toast.error(response?.error || 'Failed to update user status');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('An error occurred while updating user status');
    } finally {
      setActionLoading(false);
      setReason('');
    }
  };

  const handleAddNote = async () => {
    if (!note.trim()) {
      toast.error('Please enter a note');
      return;
    }

    try {
      setActionLoading(true);
      const response = await addUserNote({
        userId: user.id,
        note: note.trim(),
      });

      if (response.success) {
        toast.success('Note added successfully');
        setNote('');
        setIsNoteDialogOpen(false);
      } else {
        toast.error(response.error || 'Failed to add note');
      }
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('An error occurred while adding note');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendNotification = async () => {
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      toast.error('Please enter both title and message');
      return;
    }

    try {
      setActionLoading(true);
      const response = await sendUserNotification({
        userId: user.id,
        title: notificationTitle.trim(),
        message: notificationMessage.trim(),
      });

      if (response.success) {
        toast.success('Notification sent successfully');
        setNotificationTitle('');
        setNotificationMessage('');
        setIsNotificationDialogOpen(false);
      } else {
        toast.error(response.error || 'Failed to send notification');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('An error occurred while sending notification');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      {/* Status Change Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {statusAction === 'activate'
                ? 'Activate User'
                : statusAction === 'suspend'
                ? 'Suspend User'
                : 'Ban User'}
            </DialogTitle>
            <DialogDescription>
              {statusAction === 'activate'
                ? 'This will activate the user account.'
                : statusAction === 'suspend'
                ? 'This will temporarily suspend the user account.'
                : 'This will permanently ban the user account.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {statusAction !== 'activate' && (
              <div>
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  placeholder="Enter reason for this action..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsStatusDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmStatusChange}
                variant={statusAction === 'ban' ? 'destructive' : 'default'}
                disabled={
                  actionLoading ||
                  (statusAction !== 'activate' && !reason.trim())
                }
              >
                {actionLoading && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Confirm{' '}
                {statusAction === 'activate'
                  ? 'Activation'
                  : statusAction === 'suspend'
                  ? 'Suspension'
                  : 'Ban'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>
              Add an administrative note about this user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="admin-note">Note</Label>
              <Textarea
                id="admin-note"
                placeholder="Enter your note..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsNoteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddNote}
                disabled={actionLoading || !note.trim()}
              >
                {actionLoading && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Save Note
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Notification Dialog */}
      <Dialog
        open={isNotificationDialogOpen}
        onOpenChange={setIsNotificationDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Notification</DialogTitle>
            <DialogDescription>
              Send a notification to this user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="notification-title">Title</Label>
              <input
                type="text"
                id="notification-title"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter notification title..."
                value={notificationTitle}
                onChange={(e) => setNotificationTitle(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="notification-message">Message</Label>
              <Textarea
                id="notification-message"
                placeholder="Enter notification message..."
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsNotificationDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendNotification}
                disabled={
                  actionLoading ||
                  !notificationTitle.trim() ||
                  !notificationMessage.trim()
                }
              >
                {actionLoading && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Send Notification
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
