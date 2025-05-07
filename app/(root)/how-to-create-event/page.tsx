'use client';
import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const CreateEventPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>How to Create an Event | myevent.com.ng</title>
        <meta
          name="description"
          content="Learn how to create and manage events on myevent.com.ng"
        />
      </Head>

      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="relative  py-16 bg-gradient-to-r from-purple-50 to-indigo-50">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=1920&q=80')",
            }}
          />
          <div className="absolute inset-0 bg-black bg-opacity-50 group-hover:bg-opacity-70 transition-all duration-300"></div>
          <div className="relative container mx-auto px-4 py-10">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
                How to Create an Event on myevent.com.ng
              </h1>
              <p className="text-xl mb-8 text-white">
                Follow these simple steps to create and manage your next
                successful event!
              </p>
              <Button className="text-white px-8 py-6 text-lg">
                Create an Event Now
              </Button>
            </div>
          </div>
        </section>

        {/* Steps Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-12">
                Creating an event is easy with myevent.com.ng
              </h2>

              {/* Step 1 */}
              <div className="mb-16 flex flex-col md:flex-row items-center gap-8">
                <div className="md:w-1/2">
                  <div className="bg-gray-200 rounded-lg h-64 flex items-center justify-center">
                    <div className="text-4xl font-bold text-purple-700">
                      Step 1 Image
                    </div>
                  </div>
                </div>
                <div className="md:w-1/2">
                  <div className="flex items-center mb-4">
                    <span className="bg-purple-700 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">
                      1
                    </span>
                    <h3 className="text-2xl font-bold">Sign up or log in</h3>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Create an account on myevent.com.ng or log in to your
                    existing account to get started with creating your event.
                  </p>
                  <Button
                    variant="outline"
                    className="border-purple-700 text-purple-700 hover:bg-purple-50"
                  >
                    Create Account
                  </Button>
                </div>
              </div>

              {/* Step 2 */}
              <div className="mb-16 flex flex-col md:flex-row-reverse items-center gap-8">
                <div className="md:w-1/2">
                  <div className="bg-gray-200 rounded-lg h-64 flex items-center justify-center">
                    <div className="text-4xl font-bold text-purple-700">
                      Step 2 Image
                    </div>
                  </div>
                </div>
                <div className="md:w-1/2">
                  <div className="flex items-center mb-4">
                    <span className="bg-purple-700 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">
                      2
                    </span>
                    <h3 className="text-2xl font-bold">
                      Navigate to "Create Event"
                    </h3>
                  </div>
                  <p className="text-gray-600 mb-4">
                    After logging in, click on the "Create Event" button in your
                    dashboard to start setting up your new event.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="mb-16 flex flex-col md:flex-row items-center gap-8">
                <div className="md:w-1/2">
                  <div className="bg-gray-200 rounded-lg h-64 flex items-center justify-center">
                    <div className="text-4xl font-bold text-purple-700">
                      Step 3 Image
                    </div>
                  </div>
                </div>
                <div className="md:w-1/2">
                  <div className="flex items-center mb-4">
                    <span className="bg-purple-700 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">
                      3
                    </span>
                    <h3 className="text-2xl font-bold">
                      Fill in event details
                    </h3>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Enter all necessary information such as event name, date,
                    time, location, description, and upload event images.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="mb-16 flex flex-col md:flex-row-reverse items-center gap-8">
                <div className="md:w-1/2">
                  <div className="bg-gray-200 rounded-lg h-64 flex items-center justify-center">
                    <div className="text-4xl font-bold text-purple-700">
                      Step 4 Image
                    </div>
                  </div>
                </div>
                <div className="md:w-1/2">
                  <div className="flex items-center mb-4">
                    <span className="bg-purple-700 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">
                      4
                    </span>
                    <h3 className="text-2xl font-bold">Set up ticketing</h3>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Create ticket types with different pricing options, set
                    available quantities, and customize registration forms.
                  </p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="mb-16 flex flex-col md:flex-row items-center gap-8">
                <div className="md:w-1/2">
                  <div className="bg-gray-200 rounded-lg h-64 flex items-center justify-center">
                    <div className="text-4xl font-bold text-purple-700">
                      Step 5 Image
                    </div>
                  </div>
                </div>
                <div className="md:w-1/2">
                  <div className="flex items-center mb-4">
                    <span className="bg-purple-700 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">
                      5
                    </span>
                    <h3 className="text-2xl font-bold">Publish and share</h3>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Review all details, publish your event, and share it across
                    social media platforms to maximize attendance.
                  </p>
                  <Button
                    variant="outline"
                    className="border-purple-700 text-purple-700 hover:bg-purple-50"
                  >
                    Create Your Event
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">
              Benefits of hosting with myevent.com.ng
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <Card className="bg-white border-0 shadow-sm">
                <CardContent className="pt-6">
                  <div className="mb-4 text-purple-700">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-12 w-12"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Easy to Use</h3>
                  <p className="text-gray-600">
                    Our intuitive platform makes event creation and management
                    simple and straightforward.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white border-0 shadow-sm">
                <CardContent className="pt-6">
                  <div className="mb-4 text-purple-700">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-12 w-12"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Secure Payments</h3>
                  <p className="text-gray-600">
                    Process ticket sales securely with our integrated payment
                    system that supports multiple options.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white border-0 shadow-sm">
                <CardContent className="pt-6">
                  <div className="mb-4 text-purple-700">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-12 w-12"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Detailed Analytics</h3>
                  <p className="text-gray-600">
                    Track registrations, ticket sales, and attendee engagement
                    with comprehensive analytics tools.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">
              What our customers say
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <Card className="bg-white border border-gray-100 shadow-sm">
                <CardContent className="p-6">
                  <p className="text-gray-600 mb-4">
                    "myevent.com.ng made organizing our corporate conference so
                    simple. The platform is intuitive and the customer support
                    team was always helpful."
                  </p>
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gray-300 rounded-full mr-3"></div>
                    <div>
                      <p className="font-bold">Sarah Johnson</p>
                      <p className="text-sm text-gray-500">
                        Event Manager, TechCorp
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-100 shadow-sm">
                <CardContent className="p-6">
                  <p className="text-gray-600 mb-4">
                    "I've used several event platforms before, but
                    myevent.com.ng offers the best value with its comprehensive
                    features and affordable pricing."
                  </p>
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gray-300 rounded-full mr-3"></div>
                    <div>
                      <p className="font-bold">Michael Adebayo</p>
                      <p className="text-sm text-gray-500">
                        Founder, LagosEvents
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-purple-700 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">
              Ready to create your event?
            </h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Join thousands of event organizers who trust myevent.com.ng for
              their ticketing and registration needs.
            </p>
            <Button className="bg-white text-primary hover:bg-gray-100 px-8 py-6 text-lg">
              Get Started For Free
            </Button>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">
              Frequently Asked Questions
            </h2>
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-xl font-bold mb-2">
                  Is it free to create an event?
                </h3>
                <p className="text-gray-600">
                  Yes, creating and publishing an event on myevent.com.ng is
                  completely free. We only charge a small fee when you sell
                  tickets.
                </p>
              </div>

              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-xl font-bold mb-2">
                  How do I receive payments for ticket sales?
                </h3>
                <p className="text-gray-600">
                  We support multiple payment options, and all funds are
                  transferred to your designated bank account within 2-3
                  business days after your event.
                </p>
              </div>

              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-xl font-bold mb-2">
                  Can I customize the registration process?
                </h3>
                <p className="text-gray-600">
                  Absolutely! You can create custom registration forms, add
                  specific questions, and collect the exact information you need
                  from attendees.
                </p>
              </div>

              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-xl font-bold mb-2">
                  How do I promote my event?
                </h3>
                <p className="text-gray-600">
                  myevent.com.ng provides sharing tools for social media, email
                  marketing features, and your event will also be listed in our
                  event marketplace for additional visibility.
                </p>
              </div>

              <div className="pb-4">
                <h3 className="text-xl font-bold mb-2">
                  What kind of events can I create?
                </h3>
                <p className="text-gray-600">
                  You can create virtually any type of event - conferences,
                  workshops, concerts, fundraisers, classes, webinars, and more!
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Resources Section */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">
              Resources to help you succeed
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <Card className="bg-white border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="mb-4 text-purple-700">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-10 w-10"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-2">
                    Event Planning Guide
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Download our comprehensive guide with tips and best
                    practices for planning successful events.
                  </p>
                  <Link
                    href="/guides/event-planning"
                    className="text-purple-700 font-medium hover:text-purple-800"
                  >
                    Learn more →
                  </Link>
                </CardContent>
              </Card>

              <Card className="bg-white border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="mb-4 text-purple-700">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-10 w-10"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Tutorial Videos</h3>
                  <p className="text-gray-600 mb-4">
                    Watch step-by-step video tutorials on how to maximize all
                    features of the myevent.com.ng platform.
                  </p>
                  <Link
                    href="/tutorials"
                    className="text-purple-700 font-medium hover:text-purple-800"
                  >
                    Watch now →
                  </Link>
                </CardContent>
              </Card>

              <Card className="bg-white border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="mb-4 text-purple-700">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-10 w-10"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Customer Support</h3>
                  <p className="text-gray-600 mb-4">
                    Our dedicated support team is available 24/7 to assist you
                    with any questions or issues.
                  </p>
                  <Link
                    href="/contact"
                    className="text-purple-700 font-medium hover:text-purple-800"
                  >
                    Contact us →
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default CreateEventPage;
