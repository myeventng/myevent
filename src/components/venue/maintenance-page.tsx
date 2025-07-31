import React from 'react';
import { Wrench, Mail, Calendar, ArrowRight, CheckCircle } from 'lucide-react';

interface MaintenancePageProps {
  platformName?: string;
  supportEmail?: string;
  estimatedDowntime?: string;
}

export default function MaintenancePage({
  platformName = 'MyEvent.com.ng',
  supportEmail = 'support@myevent.com.ng',
  estimatedDowntime = "We'll be back soon",
}: MaintenancePageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="relative max-w-2xl mx-auto text-center">
        {/* Logo/Brand */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full mb-4">
            <Wrench className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            {platformName}
          </h1>
          <div className="h-1 w-24 bg-gradient-to-r from-blue-400 to-indigo-400 mx-auto rounded-full" />
        </div>

        {/* Main Message */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 md:p-12 border border-white/20 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Under Maintenance
            </h2>
            <p className="text-xl text-blue-100 leading-relaxed">
              We're currently performing scheduled maintenance to improve your
              experience. We'll be back online shortly with exciting new
              features!
            </p>
          </div>

          {/* Status */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-100 px-4 py-2 rounded-full border border-blue-400/30">
              <Calendar className="w-4 h-4" />
              <span className="font-medium">{estimatedDowntime}</span>
            </div>
          </div>

          {/* What We're Working On */}
          <div className="text-left mb-8">
            <h3 className="text-xl font-semibold text-white mb-4 text-center">
              What we're improving:
            </h3>
            <div className="grid gap-3">
              {[
                'Enhanced ticketing system performance',
                'New payment processing features',
                'Improved event discovery',
                'Better mobile experience',
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 text-blue-100"
                >
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Info */}
          <div className="border-t border-white/20 pt-6">
            <p className="text-blue-100 mb-4">
              Need immediate assistance or have questions?
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a
                href={`mailto:${supportEmail}`}
                className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105 backdrop-blur-sm"
              >
                <Mail className="w-4 h-4" />
                Contact Support
                <ArrowRight className="w-4 h-4" />
              </a>

              <div className="text-sm text-blue-200">
                <p>Email: {supportEmail}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-blue-200 text-sm">
            Follow us on social media for real-time updates
          </p>

          {/* Social Media Links */}
          <div className="flex justify-center gap-4 mt-4">
            {[
              { name: 'Twitter', href: '#', icon: '𝕏' },
              { name: 'Instagram', href: '#', icon: '📷' },
              { name: 'Facebook', href: '#', icon: '📘' },
            ].map((social) => (
              <a
                key={social.name}
                href={social.href}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-110"
                title={social.name}
              >
                <span className="text-lg">{social.icon}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Auto-refresh notice */}
        <div className="mt-6 text-center">
          <p className="text-xs text-blue-300">
            This page will automatically refresh when we're back online
          </p>
        </div>
      </div>

      {/* Auto-refresh script simulation */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
          // Auto-refresh every 30 seconds to check if maintenance is over
          setTimeout(function() {
            window.location.reload();
          }, 30000);
        `,
        }}
      />
    </div>
  );
}
