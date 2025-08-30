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
  Volume2,
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
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceIndex, setCurrentDeviceIndex] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check camera permissions and capabilities on component mount
  useEffect(() => {
    checkCameraCapabilities();
  }, []);

  const checkCameraCapabilities = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera not supported on this device or browser');
        setHasPermission(false);
        return;
      }

      // Check if we're in a secure context (HTTPS or localhost)
      if (!window.isSecureContext && location.protocol !== 'http:') {
        setCameraError('Camera requires HTTPS or localhost');
        setHasPermission(false);
        return;
      }

      // Get available video devices
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(
          (device) => device.kind === 'videoinput'
        );
        setCameraDevices(videoDevices);

        if (videoDevices.length === 0) {
          setCameraError('No camera devices found');
          setHasPermission(false);
          return;
        }
      } catch (error) {
        console.log('Could not enumerate devices:', error);
      }

      setHasPermission(true);
      setCameraError(null);
    } catch (error) {
      console.error('Camera capability check failed:', error);
      setCameraError('Camera capability check failed');
      setHasPermission(false);
    }
  };

  const playSound = (type: 'success' | 'error') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;

      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      if (type === 'success') {
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(
          1000,
          audioContext.currentTime + 0.1
        );
      } else {
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      }

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.3
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Audio not supported:', error);
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

  const getOptimalCameraConstraints = (deviceId?: string) => {
    const baseConstraints = {
      audio: false,
      video: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        width: { min: 320, ideal: 1280, max: 1920 },
        height: { min: 240, ideal: 720, max: 1080 },
        aspectRatio: { ideal: 16 / 9 },
        frameRate: { ideal: 30, max: 60 },
      } as MediaTrackConstraints,
    };

    // Try environment camera first on mobile devices
    const isMobile =
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
    if (isMobile && !deviceId) {
      baseConstraints.video.facingMode = { ideal: 'environment' };
    }

    return baseConstraints;
  };

  const startCamera = async () => {
    setCameraError(null);
    setIsVideoReady(false);

    try {
      if (hasPermission === false) {
        setCameraError('Camera permission denied or not available');
        toast.error('Camera permission denied or not available');
        return;
      }

      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      console.log('Requesting camera access...');

      let stream: MediaStream | null = null;
      let lastError: Error | null = null;

      // Try different camera configurations in order of preference
      const attempts = [
        // 1. Try specific device if we have devices listed
        ...(cameraDevices.length > 0
          ? cameraDevices.map((device) =>
              getOptimalCameraConstraints(device.deviceId)
            )
          : []),

        // 2. Try environment camera (rear camera on mobile)
        {
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },

        // 3. Try user camera (front camera)
        {
          audio: false,
          video: {
            facingMode: { ideal: 'user' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },

        // 4. Try any camera with ideal settings
        {
          audio: false,
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },

        // 5. Try basic video constraints
        {
          audio: false,
          video: {
            width: { min: 320 },
            height: { min: 240 },
          },
        },

        // 6. Last resort - any video
        {
          audio: false,
          video: true,
        },
      ];

      for (let i = 0; i < attempts.length; i++) {
        try {
          console.log(
            `Trying camera configuration ${i + 1}/${attempts.length}...`
          );
          stream = await navigator.mediaDevices.getUserMedia(attempts[i]);
          if (stream) {
            console.log(`Camera configuration ${i + 1} successful`);
            break;
          }
        } catch (error: any) {
          console.log(
            `Camera configuration ${i + 1} failed:`,
            error.name,
            error.message
          );
          lastError = error;

          // If permission denied, don't try other configs
          if (error.name === 'NotAllowedError') {
            break;
          }
        }
      }

      if (!stream) {
        throw (
          lastError ||
          new Error('Failed to access camera with all configurations')
        );
      }

      if (!videoRef.current) {
        throw new Error('Video element not available');
      }

      const video = videoRef.current;
      video.srcObject = stream;
      streamRef.current = stream;

      // Handle video loading with better error handling
      const videoPromise = new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Video loading timeout'));
        }, 10000); // 10 second timeout

        const onLoadedMetadata = () => {
          clearTimeout(timeoutId);
          console.log('Video metadata loaded:', {
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            duration: video.duration,
          });

          video
            .play()
            .then(() => {
              console.log('Video playing successfully');
              setIsVideoReady(true);
              setIsScanning(true);

              // Start scanning with delay to ensure video is stable
              setTimeout(() => {
                scanIntervalRef.current = setInterval(scanQRCode, 300); // Faster scanning
              }, 1000);

              toast.success('Camera started - Ready to scan QR codes!');
              resolve();
            })
            .catch((playError) => {
              console.error('Error playing video:', playError);
              reject(playError);
            });
        };

        const onError = (error: any) => {
          clearTimeout(timeoutId);
          console.error('Video error:', error);
          reject(error);
        };

        video.addEventListener('loadedmetadata', onLoadedMetadata, {
          once: true,
        });
        video.addEventListener('error', onError, { once: true });
      });

      await videoPromise;
    } catch (error: any) {
      console.error('Error accessing camera:', error);

      let errorMessage = 'Failed to access camera';

      switch (error.name) {
        case 'NotAllowedError':
          errorMessage =
            'Camera access denied. Please allow camera permissions and try again.';
          break;
        case 'NotFoundError':
          errorMessage = 'No camera found on this device.';
          break;
        case 'NotReadableError':
          errorMessage = 'Camera is already in use by another application.';
          break;
        case 'OverconstrainedError':
          errorMessage = 'Camera settings not supported on this device.';
          break;
        case 'SecurityError':
          errorMessage =
            'Camera access blocked by security settings. Ensure you are using HTTPS.';
          break;
        case 'AbortError':
          errorMessage = 'Camera access was aborted.';
          break;
        default:
          if (error.message.includes('timeout')) {
            errorMessage = 'Camera initialization timed out. Please try again.';
          } else if (error.message.includes('not available')) {
            errorMessage = 'Camera not available on this device.';
          }
      }

      setCameraError(errorMessage);
      toast.error(errorMessage);
      setIsScanning(false);
      setIsVideoReady(false);

      // Clean up on error
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }
  };

  const stopCamera = () => {
    console.log('Stopping camera...');

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log('Track stopped:', track.kind, track.label);
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
    )
      return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (
      !context ||
      video.readyState !== video.HAVE_ENOUGH_DATA ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      return;
    }

    try {
      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get image data for QR processing
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      // Scan for QR codes with enhanced options
      const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert', // Try different inversion attempts for better detection
      });

      if (qrCode && qrCode.data) {
        console.log('QR Code detected:', qrCode.data);

        try {
          // Try to parse as JSON first (structured QR code)
          const qrData = JSON.parse(qrCode.data);

          if (
            qrData.type === 'EVENT_TICKET' &&
            qrData.ticketId &&
            qrData.eventId
          ) {
            // Prevent duplicate scans
            if (qrData.ticketId === lastScannedTicketId) {
              return;
            }

            // Validate event ID
            if (qrData.eventId !== eventId) {
              toast.error('This ticket is for a different event!');
              triggerErrorAnimation();
              playSound('error');
              return;
            }

            setLastScannedTicketId(qrData.ticketId);
            await validateScannedTicket(qrData.ticketId);

            // Clear last scanned ID after delay
            setTimeout(() => setLastScannedTicketId(''), 3000);
          } else {
            console.log('QR code format not recognized:', qrData);
          }
        } catch (parseError) {
          // If JSON parsing fails, treat as plain text ticket ID
          const ticketId = qrCode.data.trim();
          if (
            ticketId &&
            ticketId !== lastScannedTicketId &&
            ticketId.length > 3
          ) {
            console.log('Processing text-based ticket ID:', ticketId);
            setLastScannedTicketId(ticketId);
            await validateScannedTicket(ticketId);
            setTimeout(() => setLastScannedTicketId(''), 3000);
          }
        }
      }
    } catch (error) {
      console.error('Error scanning QR code:', error);
    }
  };

  const switchCamera = async () => {
    if (cameraDevices.length <= 1) return;

    const nextIndex = (currentDeviceIndex + 1) % cameraDevices.length;
    setCurrentDeviceIndex(nextIndex);

    if (isScanning) {
      stopCamera();
      setTimeout(startCamera, 500);
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

      // Dispatch custom event for external listeners
      const scanEvent = new CustomEvent('ticketScanned', {
        detail: scanResult,
      });
      window.dispatchEvent(scanEvent);

      if (onScanComplete) {
        onScanComplete(scanResult);
      }

      if (scanResult.success) {
        playSound('success');
        triggerSuccessAnimation();
        toast.success(
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <div>
              <div className="font-medium">✓ VALID TICKET</div>
              <div className="text-sm text-muted-foreground">
                {scanResult.ticket?.user.name} - Entry granted
              </div>
            </div>
          </div>,
          { duration: 4000 }
        );

        setManualTicketId('');
      } else {
        playSound('error');
        triggerErrorAnimation();
        toast.error(
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <div>
              <div className="font-medium">✗ INVALID TICKET</div>
              <div className="text-sm text-muted-foreground">
                {scanResult.message}
              </div>
            </div>
          </div>,
          { duration: 4000 }
        );
      }
    } catch (error) {
      console.error('Error validating ticket:', error);
      const errorResult = {
        success: false,
        message: 'Error validating ticket',
      };
      setScanResult(errorResult);

      playSound('error');
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

  useEffect(() => {
    return () => {
      stopCamera();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

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
          {/* Camera Error Alert */}
          {cameraError && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Camera Error:</strong> {cameraError}
                <div className="mt-2 text-sm">
                  <p>Try these solutions:</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>Ensure you are using HTTPS or localhost</li>
                    <li>Check browser camera permissions</li>
                    <li>Close other applications using the camera</li>
                    <li>Try refreshing the page</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
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

            {cameraDevices.length > 1 && (
              <Button onClick={switchCamera} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4" />
                Switch Camera
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

              {/* Loading indicator */}
              {!isVideoReady && (
                <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
                  <div className="text-white text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p>Starting camera...</p>
                  </div>
                </div>
              )}

              {/* Scanning overlay with QR code target */}
              {isVideoReady && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    <div
                      className={`w-48 h-48 border-2 border-dashed rounded-lg relative transition-all duration-300 ${
                        isProcessing
                          ? 'border-blue-500 bg-blue-500/20'
                          : 'border-white bg-black/20'
                      }`}
                    >
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

                    {!isProcessing && (
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white to-transparent animate-pulse"></div>
                    )}
                  </div>
                </div>
              )}

              {/* Processing overlay */}
              {isProcessing && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="bg-white p-4 rounded-lg animate-pulse">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                      <span>Validating ticket...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Success animation overlay */}
              {showSuccessAnimation && (
                <div className="absolute inset-0 bg-green-500 bg-opacity-20 flex items-center justify-center animate-pulse">
                  <div className="bg-green-500 text-white p-6 rounded-full animate-bounce">
                    <CheckCircle className="h-12 w-12" />
                  </div>
                </div>
              )}

              {/* Error animation overlay */}
              {showErrorAnimation && (
                <div className="absolute inset-0 bg-red-500 bg-opacity-20 flex items-center justify-center animate-pulse">
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
                      ? '✓ Ticket already used - Entry allowed'
                      : '✓ Valid ticket - Entry granted'}
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
                  ✗ {scanResult.message}
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
              • <strong>Audio Feedback:</strong> Listen for success (two beeps)
              or error (single beep) sounds
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
              to toggle between front/rear cameras
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
