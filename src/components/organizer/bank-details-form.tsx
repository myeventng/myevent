// src/components/organizer/bank-details-form.tsx
'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { verifyBankAccount } from '@/actions/payout.actions';
import { updateOrganizerBankDetails } from '@/actions/organizer.actions';

// Nigerian banks list (you can extend this)
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

// Form schema
const formSchema = z.object({
  accountNumber: z
    .string()
    .min(10, 'Account number must be 10 digits')
    .max(10, 'Account number must be 10 digits')
    .regex(/^\d+$/, 'Account number must contain only numbers'),
  bankCode: z.string().min(1, 'Please select a bank'),
});

type FormValues = z.infer<typeof formSchema>;

interface BankDetailsFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function BankDetailsForm({ onClose, onSuccess }: BankDetailsFormProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [verificationError, setVerificationError] = useState<string>('');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accountNumber: '',
      bankCode: '',
    },
  });

  const accountNumber = form.watch('accountNumber');
  const bankCode = form.watch('bankCode');

  // Auto-verify when both fields are filled
  useEffect(() => {
    if (accountNumber.length === 10 && bankCode) {
      handleVerifyAccount();
    } else {
      setVerificationResult(null);
      setVerificationError('');
    }
  }, [accountNumber, bankCode]);

  // Verify bank account
  const handleVerifyAccount = async () => {
    if (!accountNumber || !bankCode) return;

    setIsVerifying(true);
    setVerificationError('');
    setVerificationResult(null);

    try {
      const response = await verifyBankAccount(accountNumber, bankCode);

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

  // Submit form
  const onSubmit = async (values: FormValues) => {
    if (!verificationResult) {
      toast.error('Please verify your bank account first');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await updateOrganizerBankDetails(
        values.accountNumber,
        values.bankCode,
        verificationResult.account_name
      );

      if (response.success) {
        toast.success('Bank details updated successfully');
        onSuccess();
      } else {
        toast.error(response.message || 'Failed to update bank details');
      }
    } catch (error) {
      console.error('Error updating bank details:', error);
      toast.error('Failed to update bank details');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedBank = NIGERIAN_BANKS.find((bank) => bank.code === bankCode);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Bank Details</DialogTitle>
          <DialogDescription>
            Add or update your bank account details for payout processing. We'll
            verify your account details with your bank.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="bankCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your bank" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {NIGERIAN_BANKS.map((bank) => (
                        <SelectItem key={bank.code} value={bank.code}>
                          {bank.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your 10-digit account number"
                      {...field}
                      maxLength={10}
                      onChange={(e) => {
                        // Only allow numbers
                        const value = e.target.value.replace(/\D/g, '');
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter your 10-digit account number
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Verification Status */}
            {(isVerifying || verificationResult || verificationError) && (
              <div className="mt-4 p-3 rounded-lg border">
                {isVerifying && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">
                      Verifying account details...
                    </span>
                  </div>
                )}

                {verificationResult && (
                  <div className="flex items-start gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Account Verified</p>
                      <p className="text-sm">
                        <strong>Account Name:</strong>{' '}
                        {verificationResult.account_name}
                      </p>
                      <p className="text-sm">
                        <strong>Bank:</strong> {selectedBank?.name}
                      </p>
                      <p className="text-sm">
                        <strong>Account Number:</strong>{' '}
                        {verificationResult.account_number}
                      </p>
                    </div>
                  </div>
                )}

                {verificationError && (
                  <div className="flex items-start gap-2 text-red-600">
                    <AlertCircle className="w-4 h-4 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Verification Failed</p>
                      <p className="text-sm">{verificationError}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Security Notice */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    Security Notice
                  </p>
                  <p className="text-sm text-blue-700">
                    Your bank details are encrypted and securely stored. We only
                    use them for payout processing.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !verificationResult}
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isSubmitting ? 'Saving...' : 'Save Bank Details'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
