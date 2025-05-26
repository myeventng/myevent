'use client';

import { useState } from 'react';
import { Share2, Copy, Facebook, Twitter, Linkedin, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface ShareEventButtonProps {
  event: {
    title: string;
    slug: string;
    description?: string;
  };
}

export function ShareEventButton({ event }: ShareEventButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const eventUrl = `${window.location.origin}/events/${event.slug}`;
  const eventTitle = event.title;
  const eventDescription = event.description || 'Check out this amazing event!';

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(eventUrl);
      toast.success('Event link copied to clipboard!');
      setIsOpen(false);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const shareOnFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      eventUrl
    )}`;
    window.open(url, '_blank', 'width=600,height=400');
    setIsOpen(false);
  };

  const shareOnTwitter = () => {
    const text = `${eventTitle} - ${eventDescription}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      text
    )}&url=${encodeURIComponent(eventUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
    setIsOpen(false);
  };

  const shareOnLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      eventUrl
    )}`;
    window.open(url, '_blank', 'width=600,height=400');
    setIsOpen(false);
  };

  const shareViaEmail = () => {
    const subject = `Check out this event: ${eventTitle}`;
    const body = `I thought you might be interested in this event:\n\n${eventTitle}\n${eventDescription}\n\n${eventUrl}`;
    const url = `mailto:?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
    window.open(url);
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={copyToClipboard}>
          <Copy className="h-4 w-4 mr-2" />
          Copy Link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareOnFacebook}>
          <Facebook className="h-4 w-4 mr-2" />
          Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareOnTwitter}>
          <Twitter className="h-4 w-4 mr-2" />
          Twitter
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareOnLinkedIn}>
          <Linkedin className="h-4 w-4 mr-2" />
          LinkedIn
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareViaEmail}>
          <Mail className="h-4 w-4 mr-2" />
          Email
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
