'use client';

import { useState, useRef, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
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
  SwitchCamera,
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

// Interface for detected barcode from the scanner
interface IDetectedBarcode {
  rawValue: string;
  format: string;
  [key: string]: any;
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
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>(
    'environment'
  );

  const audioContextRef = useRef<AudioContext | null>(null);

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

  // Handle QR code scan results - Updated to handle IDetectedBarcode[] array
  const handleQRScan = async (detectedCodes: IDetectedBarcode[]) => {
    if (!detectedCodes || detectedCodes.length === 0 || isProcessing) return;

    // Get the raw value from the first detected barcode
    const result = detectedCodes[0]?.rawValue;
    if (!result) return;

    try {
      // Try to parse as JSON first
      const qrData = JSON.parse(result);

      if (qrData.type === 'EVENT_TICKET' && qrData.ticketId && qrData.eventId) {
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

        // Clear the last scanned ID after a delay to allow rescanning
        setTimeout(() => setLastScannedTicketId(''), 3000);
      } else {
        console.log('QR code format not recognized:', qrData);
        setCameraError('Invalid QR code format for event tickets');
      }
    } catch (parseError) {
      // If not JSON, treat as plain text ticket ID
      const ticketId = result.trim();
      if (ticketId && ticketId !== lastScannedTicketId && ticketId.length > 3) {
        console.log('Processing text-based ticket ID:', ticketId);
        setLastScannedTicketId(ticketId);
        await validateScannedTicket(ticketId);
        setTimeout(() => setLastScannedTicketId(''), 3000);
      }
    }
  };

  // Handle QR scanner errors
  const handleQRError = (error: any) => {
    console.error('QR Scanner Error:', error);
    setCameraError(
      'Failed to scan QR code. Please ensure proper lighting and try again.'
    );
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

  const startScanning = () => {
    setCameraError(null);
    setIsScanning(true);
    toast.success('Camera started - Ready to scan QR codes!');
  };

  const stopScanning = () => {
    setIsScanning(false);
    toast.info('Scanner stopped');
  };

  const switchCamera = () => {
    const newFacingMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacingMode);
    toast.info(
      `Switched to ${newFacingMode === 'environment' ? 'back' : 'front'} camera`
    );
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
                <strong>Scanner Error:</strong> {cameraError}
              </AlertDescription>
            </Alert>
          )}

          {/* Camera Controls */}
          <div className="flex gap-2">
            {!isScanning ? (
              <Button onClick={startScanning} className="flex-1">
                <Camera className="mr-2 h-4 w-4" />
                Start QR Scanner
              </Button>
            ) : (
              <>
                <Button
                  onClick={stopScanning}
                  variant="outline"
                  className="flex-1"
                >
                  <X className="mr-2 h-4 w-4" />
                  Stop Scanner
                </Button>
                <Button onClick={switchCamera} variant="outline" size="sm">
                  <SwitchCamera className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button onClick={resetScanner} variant="outline">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* QR Scanner View */}
          {isScanning && (
            <div className="relative">
              <div
                className="rounded-lg overflow-hidden bg-black"
                style={{ height: '300px' }}
              >
                <Scanner
                  onScan={handleQRScan}
                  onError={handleQRError}
                  constraints={{
                    facingMode: facingMode,
                    aspectRatio: 1,
                  }}
                />
              </div>

              {/* Scanning overlay with QR code target */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative">
                  <div
                    className={`w-48 h-48 border-2 border-dashed rounded-lg relative transition-all duration-300 ${
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

                  {/* Scanning animation line */}
                  {!isProcessing && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white to-transparent animate-pulse"></div>
                  )}
                </div>
              </div>

              {/* Camera info */}
              <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                {facingMode === 'environment' ? 'Back Camera' : 'Front Camera'}
              </div>

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
              • <strong>Camera Switching:</strong> Use the camera switch button
              to toggle between front and back cameras
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
