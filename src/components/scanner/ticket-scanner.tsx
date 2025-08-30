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
  Bell,
  Clock,
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
  const [manualTicketId, setManualTicketId] = useState('');
  const [scanCount, setScanCount] = useState(0);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [showErrorAnimation, setShowErrorAnimation] = useState(false);
  const [lastScannedTicketId, setLastScannedTicketId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>(
    []
  );
  const [currentDeviceId, setCurrentDeviceId] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check camera permissions and get available devices
  useEffect(() => {
    checkCameraPermissions();
  }, []);

  const checkCameraPermissions = async () => {
    try {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera not supported in this browser');
        setHasPermission(false);
        return;
      }

      // Check if we're in a secure context
      if (!window.isSecureContext && location.protocol !== 'http:') {
        setCameraError('Camera access requires HTTPS');
        setHasPermission(false);
        return;
      }

      // Request permission by attempting to access camera
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });

        // Stop the temporary stream immediately
        tempStream.getTracks().forEach((track) => track.stop());

        // Now enumerate devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(
          (device) => device.kind === 'videoinput'
        );

        console.log('Available video devices:', videoDevices);
        setAvailableDevices(videoDevices);

        if (videoDevices.length === 0) {
          setCameraError('No camera devices found');
          setHasPermission(false);
          return;
        }

        // Set default device (prefer back camera on mobile)
        const backCamera = videoDevices.find(
          (device) =>
            device.label.toLowerCase().includes('back') ||
            device.label.toLowerCase().includes('rear') ||
            device.label.toLowerCase().includes('environment')
        );

        setCurrentDeviceId(backCamera?.deviceId || videoDevices[0].deviceId);
        setHasPermission(true);
        setCameraError(null);
      } catch (permissionError: any) {
        console.error('Camera permission error:', permissionError);

        if (permissionError.name === 'NotAllowedError') {
          setCameraError(
            'Camera permission denied. Please allow camera access and refresh the page.'
          );
        } else if (permissionError.name === 'NotFoundError') {
          setCameraError('No camera found on this device');
        } else {
          setCameraError('Unable to access camera: ' + permissionError.message);
        }
        setHasPermission(false);
      }
    } catch (error) {
      console.error('Error checking camera capabilities:', error);
      setCameraError('Error checking camera capabilities');
      setHasPermission(false);
    }
  };

  const triggerSuccessAnimation = () => {
    setShowSuccessAnimation(true);
    setTimeout(() => setShowSuccessAnimation(false), 2000);
  };

  const triggerErrorAnimation = () => {
    setShowErrorAnimation(true);
    setTimeout(() => setShowErrorAnimation(false), 2000);
  };

  const startCamera = async () => {
    if (hasPermission === false) {
      toast.error('Camera permission required');
      return;
    }

    setCameraError(null);
    setIsVideoReady(false);

    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      console.log('Starting camera with device:', currentDeviceId);

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          deviceId: currentDeviceId ? { exact: currentDeviceId } : undefined,
          width: { min: 320, ideal: 1280, max: 1920 },
          height: { min: 240, ideal: 720, max: 1080 },
          frameRate: { ideal: 30 },
        },
      };

      // If no specific device, try to use back camera on mobile
      if (!currentDeviceId) {
        const isMobile =
          /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
          );
        if (isMobile) {
          (constraints.video as MediaTrackConstraints).facingMode = {
            ideal: 'environment',
          };
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (!videoRef.current) {
        throw new Error('Video element not found');
      }

      const video = videoRef.current;
      video.srcObject = stream;
      streamRef.current = stream;

      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Video loading timeout'));
        }, 10000);

        video.addEventListener(
          'loadedmetadata',
          () => {
            clearTimeout(timeout);
            console.log('Video loaded:', {
              width: video.videoWidth,
              height: video.videoHeight,
            });

            video
              .play()
              .then(() => {
                console.log('Video playing');
                setIsVideoReady(true);
                setIsScanning(true);

                // Start scanning after a short delay
                setTimeout(() => {
                  scanIntervalRef.current = setInterval(scanQRCode, 500);
                }, 1000);

                toast.success('Camera started successfully');
                resolve();
              })
              .catch(reject);
          },
          { once: true }
        );

        video.addEventListener(
          'error',
          (e) => {
            clearTimeout(timeout);
            reject(new Error('Video loading failed'));
          },
          { once: true }
        );
      });
    } catch (error: any) {
      console.error('Camera start error:', error);

      let errorMessage = 'Failed to start camera';

      switch (error.name) {
        case 'NotAllowedError':
          errorMessage = 'Camera permission denied';
          break;
        case 'NotFoundError':
          errorMessage = 'Camera not found';
          break;
        case 'NotReadableError':
          errorMessage = 'Camera is being used by another application';
          break;
        case 'OverconstrainedError':
          errorMessage = 'Camera settings not supported';
          break;
        default:
          errorMessage = error.message || 'Unknown camera error';
      }

      setCameraError(errorMessage);
      toast.error(errorMessage);
      setIsScanning(false);
      setIsVideoReady(false);

      // Cleanup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }
  };

  const stopCamera = () => {
    console.log('Stopping camera');

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log('Stopped track:', track.label);
      });
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
    setIsVideoReady(false);
    setCameraError(null);
    toast.info('Camera stopped');
  };

  const scanQRCode = async () => {
    if (
      !videoRef.current ||
      !canvasRef.current ||
      isProcessing ||
      !isVideoReady
    ) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) {
      return;
    }

    try {
      // Set canvas dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get image data
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      // Scan for QR code
      const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (qrCode && qrCode.data) {
        console.log('QR Code detected:', qrCode.data);

        let ticketId = '';

        try {
          // Try parsing as JSON first
          const qrData = JSON.parse(qrCode.data);

          if (
            qrData.type === 'EVENT_TICKET' &&
            qrData.ticketId &&
            qrData.eventId
          ) {
            if (qrData.eventId !== eventId) {
              toast.error('This ticket is for a different event');
              triggerErrorAnimation();
              return;
            }
            ticketId = qrData.ticketId;
          }
        } catch {
          // If not JSON, treat as plain text
          ticketId = qrCode.data.trim();
        }

        if (
          ticketId &&
          ticketId !== lastScannedTicketId &&
          ticketId.length > 3
        ) {
          setLastScannedTicketId(ticketId);
          await validateScannedTicket(ticketId);

          // Clear the last scanned ID after 3 seconds
          setTimeout(() => setLastScannedTicketId(''), 3000);
        }
      }
    } catch (error) {
      console.error('QR scanning error:', error);
    }
  };

  const switchCamera = async () => {
    if (availableDevices.length <= 1) {
      toast.info('Only one camera available');
      return;
    }

    const currentIndex = availableDevices.findIndex(
      (device) => device.deviceId === currentDeviceId
    );
    const nextIndex = (currentIndex + 1) % availableDevices.length;
    const nextDevice = availableDevices[nextIndex];

    console.log('Switching to camera:', nextDevice.label || 'Unknown Camera');
    setCurrentDeviceId(nextDevice.deviceId);

    if (isScanning) {
      stopCamera();
      setTimeout(() => startCamera(), 500);
    }
  };

  const validateScannedTicket = async (ticketId: string) => {
    setIsProcessing(true);

    try {
      const result = (await validateTicket(ticketId, eventId)) as ScanResult;
      const scanResult: ScanResult = {
        ...result,
        message: result.message ?? 'No message provided',
      };

      setScanResult(scanResult);
      setScanCount((prev) => prev + 1);
      setLastScanTime(new Date());

      // Dispatch custom event
      const scanEvent = new CustomEvent('ticketScanned', {
        detail: scanResult,
      });
      window.dispatchEvent(scanEvent);

      if (onScanComplete) {
        onScanComplete(scanResult);
      }

      if (scanResult.success) {
        triggerSuccessAnimation();
        toast.success(
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <div>
              <div className="font-medium">Valid Ticket</div>
              <div className="text-sm text-muted-foreground">
                {scanResult.ticket?.user.name} - Entry granted
              </div>
            </div>
          </div>,
          { duration: 4000 }
        );
        setManualTicketId('');
      } else {
        triggerErrorAnimation();
        toast.error(
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <div>
              <div className="font-medium">Invalid Ticket</div>
              <div className="text-sm text-muted-foreground">
                {scanResult.message}
              </div>
            </div>
          </div>,
          { duration: 4000 }
        );
      }
    } catch (error) {
      console.error('Ticket validation error:', error);
      const errorResult = {
        success: false,
        message: 'Error validating ticket',
      };
      setScanResult(errorResult);
      triggerErrorAnimation();
      toast.error('Error validating ticket - Please try again');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualValidation = async () => {
    if (!manualTicketId.trim()) {
      toast.error('Please enter a ticket ID');
      return;
    }
    await validateScannedTicket(manualTicketId.trim());
  };

  const resetScanner = () => {
    setScanResult(null);
    setManualTicketId('');
    setLastScannedTicketId('');
    setCameraError(null);
    toast.info('Scanner reset');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Scan Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Scan className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{scanCount}</div>
                <div className="text-sm text-muted-foreground">Total Scans</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">
                  {isScanning ? 'ACTIVE' : 'READY'}
                </div>
                <div className="text-sm text-muted-foreground">
                  Scanner Status
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-500" />
              <div>
                <div className="text-lg font-bold">
                  {lastScanTime ? formatTime(lastScanTime) : '--:--:--'}
                </div>
                <div className="text-sm text-muted-foreground">Last Scan</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Scanner */}
      <Card
        className={`transition-all duration-500 ${
          showSuccessAnimation
            ? 'ring-4 ring-green-500 bg-green-50'
            : showErrorAnimation
              ? 'ring-4 ring-red-500 bg-red-50'
              : ''
        }`}
      >
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
            Scan QR codes or manually enter ticket IDs for: {eventTitle}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Camera Status */}
          {hasPermission === null && (
            <Alert>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Checking camera permissions...
              </AlertDescription>
            </Alert>
          )}

          {/* Camera Error */}
          {cameraError && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Camera Error:</strong> {cameraError}
                <div className="mt-2 text-sm">
                  <p>Troubleshooting steps:</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>Ensure camera permissions are allowed</li>
                    <li>Close other apps using the camera</li>
                    <li>Try refreshing the page</li>
                    <li>Use HTTPS connection if possible</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Available Cameras Info */}
          {availableDevices.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {availableDevices.length} camera(s) detected
              {currentDeviceId && (
                <span className="ml-2">
                  • Active:{' '}
                  {availableDevices.find((d) => d.deviceId === currentDeviceId)
                    ?.label || 'Unknown Camera'}
                </span>
              )}
            </div>
          )}

          {/* Camera Controls */}
          <div className="flex gap-2 flex-wrap">
            {!isScanning ? (
              <Button
                onClick={startCamera}
                className="flex-1 min-w-40"
                disabled={hasPermission === false}
              >
                <Camera className="mr-2 h-4 w-4" />
                Start QR Scanner
              </Button>
            ) : (
              <Button
                onClick={stopCamera}
                variant="outline"
                className="flex-1 min-w-40"
              >
                <X className="mr-2 h-4 w-4" />
                Stop Scanner
              </Button>
            )}

            {availableDevices.length > 1 && (
              <Button onClick={switchCamera} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4" />
                Switch Camera ({availableDevices.length})
              </Button>
            )}

            <Button onClick={resetScanner} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
              Reset
            </Button>
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

              {/* Loading Overlay */}
              {!isVideoReady && (
                <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center rounded-lg">
                  <div className="text-white text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p>Initializing camera...</p>
                  </div>
                </div>
              )}

              {/* Scanning Overlay */}
              {isVideoReady && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    <div
                      className={`w-48 h-48 border-2 border-dashed rounded-lg transition-all duration-300 ${
                        isProcessing
                          ? 'border-blue-500 bg-blue-500/20'
                          : 'border-white bg-black/20'
                      }`}
                    >
                      {/* Corner brackets */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-white"></div>
                      <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-white"></div>
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-white"></div>
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-white"></div>

                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white text-sm font-medium text-center px-2 bg-black/50 rounded">
                          {isProcessing
                            ? 'Validating...'
                            : 'Position QR code here'}
                        </span>
                      </div>
                    </div>

                    {/* Scanning line animation */}
                    {!isProcessing && (
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white to-transparent animate-pulse"></div>
                    )}
                  </div>
                </div>
              )}

              {/* Success Animation */}
              {showSuccessAnimation && (
                <div className="absolute inset-0 bg-green-500 bg-opacity-20 flex items-center justify-center animate-pulse rounded-lg">
                  <div className="bg-green-500 text-white p-6 rounded-full animate-bounce">
                    <CheckCircle className="h-12 w-12" />
                  </div>
                </div>
              )}

              {/* Error Animation */}
              {showErrorAnimation && (
                <div className="absolute inset-0 bg-red-500 bg-opacity-20 flex items-center justify-center animate-pulse rounded-lg">
                  <div className="bg-red-500 text-white p-6 rounded-full animate-bounce">
                    <XCircle className="h-12 w-12" />
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
                disabled={isProcessing}
              />
              <Button
                onClick={handleManualValidation}
                disabled={isProcessing || !manualTicketId.trim()}
                className="min-w-24"
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
        <Card
          className={`transition-all duration-300 ${
            scanResult.success
              ? 'border-green-200 bg-green-50'
              : 'border-red-200 bg-red-50'
          }`}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {scanResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Validation Result
              <Badge
                variant={scanResult.success ? 'default' : 'destructive'}
                className="ml-auto"
              >
                {scanResult.success ? 'APPROVED' : 'DENIED'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scanResult.success && scanResult.ticket ? (
              <div className="space-y-4">
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 font-medium">
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

                  <div className="space-y-3">
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
                            : 'Valid Entry'}
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
                <AlertDescription className="text-red-800 font-medium">
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
            QR Scanner Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              • <strong>QR Code Scanning:</strong> Click &quot;Start QR
              Scanner&quot; and position QR codes in the target area
            </p>
            <p>
              • <strong>Automatic Detection:</strong> The scanner will
              automatically detect and validate QR codes
            </p>
            <p>
              • <strong>Manual Entry:</strong> Type ticket ID and press Enter or
              click &quot;Validate&quot;
            </p>
            <p>
              • <strong>Visual Feedback:</strong> Watch for green (success) or
              red (error) animations
            </p>
            <p>
              • <strong>Event Validation:</strong> QR codes are automatically
              validated for the correct event
            </p>
            <p>
              • <strong>Multiple Cameras:</strong> Use &quot;Switch Camera&quot;
              to toggle between available cameras
            </p>
            <p>
              • <strong>Browser Support:</strong> Works best on Chrome, Safari,
              and Edge with HTTPS
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
