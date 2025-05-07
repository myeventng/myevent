'use client';
import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PhoneIcon, MapPinIcon, MailIcon, ClockIcon } from 'lucide-react';

const ContactPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Contact Us | myevent.com.ng</title>
        <meta
          name="description"
          content="Get in touch with the myevent.com.ng team for support, feedback, or partnership inquiries."
        />
      </Head>

      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="relative py-16 bg-gradient-to-r from-purple-50 to-indigo-50">
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
                Get in Touch
              </h1>
              <p className="text-xl text-white mb-8">
                Have questions or need assistance? We're here to help. Contact
                our friendly team for support, feedback, or partnership
                inquiries.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Methods */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto mb-16">
              <Card className="border-0 shadow-sm hover:shadow transition-shadow duration-300">
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                    <PhoneIcon className="h-6 w-6 text-purple-700" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Phone</h3>
                  <p className="text-gray-600 mb-2">Mon-Fri, 9am-5pm</p>
                  <a
                    href="tel:+2348012345678"
                    className="text-purple-700 font-medium"
                  >
                    +234 801 234 5678
                  </a>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm hover:shadow transition-shadow duration-300">
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                    <MailIcon className="h-6 w-6 text-purple-700" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Email</h3>
                  <p className="text-gray-600 mb-2">24/7 Support</p>
                  <a
                    href="mailto:support@myevent.com.ng"
                    className="text-purple-700 font-medium"
                  >
                    support@myevent.com.ng
                  </a>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm hover:shadow transition-shadow duration-300">
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                    <MapPinIcon className="h-6 w-6 text-purple-700" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Location</h3>
                  <p className="text-gray-600 mb-2">Lagos Office</p>
                  <address className="text-purple-700 font-medium not-italic">
                    123 Victoria Island, Lagos, Nigeria
                  </address>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm hover:shadow transition-shadow duration-300">
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                    <ClockIcon className="h-6 w-6 text-purple-700" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Live Chat</h3>
                  <p className="text-gray-600 mb-2">Mon-Sun, 24/7</p>
                  <span className="text-purple-700 font-medium">
                    Available on our website
                  </span>
                </CardContent>
              </Card>
            </div>

            {/* Contact Form and Map */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
              <div className="bg-white rounded-lg shadow-sm p-8">
                <h2 className="text-2xl font-bold mb-6">Send us a Message</h2>
                <form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" placeholder="John" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" placeholder="Doe" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone (optional)</Label>
                    <Input id="phone" placeholder="+234 801 234 5678" />
                  </div>

                  <div className="space-y-2">
                    <Label>What can we help you with?</Label>
                    <RadioGroup defaultValue="support">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="support" id="support" />
                        <Label htmlFor="support">Technical Support</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="billing" id="billing" />
                        <Label htmlFor="billing">Billing Inquiry</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="partnership" id="partnership" />
                        <Label htmlFor="partnership">
                          Partnership Opportunity
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="other" id="other" />
                        <Label htmlFor="other">Other</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="How can we help you?"
                      className="min-h-32"
                    />
                  </div>

                  <Button type="submit" className="w-full bg-primary">
                    Send Message
                  </Button>
                </form>
              </div>

              <div className="bg-gray-200 rounded-lg overflow-hidden h-full min-h-96">
                {/* This would be your Google Map or other map embed */}
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl text-purple-700 mb-4">
                      <MapPinIcon className="h-12 w-12 mx-auto" />
                    </div>
                    <p className="text-gray-700 text-lg">
                      Map embed would go here
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-12">
                Frequently Asked Questions
              </h2>

              <div className="space-y-6">
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-xl font-bold mb-2">
                    What are your support hours?
                  </h3>
                  <p className="text-gray-600">
                    Our email and live chat support are available 24/7. Phone
                    support is available Monday through Friday, 9am to 5pm WAT.
                  </p>
                </div>

                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-xl font-bold mb-2">
                    How quickly will I get a response?
                  </h3>
                  <p className="text-gray-600">
                    We aim to respond to all inquiries within 2 hours during
                    business hours, and within 24 hours during weekends and
                    holidays.
                  </p>
                </div>

                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-xl font-bold mb-2">
                    Do you offer onsite support for large events?
                  </h3>
                  <p className="text-gray-600">
                    Yes, we offer premium onsite support for large events.
                    Please contact our sales team for more information and
                    pricing.
                  </p>
                </div>

                <div className="pb-4">
                  <h3 className="text-xl font-bold mb-2">
                    How can I become a partner?
                  </h3>
                  <p className="text-gray-600">
                    We're always looking for strategic partners. Please use the
                    contact form and select "Partnership Opportunity" to start
                    the conversation.
                  </p>
                </div>
              </div>
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
      </div>
    </>
  );
};
export default ContactPage;
