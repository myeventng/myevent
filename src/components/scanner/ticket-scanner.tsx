'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Camera,
  X,
  CheckCircle,
  XCircle,
  Scan,
  User,
  Ticket,
  Calendar,
  MapPin,
  Info,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { validateTicket } from '@/actions/ticket.actions';

interface TicketScannerProps {
  eventId: string;
  eventTitle: string;
  onScanComplete?: (result: any) => void;
}

interface ScanResult {
  success: boolean;
  ticket?: {
    id: string;
    ticketId: string;
    status: string;
    user: {
      name: string;
      email: string;
    };
    ticketType: {
      name: string;
      price: number;
    };
    purchasedAt: string;
  };
  message: string;
  alreadyUsed?: boolean;
}

export function TicketScanner({
  eventId,
  eventTitle,
  onScanComplete,
}: TicketScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualTicketId, setManualTicketId] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsScanning(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Failed to access camera. Please check permissions.');
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  // Scan QR code from video
  const scanQRCode = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    try {
      // Try to decode QR code using a simple pattern match
      // In a real implementation, you'd use a QR code library like jsQR
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      // Mock QR detection - replace with actual QR code library
      // For demo purposes, we'll check if user manually enters a ticket ID
    } catch (error) {
      console.error('Error scanning QR code:', error);
    }
  };

  // Validate scanned ticket
  const validateScannedTicket = async (ticketId: string) => {
    setIsProcessing(true);
    try {
      const result = await validateTicket(ticketId, eventId);
      setScanResult({
        ...result,
        message: result.message ?? 'No message provided',
      });
      onScanComplete?.(result);

      if (result.success) {
        toast.success('Ticket validated successfully!');
      } else {
        toast.error(result.message || 'Invalid ticket');
      }
    } catch (error) {
      console.error('Error validating ticket:', error);
      setScanResult({
        success: false,
        message: 'Error validating ticket',
      });
      toast.error('Error validating ticket');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle manual ticket validation
  const handleManualValidation = async () => {
    if (!manualTicketId.trim()) {
      toast.error('Please enter a ticket ID');
      return;
    }
    await validateScannedTicket(manualTicketId.trim());
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Auto-scan effect (for demo - replace with real QR library)
  useEffect(() => {
    if (isScanning) {
      const interval = setInterval(scanQRCode, 1000);
      return () => clearInterval(interval);
    }
  }, [isScanning]);

  const resetScanner = () => {
    setScanResult(null);
    setManualTicketId('');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            Ticket Scanner
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Scan QR codes or manually enter ticket IDs for: {eventTitle}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Camera Controls */}
          <div className="flex gap-2">
            {!isScanning ? (
              <Button onClick={startCamera} className="flex-1">
                <Camera className="mr-2 h-4 w-4" />
                Start Camera
              </Button>
            ) : (
              <Button onClick={stopCamera} variant="outline" className="flex-1">
                <X className="mr-2 h-4 w-4" />
                Stop Camera
              </Button>
            )}
            <Button onClick={resetScanner} variant="outline">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Camera View */}
          {isScanning && (
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-64 bg-black rounded-lg"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-white border-dashed rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    Position QR code here
                  </span>
                </div>
              </div>

              {isProcessing && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="bg-white p-4 rounded-lg">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Validating ticket...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Manual Entry */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Manual Ticket Entry</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualTicketId}
                onChange={(e) => setManualTicketId(e.target.value)}
                placeholder="Enter ticket ID (e.g., TKT-ABC123)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) =>
                  e.key === 'Enter' && handleManualValidation()
                }
              />
              <Button
                onClick={handleManualValidation}
                disabled={isProcessing || !manualTicketId.trim()}
              >
                {isProcessing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  'Validate'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scan Result */}
      {scanResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {scanResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Validation Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scanResult.success && scanResult.ticket ? (
              <div className="space-y-4">
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    {scanResult.alreadyUsed
                      ? 'Ticket already used - Entry allowed'
                      : 'Valid ticket - Entry granted'}
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Ticket ID
                      </label>
                      <p className="font-mono text-sm">
                        {scanResult.ticket.ticketId}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Ticket Type
                      </label>
                      <p>{scanResult.ticket.ticketType.name}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Price
                      </label>
                      <p>
                        ₦{scanResult.ticket.ticketType.price.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Attendee
                      </label>
                      <p className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {scanResult.ticket.user.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {scanResult.ticket.user.email}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Status
                      </label>
                      <div>
                        <Badge
                          variant={
                            scanResult.ticket.status === 'USED'
                              ? 'secondary'
                              : 'default'
                          }
                          className={
                            scanResult.ticket.status === 'USED'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-green-100 text-green-800'
                          }
                        >
                          {scanResult.ticket.status === 'USED'
                            ? 'Previously Used'
                            : 'Valid'}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Purchased
                      </label>
                      <p className="text-sm">
                        {new Date(
                          scanResult.ticket.purchasedAt
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <Alert className="border-red-200 bg-red-50">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {scanResult.message}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Use the camera to scan QR codes on tickets</p>
            <p>• Alternatively, manually enter the ticket ID</p>
            <p>• Valid tickets will be marked as "USED" after scanning</p>
            <p>• Previously used tickets will show a warning but allow entry</p>
            <p>• Invalid or cancelled tickets will be rejected</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
