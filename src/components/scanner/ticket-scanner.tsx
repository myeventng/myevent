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
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { validateTicket } from '@/actions/ticket.actions';
import jsQR from 'jsqr';

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
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScannedTicketId, setLastScannedTicketId] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startCamera = async () => {
    setCameraError(null);

    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Try back camera first
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      const video = videoRef.current;
      if (!video) {
        throw new Error('Video element not available');
      }

      video.srcObject = stream;
      streamRef.current = stream;

      video.onloadedmetadata = () => {
        video.play().then(() => {
          setIsScanning(true);
          // Start scanning after video is ready
          setTimeout(() => {
            scanIntervalRef.current = setInterval(scanQRCode, 500);
          }, 1000);
          toast.success('Camera started - Ready to scan!');
        });
      };
    } catch (error: any) {
      console.error('Camera error:', error);
      let errorMessage = 'Failed to access camera';

      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.';
      }

      setCameraError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsScanning(false);
    toast.info('Camera stopped');
  };

  const scanQRCode = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || isProcessing) return;

    const context = canvas.getContext('2d');
    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data for QR scanning
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    // Scan for QR codes
    const qrCode = jsQR(imageData.data, imageData.width, imageData.height);

    if (qrCode && qrCode.data) {
      try {
        // Parse QR code as JSON
        const qrData = JSON.parse(qrCode.data);

        if (
          qrData.type === 'EVENT_TICKET' &&
          qrData.ticketId &&
          qrData.eventId
        ) {
          // Prevent duplicate scans
          if (qrData.ticketId === lastScannedTicketId) return;

          // Check if ticket is for this event
          if (qrData.eventId !== eventId) {
            toast.error('This ticket is for a different event!');
            return;
          }

          setLastScannedTicketId(qrData.ticketId);
          validateScannedTicket(qrData.ticketId);

          // Reset after 3 seconds to allow rescanning
          setTimeout(() => setLastScannedTicketId(''), 3000);
        }
      } catch (error) {
        // If not valid JSON, ignore
        console.log('QR code is not valid ticket JSON:', qrCode.data);
      }
    }
  };

  const validateScannedTicket = async (ticketId: string) => {
    setIsProcessing(true);

    try {
      const result = (await validateTicket(ticketId, eventId)) as ScanResult;
      setScanResult(result);

      if (onScanComplete) {
        onScanComplete(result);
      }

      if (result.success) {
        toast.success(
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <div>
              <div className="font-medium">✓ Valid Ticket</div>
              <div className="text-sm">{result.ticket?.user.name}</div>
            </div>
          </div>,
          { duration: 4000 }
        );
      } else {
        toast.error(
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <div>
              <div className="font-medium">✗ Invalid Ticket</div>
              <div className="text-sm">{result.message}</div>
            </div>
          </div>,
          { duration: 4000 }
        );
      }
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('Error validating ticket');
    } finally {
      setIsProcessing(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Main Scanner */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            QR Code Scanner
            {isProcessing && (
              <div className="flex items-center gap-1 text-blue-500">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">Processing...</span>
              </div>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Scan ticket QR codes for: {eventTitle}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Camera Error */}
          {cameraError && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {cameraError}
              </AlertDescription>
            </Alert>
          )}

          {/* Controls */}
          <div className="flex gap-2">
            {!isScanning ? (
              <Button onClick={startCamera} className="flex-1">
                <Camera className="mr-2 h-4 w-4" />
                Start Scanner
              </Button>
            ) : (
              <Button onClick={stopCamera} variant="outline" className="flex-1">
                <X className="mr-2 h-4 w-4" />
                Stop Scanner
              </Button>
            )}
          </div>

          {/* Camera View */}
          {isScanning && (
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-64 bg-black rounded-lg object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Scanning Target */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-dashed border-white rounded-lg relative">
                  {/* Corner brackets */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-white"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-white"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-white"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-white"></div>

                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white text-sm font-medium bg-black/50 px-2 py-1 rounded">
                      {isProcessing ? 'Validating...' : 'Position QR code here'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Processing Overlay */}
              {isProcessing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                  <div className="bg-white p-4 rounded-lg">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                      <span>Validating ticket...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scan Result */}
      {scanResult && (
        <Card
          className={
            scanResult.success
              ? 'border-green-200 bg-green-50'
              : 'border-red-200 bg-red-50'
          }
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {scanResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Scan Result
              <Badge
                variant={scanResult.success ? 'default' : 'destructive'}
                className="ml-auto"
              >
                {scanResult.success ? 'VALID' : 'INVALID'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scanResult.success && scanResult.ticket ? (
              <div className="space-y-4">
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 font-medium">
                    ✓ Entry granted - Valid ticket
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Ticket ID
                      </label>
                      <p className="font-mono text-sm bg-white p-2 rounded border">
                        {scanResult.ticket.ticketId}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Ticket Type
                      </label>
                      <p className="font-medium">
                        {scanResult.ticket.ticketType.name}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Price
                      </label>
                      <p className="font-bold text-lg">
                        ₦{scanResult.ticket.ticketType.price.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Attendee
                      </label>
                      <p className="flex items-center gap-2 font-medium">
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
                      <Badge
                        variant={
                          scanResult.ticket.status === 'USED'
                            ? 'secondary'
                            : 'default'
                        }
                      >
                        {scanResult.ticket.status === 'USED'
                          ? 'Previously Used'
                          : 'Valid Entry'}
                      </Badge>
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
                <AlertDescription className="text-red-800 font-medium">
                  ✗ {scanResult.message}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Simple Instructions */}
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Click &quot;Start Scanner&quot; to begin scanning</p>
            <p>• Position QR codes in the white target area</p>
            <p>
              • Scanner only accepts valid event ticket QR codes with JSON data
            </p>
            <p>• Results will appear automatically after scanning</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
