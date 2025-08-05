// src/components/auth/organizer-profile-form.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Loader2,
  User,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Building2,
  Globe,
} from 'lucide-react';
import { FileUploader } from '@/components/layout/file-uploader';
import { verifyBankAccount } from '@/actions/payout.actions';
import {
  saveOrganizerProfile,
  updateOrganizerBankDetails,
  getUserOrganizerProfile,
} from '@/actions/organizer.actions';

// Nigerian banks list
const NIGERIAN_BANKS = [
  { code: '044', name: 'Access Bank' },
  { code: '014', name: 'Afribank Nigeria Plc' },
  { code: '023', name: 'Citibank Nigeria Limited' },
  { code: '063', name: 'Diamond Bank' },
  { code: '050', name: 'Ecobank Nigeria Plc' },
  { code: '084', name: 'Enterprise Bank Limited' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '214', name: 'First City Monument Bank' },
  { code: '058', name: 'Guaranty Trust Bank' },
  { code: '030', name: 'Heritage Bank' },
  { code: '082', name: 'Keystone Bank' },
  { code: '076', name: 'Polaris Bank' },
  { code: '221', name: 'Stanbic IBTC Bank' },
  { code: '068', name: 'Standard Chartered Bank' },
  { code: '232', name: 'Sterling Bank' },
  { code: '032', name: 'Union Bank of Nigeria' },
  { code: '033', name: 'United Bank For Africa' },
  { code: '215', name: 'Unity Bank' },
  { code: '035', name: 'Wema Bank' },
  { code: '057', name: 'Zenith Bank' },
];

interface OrganizerProfile {
  organizationName: string;
  website?: string;
  bio?: string;
  bankAccount?: string;
  bankCode?: string;
  accountName?: string;
}

interface OrganizerProfileFormProps {
  profile?: OrganizerProfile;
}

