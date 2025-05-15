import { AuthUser } from '@/lib/auth-utils';
import { SignOutButton } from '@/components/sign-out-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, Menu, Settings, User } from 'lucide-react';
import Link from 'next/link';

interface HeaderProps {
  user: AuthUser;
  onMobileToggle?: () => void;
}

export function Header({ user, onMobileToggle }: HeaderProps) {
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
  const profilePath =
    user.role === 'ADMIN' ? '/admin/dashboard/profile' : '/dashboard/profile';

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200">
      <button className="p-1 md:hidden" onClick={onMobileToggle}>
        <Menu className="w-6 h-6" />
      </button>

      <div className="flex items-center ml-auto space-x-4">
        <Button variant="ghost" size="icon" className="hidden md:flex">
          <Bell className="w-5 h-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.image || ''} alt={user.name} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
                <p className="text-xs leading-none text-muted-foreground mt-1">
                  {user.role} / {user.subRole}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={profilePath} className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href={
                  user.role === 'ADMIN'
                    ? '/admin/dashboard/settings'
                    : '/dashboard/settings'
                }
                className="cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <SignOutButton className="w-full flex items-center justify-between" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
