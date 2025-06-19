'use client';

import { useState } from 'react';
import {
  MoreVertical,
  AlertTriangle,
  CheckCircle,
  Ban,
  MessageSquare,
  Bell,
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  subRole: string;
  banned?: boolean;
  banReason?: string;
  banExpires?: string;
  emailVerified?: boolean;
  image?: string;
}

interface UserHeaderProps {
  user: UserData;
  onRefresh: () => void;
}

export default function UserHeader({ user, onRefresh }: UserHeaderProps) {
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [isNotificationDialogOpen, setIsNotificationDialogOpen] =
    useState(false);

  const getStatusBadge = (user: UserData) => {
    if (user.banned) {
      // Check if it's a temporary suspension (ban with expiry)
      if (user.banExpires) {
        const expiry = new Date(user.banExpires);
        if (expiry > new Date()) {
          return (
            <Badge className="bg-yellow-100 text-yellow-800">Suspended</Badge>
          );
        } else {
          return <Badge className="bg-green-100 text-green-800">Active</Badge>;
        }
      }
      return <Badge className="bg-red-100 text-red-800">Banned</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800">Active</Badge>;
  };

  const getRoleBadge = (role: string, subRole: string) => {
    if (role === 'ADMIN') {
      if (subRole === 'SUPER_ADMIN') {
        return (
          <Badge className="bg-purple-100 text-purple-800">Super Admin</Badge>
        );
      }
      return <Badge className="bg-purple-100 text-purple-800">Admin</Badge>;
    }
    if (subRole === 'ORGANIZER') {
      return <Badge className="bg-blue-100 text-blue-800">Organizer</Badge>;
    }
    return <Badge variant="outline">User</Badge>;
  };

  const handleStatusChange = (action: 'suspend' | 'activate' | 'ban') => {
    // These will be handled by the parent component through props
    console.log(`Status change: ${action}`);
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={user.image || undefined} alt={user.name} />
          <AvatarFallback className="text-xl">
            {user.name
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold">{user.name}</h1>
          <div className="flex items-center space-x-2 mt-1">
            {getRoleBadge(user.role, user.subRole)}
            {getStatusBadge(user)}
            {user.emailVerified && (
              <Badge variant="outline" className="text-green-600">
                <CheckCircle className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!user.banned && (
            <>
              <DropdownMenuItem onClick={() => handleStatusChange('suspend')}>
                <AlertTriangle className="w-4 h-4 mr-2" />
                Suspend User
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('ban')}>
                <Ban className="w-4 h-4 mr-2" />
                Ban User
              </DropdownMenuItem>
            </>
          )}
          {user.banned && (
            <DropdownMenuItem onClick={() => handleStatusChange('activate')}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Activate User
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsNoteDialogOpen(true)}>
            <MessageSquare className="w-4 h-4 mr-2" />
            Add Note
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsNotificationDialogOpen(true)}>
            <Bell className="w-4 h-4 mr-2" />
            Send Notification
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
