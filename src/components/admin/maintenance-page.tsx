'use client';
import React, { useState, useEffect } from 'react';
import { Wrench, Mail, Calendar, ArrowRight, CheckCircle } from 'lucide-react';

interface MaintenanceConfig {
  platformName: string;
  supportEmail: string;
  estimatedDowntime: string;
  maintenanceMode: boolean;
}

export default function MaintenancePage() {
  const [config, setConfig] = useState<MaintenanceConfig>({
    platformName: 'MyEvent.com.ng',
    supportEmail: 'support@myevent.com.ng',
    estimatedDowntime: "We'll be back soon",
    maintenanceMode: true,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/maintenance/config');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setConfig(data.data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch maintenance config:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();

    // Auto-refresh every 30 seconds to check if maintenance is over
    const interval = setInterval(() => {
      fetch('/api/maintenance/status')
        .then((response) => response.json())
        .then((data) => {
          if (!data.maintenanceMode) {
            window.location.href = '/';
          }
        })
        .catch((error) => {
          console.error('Failed to check maintenance status:', error);
        });
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-full mb-4">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-white text-xl">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="relative max-w-2xl mx-auto text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full mb-4">
            <Wrench className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            {config.platformName}
          </h1>
          <div className="h-1 w-24 bg-gradient-to-r from-blue-400 to-indigo-400 mx-auto rounded-full" />
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 md:p-12 border border-white/20 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Under Maintenance
            </h2>
            <p className="text-xl text-blue-100 leading-relaxed">
              We&apos;re currently performing scheduled maintenance to improve
              your experience. We&apos;ll be back online shortly with exciting
              new features!
            </p>
          </div>

          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-100 px-4 py-2 rounded-full border border-blue-400/30">
              <Calendar className="w-4 h-4" />
              <span className="font-medium">{config.estimatedDowntime}</span>
            </div>
          </div>

          <div className="text-left mb-8">
            <h3 className="text-xl font-semibold text-white mb-4 text-center">
              What we&apos;re improving:
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

          <div className="border-t border-white/20 pt-6">
            <p className="text-blue-100 mb-4">
              Need immediate assistance or have questions?
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a
                href={`mailto:${config.supportEmail}`}
                className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105 backdrop-blur-sm"
              >
                <Mail className="w-4 h-4" />
                Contact Support
                <ArrowRight className="w-4 h-4" />
              </a>

              <div className="text-sm text-blue-200">
                <p>Email: {config.supportEmail}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-blue-200 text-sm">
            Follow us on social media for real-time updates
          </p>

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

        <div className="mt-6 text-center">
          <p className="text-xs text-blue-300">
            This page will automatically check when we&apos;re back online
          </p>
        </div>
      </div>
    </div>
  );
}
