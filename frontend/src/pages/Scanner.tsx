import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ScanLine, Keyboard, Loader2, Camera, AlertCircle } from 'lucide-react';
import { adminAPI } from '@/services/api';

export default function Scanner() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [manualUrl, setManualUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrRef = useRef<any>(null);
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
  if (mode !== 'camera' || cameraError) return;

  let mounted = true;
  let isScannerRunning = false;
  
  const startScanner = async () => {
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      if (!mounted || !scannerRef.current) return;

      const scanner = new Html5Qrcode('qr-reader');
      html5QrRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          if (!isScannerRunning) return;

          isScannerRunning = false;

          try {
            await scanner.stop();
          } catch {}

          handleScan(decodedText);
        },
        () => {}
      );

      isScannerRunning = true;

    } catch {
      if (mounted) setCameraError(true);
    }
  };

  startScanner();

  return () => {
    mounted = false;

    if (html5QrRef.current && isScannerRunning) {
      html5QrRef.current.stop().catch(() => {});
      isScannerRunning = false;
    }
  };
}, [mode, cameraError]);


  const handleScan = async (scannedValue: string) => {
    setLoading(true);
    // QR code contains a URL like http://localhost:3000/patient/
    // Extract and navigate to the patient lookup page
    try {
      const url = new URL(scannedValue);
      console.log(scannedValue)
      
      const id = new URL(scannedValue).searchParams.get('id');
      sessionStorage.setItem('scannedId', id);
      const result = await adminAPI.decryptId(id);
      if (result.success && result.decryptedId) {
        setStatus('Checking prescription status...');
        
        if (result.decryptedId.qr_id == null) {
          toast({
            title: 'No Prescription Found',
            description: `Incomplete QR code. Please check the QR code and try again.`,
          });
          navigate(`/facility/scanner`);
        } else {
          const medId = result.decryptedId.qr_id;
          console.log("This is the decrypted QR ID:", medId);
          sessionStorage.setItem('medId', medId);
          toast({ title: 'QR Scanned', description: 'Redirecting to patient lookup...' });
          navigate(`/facility/patients/${medId}`);
        }
      } else {
        toast({
          title: 'Decryption Failed',
          description: result.message || 'Could not decrypt the QR code. Please try again.',
          variant: 'destructive',
        });
      }
        
    } catch {
      // If not a valid URL, still navigate to patients
      toast({ title: 'QR Scanned', description: 'Redirecting to patient lookup...' });
      navigate('/facility/patients');
    }
    setLoading(false);
  };

  const handleManualSubmit = () => {
    if (!manualUrl.trim()) return;
    handleScan(manualUrl.trim());
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">Scan Medicine QR</h1>
          <p className="text-sm text-muted-foreground">Point camera at a medicine QR code</p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2">
          <Button variant={mode === 'camera' ? 'default' : 'outline'} size="sm" onClick={() => { setMode('camera'); setCameraError(false); }}>
            <Camera className="w-4 h-4 mr-1" /> Camera
          </Button>
          <Button variant={mode === 'manual' ? 'default' : 'outline'} size="sm" onClick={() => setMode('manual')}>
            <Keyboard className="w-4 h-4 mr-1" /> Manual
          </Button>
        </div>

        {mode === 'camera' ? (
          <div className="glass-card rounded-xl overflow-hidden">
            {cameraError ? (
              <div className="p-8 text-center space-y-3">
                <AlertCircle className="w-10 h-10 mx-auto text-warning" />
                <p className="text-sm text-muted-foreground">Camera not available in this environment</p>
                <Button variant="outline" size="sm" onClick={() => setMode('manual')}>
                  <Keyboard className="w-4 h-4 mr-1" /> Use Manual Entry
                </Button>
              </div>
            ) : (
              <div>
                <div id="qr-reader" ref={scannerRef} className="w-full" />
                <div className="p-3 text-center text-xs text-muted-foreground">
                  <ScanLine className="w-4 h-4 inline mr-1 animate-pulse-soft" />
                  Scanning...
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="glass-card rounded-xl p-6 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">QR Code URL</label>
              <Input
                placeholder="e.g. http://medisignqr.uxlivinglab.org/patient/"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                className="h-12 text-base"
                onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
              />
              <p className="text-xs text-muted-foreground mt-1">Enter the URL from the medicine QR code</p>
            </div>
            <Button onClick={handleManualSubmit} disabled={!manualUrl.trim() || loading} className="w-full h-11 font-semibold">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Proceed to Patient Lookup</>}
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
