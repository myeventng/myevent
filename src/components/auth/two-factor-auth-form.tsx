// 'use client';

// import { useState, useEffect } from 'react';
// import { Button } from '@/components/ui/button';
// import { Card } from '@/components/ui/card';
// import { Label } from '@/components/ui/label';
// import { Input } from '@/components/ui/input';
// import { Switch } from '@/components/ui/switch';
// import { toast } from 'sonner';
// import { useRouter } from 'next/navigation';
// import { Shield, Smartphone, Copy, Check, Loader2 } from 'lucide-react';
// import QRCode from 'react-qr-code';
// import { Badge } from '@/components/ui/badge';
// import {
//   generate2FASecretAction,
//   verify2FACodeAction,
//   disable2FAAction,
//   get2FAStatusAction,
// } from '@/actions/two-factor-auth-actions';
// import { twoFactor } from '@/lib/auth-client';

// interface TwoFactorAuthFormProps {
//   isEnabled: boolean;
//   user: {
//     id: string;
//     email: string;
//   };
// }

// export function TwoFactorAuthForm({
//   isEnabled: initialIsEnabled,
//   user,
// }: TwoFactorAuthFormProps) {
//   const router = useRouter();
//   const [verificationCode, setVerificationCode] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [setupMode, setSetupMode] = useState(false);
//   const [secret, setSecret] = useState('');
//   const [qrCodeUrl, setQrCodeUrl] = useState('');
//   const [copied, setCopied] = useState(false);
//   const [currentStep, setCurrentStep] = useState(1);
//   const [isEnabled, setIsEnabled] = useState(initialIsEnabled);

//   // Fetch the current 2FA status from the server
//   useEffect(() => {
//     const checkStatus = async () => {
//       try {
//         const response = await get2FAStatusAction();
//         if (response.success) {
//           setIsEnabled(response.data.isEnabled);
//         }
//       } catch (error) {
//         console.error('Error checking 2FA status:', error);
//       }
//     };

//     checkStatus();
//   }, []);

//   // Function to generate a new 2FA secret
//   const generateSecret = async () => {
//     setLoading(true);
//     try {
//       const response = await generate2FASecretAction();

//       if (response.success && response.data) {
//         setSecret(response.data.secret);
//         setQrCodeUrl(response.data.qrCodeUrl);
//         setCurrentStep(2);
//       } else {
//         toast.error(response.error || 'Failed to generate 2FA secret');
//       }
//     } catch (error) {
//       console.error('Error generating 2FA secret:', error);
//       toast.error('Failed to generate 2FA secret');
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Function to verify the code and enable 2FA
//   const verifyAndEnable = async () => {
//     if (!verificationCode || verificationCode.length !== 6) {
//       toast.error('Please enter a valid 6-digit code');
//       return;
//     }

//     setLoading(true);
//     try {
//       const response = await verify2FACodeAction(verificationCode);

//       if (response.success) {
//         toast.success('Two-factor authentication enabled successfully');
//         setIsEnabled(true);
//         setSetupMode(false);
//         router.refresh();
//       } else {
//         toast.error(response.error || 'Failed to verify code');
//       }
//     } catch (error) {
//       console.error('Error verifying 2FA code:', error);
//       toast.error('Failed to verify code. Please try again.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Function to disable 2FA
//   const disable2FA = async () => {
//     setLoading(true);
//     try {
//       const response = await disable2FAAction();

//       if (response.success) {
//         toast.success('Two-factor authentication disabled');
//         setIsEnabled(false);
//         router.refresh();
//       } else {
//         toast.error(response.error || 'Failed to disable 2FA');
//       }
//     } catch (error) {
//       console.error('Error disabling 2FA:', error);
//       toast.error('Failed to disable 2FA');
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Copy secret to clipboard
//   const copySecret = () => {
//     navigator.clipboard.writeText(secret);
//     setCopied(true);
//     setTimeout(() => setCopied(false), 3000);
//   };

//   if (isEnabled) {
//     return (
//       <div className="space-y-4">
//         <div className="p-3 rounded-md bg-green-50 border border-green-200 flex items-center justify-between">
//           <div className="flex items-center gap-2">
//             <Shield className="h-5 w-5 text-green-600" />
//             <p className="font-medium text-green-800">2FA is Active</p>
//           </div>
//           <Badge variant="outline" className="text-green-800 border-green-800">
//             Enabled
//           </Badge>
//         </div>

//         <div className="text-sm text-muted-foreground">
//           <p>
//             Two-factor authentication is currently enabled for your account,
//             providing an extra layer of security.
//           </p>
//         </div>

//         <div className="flex justify-between items-center">
//           <Button
//             variant="outline"
//             onClick={() => setSetupMode(true)}
//             disabled={loading}
//           >
//             Reconfigure 2FA
//           </Button>

