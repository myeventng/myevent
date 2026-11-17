// components/homepage/NewsletterSection.tsx
'use client';

import React, { useState } from 'react';
import { Mail, Ticket, Calendar, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { subscribeToNewsletter } from '@/actions/newsletter-actions';
import { CrowdBackdrop } from '@/components/brand/crowd-backdrop';

export const NewsletterSection: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      setIsSubscribing(true);
      const response = await subscribeToNewsletter(email.trim(), 'home');

      if (response.success) {
        toast.success(
          response.message || 'Successfully subscribed to newsletter!'
        );
        setEmail('');
      } else {
        toast.error(
          response.message || 'Failed to subscribe. Please try again.'
        );
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      toast.error('Failed to subscribe. Please try again.');
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <section className="relative overflow-hidden bg-[var(--me-bg-deep)] py-16 sm:py-24">
      <CrowdBackdrop />
      <div className="relative mx-auto max-w-3xl px-4 text-center">
        <div className="rounded-3xl border-2 border-[var(--me-line)] bg-[var(--me-surface)] p-6 shadow-[8px_8px_0_0_var(--me-violet)] sm:p-10">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--me-red)]">
            <Mail className="h-7 w-7 text-white" aria-hidden="true" />
          </div>
          <h2 className="font-display text-3xl font-extrabold sm:text-4xl">
            Never miss a good night
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-lg text-[var(--me-muted)]">
            New events, early ticket offers and planning tips, sent to your
            inbox.
          </p>

          <form
            onSubmit={handleSubscribe}
            className="mx-auto mt-7 flex max-w-md flex-col gap-3 sm:flex-row"
          >
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <Input
              id="newsletter-email"
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubscribing}
              className="h-12 flex-1 rounded-full border-2 border-[var(--me-line)] bg-[var(--me-bg)] px-5 text-white placeholder:text-[var(--me-muted)]"
            />
            <Button
              type="submit"
              disabled={isSubscribing}
              className="h-12 min-w-[130px] rounded-full bg-[var(--me-red)] px-6 font-bold text-white shadow-[3px_3px_0_0_var(--me-violet)] hover:bg-[var(--me-red)]"
            >
              {isSubscribing ? 'Subscribing...' : 'Subscribe'}
            </Button>
          </form>

          <p className="mt-4 text-sm text-[var(--me-muted)]">
            We respect your privacy. Unsubscribe at any time.
          </p>

          <ul className="mt-8 grid gap-4 text-left sm:grid-cols-3">
            {[
              { icon: Ticket, color: 'var(--me-red)', title: 'Ticket offers', text: 'Early bird prices and promotions' },
              { icon: Calendar, color: 'var(--me-violet)', title: 'New events', text: 'Hear about events first' },
              { icon: Lightbulb, color: 'var(--me-magenta)', title: 'Planning tips', text: 'Advice for hosts and guests' },
            ].map(({ icon: Icon, color, title, text }) => (
              <li key={title} className="flex items-start gap-3 sm:flex-col sm:items-center sm:text-center">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: color }}>
                  <Icon className="h-5 w-5 text-white" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-bold">{title}</span>
                  <span className="block text-sm text-[var(--me-muted)]">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};
