'use client';

import { Mail, Phone, Calendar, Activity, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface UserData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  subRole: string;
  banned?: boolean;
  banReason?: string;
  banExpires?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  createdAt: string;
  updatedAt: string;
  organizerProfile?: {
    organizationName: string;
    organizationType?: string;
    bio?: string;
    website?: string;
    businessRegistrationNumber?: string;
    taxIdentificationNumber?: string;
  };
}

interface UserOverviewProps {
  user: UserData;
}

export default function UserOverview({ user }: UserOverviewProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-3">
            <Mail className="w-4 h-4 text-gray-500" />
            <div>
              <p className="font-medium">{user.email}</p>
              <p className="text-sm text-gray-600">
                {user.emailVerified ? 'Verified' : 'Not verified'}
              </p>
            </div>
          </div>

          {user.phone && (
            <div className="flex items-center space-x-3">
              <Phone className="w-4 h-4 text-gray-500" />
              <div>
                <p className="font-medium">{user.phone}</p>
                <p className="text-sm text-gray-600">
                  {user.phoneVerified ? 'Verified' : 'Not verified'}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-3">
            <Calendar className="w-4 h-4 text-gray-500" />
            <div>
              <p className="font-medium">{formatDate(user.createdAt)}</p>
              <p className="text-sm text-gray-600">Member since</p>
            </div>
          </div>

          {user.updatedAt && (
            <div className="flex items-center space-x-3">
              <Activity className="w-4 h-4 text-gray-500" />
              <div>
                <p className="font-medium">{formatDateTime(user.updatedAt)}</p>
                <p className="text-sm text-gray-600">Last updated</p>
              </div>
            </div>
          )}

          {user.banned && user.banReason && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm font-medium text-red-800">
                {user.banExpires && new Date(user.banExpires) > new Date()
                  ? 'Suspension Reason:'
                  : 'Ban Reason:'}
              </p>
              <p className="text-sm text-red-700">{user.banReason}</p>
              {user.banExpires && new Date(user.banExpires) > new Date() && (
                <p className="text-xs text-red-600 mt-1">
                  Expires: {formatDateTime(user.banExpires)}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Organizer Profile */}
      {user.organizerProfile && (
        <Card>
          <CardHeader>
            <CardTitle>Organizer Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <Building2 className="w-4 h-4 text-gray-500" />
              <div>
                <p className="font-medium">
                  {user.organizerProfile.organizationName}
                </p>
                {user.organizerProfile.organizationType && (
                  <p className="text-sm text-gray-600">
                    {user.organizerProfile.organizationType}
                  </p>
                )}
              </div>
            </div>

            {user.organizerProfile.bio && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Bio</p>
                <p className="text-sm">{user.organizerProfile.bio}</p>
              </div>
            )}

            {user.organizerProfile.website && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Website</p>
                <a
                  href={user.organizerProfile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  {user.organizerProfile.website}
                </a>
              </div>
            )}

            {(user.organizerProfile.businessRegistrationNumber ||
              user.organizerProfile.taxIdentificationNumber) && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Business Details</p>
                <div className="space-y-1 text-sm">
                  {user.organizerProfile.businessRegistrationNumber && (
                    <p>
                      <span className="font-medium">Registration:</span>{' '}
                      {user.organizerProfile.businessRegistrationNumber}
                    </p>
                  )}
                  {user.organizerProfile.taxIdentificationNumber && (
                    <p>
                      <span className="font-medium">Tax ID:</span>{' '}
                      {user.organizerProfile.taxIdentificationNumber}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