export function OrganizerProfileForm({ profile }: OrganizerProfileFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Basic profile fields
  const [organizationName, setOrganizationName] = useState(
    profile?.organizationName || ''
  );
  const [website, setWebsite] = useState(profile?.website || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFiles, setLogoFiles] = useState<File[]>([]);
  const [brandColor, setBrandColor] = useState('#3b82f6');

  // Bank details fields
  const [bankAccount, setBankAccount] = useState(profile?.bankAccount || '');
  const [bankCode, setBankCode] = useState(profile?.bankCode || '');
  const [verificationResult, setVerificationResult] = useState<any>(
    profile?.accountName
      ? {
          account_name: profile.accountName,
          account_number: profile.bankAccount,
          bank_code: profile.bankCode,
        }
      : null
  );
  const [verificationError, setVerificationError] = useState<string>('');

  // Auto-verify when both fields are filled
  useEffect(() => {
    if (bankAccount.length === 10 && bankCode && !verificationResult) {
      handleVerifyAccount();
    } else if (bankAccount.length !== 10 || !bankCode) {
      setVerificationResult(null);
      setVerificationError('');
    }
  }, [bankAccount, bankCode]);

  // Verify bank account
  const handleVerifyAccount = async () => {
    if (!bankAccount || !bankCode) return;

    setIsVerifying(true);
    setVerificationError('');
    setVerificationResult(null);

    try {
      const response = await verifyBankAccount(bankAccount, bankCode);

      if (response.success && response.data) {
        setVerificationResult(response.data);
        toast.success('Bank account verified successfully');
      } else {
        setVerificationError(response.message || 'Failed to verify account');
        toast.error(response.message || 'Failed to verify account');
      }
    } catch (error) {
      console.error('Error verifying account:', error);
      setVerificationError('Failed to verify account');
      toast.error('Failed to verify account');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organizationName.trim()) {
      toast.error('Organization name is required');
      return;
    }

    // If bank details are provided, they must be verified
    if ((bankAccount || bankCode) && !verificationResult) {
      toast.error('Please verify your bank account details');
      return;
    }

    setLoading(true);

    try {
      // Save basic organizer profile
      const profileResponse = await saveOrganizerProfile({
        organizationName,
        website,
        bio,
      });

      if (!profileResponse.success) {
        throw new Error(profileResponse.message);
      }

      // Save bank details if verified
      if (verificationResult && bankAccount && bankCode) {
        const bankResponse = await updateOrganizerBankDetails(
          bankAccount,
          bankCode,
          verificationResult.account_name
        );

        if (!bankResponse.success) {
          toast.error(bankResponse.message || 'Failed to save bank details');
          // Don't fail completely if bank details fail
        } else {
          toast.success('Profile and bank details updated successfully');
        }
      } else {
        toast.success('Organizer profile updated successfully');
      }

      router.refresh();
    } catch (error) {
      console.error('Error updating organizer profile:', error);
      toast.error('Failed to update organizer profile');
    } finally {
      setLoading(false);
    }
  };

  const selectedBank = NIGERIAN_BANKS.find((bank) => bank.code === bankCode);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic Profile Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Organization Details</h3>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="organizationName">
              Organization Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="organizationName"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="Your organization name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
              type="url"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell attendees about your organization"
            rows={5}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground">
            {bio.length}/500 characters
          </p>
        </div>

        <div className="space-y-4">
          <Label>Organization Logo</Label>
          <FileUploader
            onFieldChange={(url) => {
              const singleUrl = Array.isArray(url) ? url[0] : url;
              setLogoUrl(singleUrl);
            }}
            imageUrls={logoUrl}
            setFiles={setLogoFiles}
            maxFiles={1}
            endpoint="venueImage"
            multipleImages={false}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="brandColor">Brand Color</Label>
          <div className="flex items-center gap-4">
            <input
              type="color"
              id="brandColor"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="h-10 w-10 rounded cursor-pointer border"
            />
            <span className="text-sm text-muted-foreground">
              Primary Color: {brandColor}
            </span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Bank Details Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Bank Details for Payouts</h3>
        </div>

        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800">
                Payout Account Setup
              </p>
              <p className="text-sm text-blue-700">
                Add your bank details to receive payouts from ticket sales.
                We'll verify your account details with your bank.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bankCode">Bank</Label>
            <Select value={bankCode} onValueChange={setBankCode}>
              <SelectTrigger>
                <SelectValue placeholder="Select your bank" />
              </SelectTrigger>
              <SelectContent>
                {NIGERIAN_BANKS.map((bank) => (
                  <SelectItem key={bank.code} value={bank.code}>
                    {bank.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankAccount">Account Number</Label>
            <Input
              id="bankAccount"
              value={bankAccount}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                setBankAccount(value);
              }}
              placeholder="Enter your 10-digit account number"
              maxLength={10}
            />
          </div>
        </div>

        {/* Verification Status */}
        {(isVerifying || verificationResult || verificationError) && (
          <div className="mt-4 p-4 rounded-lg border">
            {isVerifying && (
              <div className="flex items-center gap-2 text-blue-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Verifying account details...</span>
              </div>
            )}

            {verificationResult && (
              <div className="flex items-start gap-2 text-green-600">
                <CheckCircle className="w-4 h-4 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Account Verified ✓</p>
                  <div className="text-sm space-y-1 mt-1">
                    <p>
                      <strong>Account Name:</strong>{' '}
                      {verificationResult.account_name}
                    </p>
                    <p>
                      <strong>Bank:</strong> {selectedBank?.name}
                    </p>
                    <p>
                      <strong>Account Number:</strong>{' '}
                      {verificationResult.account_number}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {verificationError && (
              <div className="flex items-start gap-2 text-red-600">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Verification Failed</p>
                  <p className="text-sm">{verificationError}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-1 h-auto p-0 text-red-600 hover:text-red-700"
                    onClick={handleVerifyAccount}
                    disabled={isVerifying}
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Security Notice */}
        <div className="p-3 bg-gray-50 rounded-lg border">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-gray-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-800">
                Security Notice
              </p>
              <p className="text-sm text-gray-700">
                Your bank details are encrypted and securely stored. We only use
                them for payout processing. You can update these details anytime
                in your profile settings.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={loading || isVerifying}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </form>
  );
}