//           <Button variant="destructive" onClick={disable2FA} disabled={loading}>
//             {loading ? (
//               <>
//                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                 Disabling...
//               </>
//             ) : (
//               'Disable 2FA'
//             )}
//           </Button>
//         </div>
//       </div>
//     );
//   }

//   if (setupMode) {
//     return (
//       <div className="space-y-6">
//         <div className="bg-amber-50 border border-amber-200 p-3 rounded-md text-sm">
//           <p className="font-medium text-amber-800">
//             Setting up two-factor authentication
//           </p>
//           <p className="text-amber-700 mt-1">
//             Follow the steps below to secure your account with 2FA
//           </p>
//         </div>

//         <div className="space-y-8">
//           {/* Step 1: Generate Secret */}
//           <div className={`space-y-3 ${currentStep > 1 ? 'opacity-50' : ''}`}>
//             <div className="flex items-center gap-2">
//               <div className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
//                 1
//               </div>
//               <h3 className="font-medium">Generate your secret key</h3>
//             </div>

//             <p className="text-sm text-muted-foreground ml-8">
//               We'll generate a unique secret key for your account
//             </p>

//             {currentStep === 1 && (
//               <div className="ml-8">
//                 <Button onClick={generateSecret} disabled={loading}>
//                   {loading ? (
//                     <>
//                       <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                       Generating...
//                     </>
//                   ) : (
//                     'Generate Secret Key'
//                   )}
//                 </Button>
//               </div>
//             )}
//           </div>

//           {/* Step 2: Scan QR Code */}
//           <div
//             className={`space-y-3 ${
//               currentStep < 2
//                 ? 'opacity-50'
//                 : currentStep > 2
//                 ? 'opacity-50'
//                 : ''
//             }`}
//           >
//             <div className="flex items-center gap-2">
//               <div className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
//                 2
//               </div>
//               <h3 className="font-medium">Scan the QR code</h3>
//             </div>

//             <p className="text-sm text-muted-foreground ml-8">
//               Use an authenticator app like Google Authenticator, Authy, or
//               Microsoft Authenticator to scan this QR code
//             </p>

//             {currentStep === 2 && qrCodeUrl && (
//               <div className="ml-8 space-y-4">
//                 <div className="p-4 bg-white inline-block rounded-md">
//                   <QRCode value={qrCodeUrl} size={180} />
//                 </div>

//                 <div className="space-y-2">
//                   <p className="text-sm font-medium">
//                     Or enter this code manually:
//                   </p>
//                   <div className="flex items-center">
//                     <code className="bg-gray-100 p-2 rounded mr-2 font-mono text-sm">
//                       {secret}
//                     </code>
//                     <Button
//                       variant="outline"
//                       size="sm"
//                       onClick={copySecret}
//                       className="h-9"
//                     >
//                       {copied ? (
//                         <Check className="h-4 w-4" />
//                       ) : (
//                         <Copy className="h-4 w-4" />
//                       )}
//                     </Button>
//                   </div>
//                 </div>

//                 <Button onClick={() => setCurrentStep(3)}>Next Step</Button>
//               </div>
//             )}
//           </div>

//           {/* Step 3: Verify Code */}
//           <div className={`space-y-3 ${currentStep < 3 ? 'opacity-50' : ''}`}>
//             <div className="flex items-center gap-2">
//               <div className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
//                 3
//               </div>
//               <h3 className="font-medium">Verify your authenticator app</h3>
//             </div>

//             <p className="text-sm text-muted-foreground ml-8">
//               Enter the 6-digit code from your authenticator app to verify setup
//             </p>

//             {currentStep === 3 && (
//               <div className="ml-8 space-y-4">
//                 <div className="flex flex-col gap-2">
//                   <Label htmlFor="verificationCode">Verification Code</Label>
//                   <div className="flex items-center gap-2">
//                     <Input
//                       id="verificationCode"
//                       value={verificationCode}
//                       onChange={(e) =>
//                         setVerificationCode(
//                           e.target.value.replace(/[^0-9]/g, '').slice(0, 6)
//                         )
//                       }
//                       className="w-40 text-center text-lg tracking-widest"
//                       maxLength={6}
//                       placeholder="000000"
//                     />
//                     <Button
//                       onClick={verifyAndEnable}
//                       disabled={loading || verificationCode.length !== 6}
//                     >
//                       {loading ? (
//                         <>
//                           <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                           Verifying...
//                         </>
//                       ) : (
//                         'Verify & Enable'
//                       )}
//                     </Button>
//                   </div>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>

//         <div className="flex justify-between pt-4 border-t">
//           <Button
//             variant="outline"
//             onClick={() => setSetupMode(false)}
//             disabled={loading}
//           >
//             Cancel
//           </Button>
//         </div>
//       </div>
//     );
//   }

//   return null;
// }
