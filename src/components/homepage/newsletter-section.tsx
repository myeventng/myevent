// components/homepage/NewsletterSection.tsx
'use client';

import React, { useState } from 'react';
import { Mail, Ticket, Calendar, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// Import the newsletter subscription action
// Note: You'll need to create this action based on your implementation
const subscribeToNewsletter = async (email: string) => {
  // Mock implementation - replace with your actual newsletter subscription logic
  try {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock success response
    if (email.includes('@')) {
      return { success: true, message: 'Successfully subscribed!' };
    } else {
      return { success: false, message: 'Please enter a valid email address.' };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Failed to subscribe. Please try again.',
    };
  }
};

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
      const response = await subscribeToNewsletter(email.trim());

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
    <section className="py-20 bg-gradient-to-br from-purple-600 via-blue-600 to-teal-500">
      <div className="container mx-auto px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 rounded-full mb-6 backdrop-blur-sm">
              <Mail className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">
              Stay in the Loop
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Get the latest event updates, exclusive offers, and insider tips
              delivered straight to your inbox.
            </p>
          </div>

          <form
            onSubmit={handleSubscribe}
            className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto mb-6"
          >
            <Input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubscribing}
              className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/60 backdrop-blur-sm focus:bg-white/20 focus:border-white/40 transition-all duration-300"
            />
            <Button
              type="submit"
              size="lg"
              disabled={isSubscribing}
              className="bg-white text-black hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
            >
              {isSubscribing ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                  <span>Subscribing...</span>
                </div>
              ) : (
                'Subscribe'
              )}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-white/70 text-sm mb-2">
              Join thousands of event enthusiasts who never miss out!
            </p>
            <p className="text-white/60 text-xs">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </div>

          {/* Newsletter Benefits */}
          <div className="grid md:grid-cols-3 gap-6 mt-12 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Ticket className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-2">
                Exclusive Offers
              </h3>
              <p className="text-white/70 text-sm">
                Early bird discounts and special promotions
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-2">Event Updates</h3>
              <p className="text-white/70 text-sm">
                Be the first to know about new events
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Lightbulb className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-2">Insider Tips</h3>
              <p className="text-white/70 text-sm">
                Event planning and networking advice
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
