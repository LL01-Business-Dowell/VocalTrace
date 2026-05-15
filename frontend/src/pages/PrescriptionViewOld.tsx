import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { facilityAPI } from '@/services/api';
import Layout from '@/components/Layout';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft,
  CheckCircle2,
  Pill,
  ImageIcon,
  Mic,
  QrCode,
  Clipboard,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const DATACUBE_BASE_URL = 'https://datacube.uxlivinglab.online';

export default function PrescriptionView() {
  const { patientId, medId } = useParams<{ patientId: string; medId: string }>();
  const navigate = useNavigate();

  const [rx, setRx] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [retryMessage, setRetryMessage] = useState('');

  // The URL the QR code encodes — points to the public patient-facing MedicineReport page
  const reportUrl = patientId
    ? `${window.location.origin}/medical/medicine-report/${patientId}`
    : '';

  useEffect(() => {
    if (!patientId) {
      setError('No patient ID provided.');
      setLoading(false);
      return;
    }

    // The prescription is written to DataCube asynchronously via Kafka.
    // Poll with retries to give the consumer time to process before showing an error.
    const MAX_RETRIES = 8;
    const RETRY_INTERVAL_MS = 2500;
    let attempt = 0;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await facilityAPI.fetchPrescriptions(patientId);
        if (cancelled) return;
        if (res.success && res.prescriptions?.length) {
          setRx(res.prescriptions[0]);
          setLoading(false);
          setRetryMessage('');
          return;
        }
      } catch {
        // network error — keep retrying
      }

      if (cancelled) return;
      attempt += 1;

      if (attempt >= MAX_RETRIES) {
        setError('Prescription could not be loaded. It may still be processing — please refresh in a moment.');
        setLoading(false);
        return;
      }

      setRetryMessage(`Saving prescription, please wait… (${attempt}/${MAX_RETRIES})`);
      setTimeout(poll, RETRY_INTERVAL_MS);
    };

    poll();
    return () => { cancelled = true; };
  }, [patientId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportUrl);
    } catch {
      const el = document.createElement('textarea');
      el.value = reportUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
          {retryMessage && (
            <div className="flex items-center gap-2 text-sm text-slate-500 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-blue-500 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              <span>{retryMessage}</span>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  if (error || !rx) {
    return (
      <Layout>
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
          <p className="text-slate-500 mb-4">{error || 'Prescription data could not be retrieved.'}</p>
          <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </Layout>
    );
  }

  const medicines = Array.isArray(rx.medicines) && rx.medicines.length > 0
    ? rx.medicines  // future-proof if backend ever nests medicines
    : [rx];         // current flat structure — the prescription IS the medicine entry

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-slate-200"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Prescription Details</h1>
            <p className="text-sm text-slate-500">Patient: {rx.patientId}</p>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Status</div>
            <span
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold w-fit ${
                rx.status === 'DRAFT'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {rx.status === 'DRAFT' ? (
                <Clock className="w-3 h-3" />
              ) : (
                <CheckCircle2 className="w-3 h-3" />
              )}
              {rx.status}
            </span>
          </div>
          <div className="text-right">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Patient ID</div>
            <div className="text-sm font-mono font-medium text-slate-700">{rx.patientId}</div>
          </div>
        </div>

        {/* QR Code — only for FINALIZED prescriptions */}
        {rx.status === 'FINALIZED' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm space-y-4">
            <div className="flex items-center justify-center gap-2">
              <QrCode className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-semibold text-slate-700">Scan to View Report</span>
            </div>

            <div className="flex justify-center">
              <QRCodeSVG
                value={reportUrl}
                size={200}
                bgColor="#ffffff"
                fgColor="#1e293b"
                level="M"
                includeMargin
              />
            </div>

            <p className="text-xs text-slate-500 max-w-[240px] mx-auto">
              Patient can scan this to view their prescription and hear audio instructions.
            </p>

            <div className="bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-500 font-mono break-all text-left">
              {reportUrl}
            </div>

            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy} className="text-xs">
                <Clipboard className="w-3 h-3 mr-1" />
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
              <Button
                size="sm"
                className="text-xs"
                onClick={() => window.open(reportUrl, '_blank')}
              >
                Open Report
              </Button>
            </div>
          </div>
        )}

        {/* Medicines */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-bold text-slate-800">Medicines</h2>
            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">
              {medicines.length}
            </span>
          </div>

          {medicines.map((med: any, index: number) => (
            <div
              key={med.medId || index}
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3"
            >
              <div className="flex items-center gap-2">
                <div className="bg-blue-50 p-2 rounded-lg">
                  <Pill className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{med.name}</h3>
                  <p className="text-sm font-medium text-blue-600">{med.dosage}</p>
                </div>
              </div>

              {med.notes && (
                <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600 border border-slate-100">
                  {med.notes}
                </div>
              )}

              {med.imageSignedUrl && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs text-primary font-medium">
                    <ImageIcon className="w-3 h-3" /> Reference Image
                  </div>
                  <img
                    src={`${DATACUBE_BASE_URL}${med.imageSignedUrl}`}
                    alt={`${med.name} reference`}
                    className="w-full rounded-lg border border-border object-cover max-h-48"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              {med.audioSignedUrl && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs text-primary font-medium">
                    <Mic className="w-3 h-3" /> Audio Instructions
                  </div>
                  <audio controls className="w-full" src={`${DATACUBE_BASE_URL}${med.audioSignedUrl}`}>
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}

              {!med.imageSignedUrl && med.imageFileId && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <ImageIcon className="w-4 h-4" /> Image attached
                </div>
              )}
              {!med.audioSignedUrl && med.audioFileId && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <Mic className="w-4 h-4" /> Audio guide attached
                </div>
              )}
            </div>
          ))}

          {medicines.length === 0 && (
            <div className="text-center py-8 text-slate-400 italic text-sm">
              No medicines prescribed.
            </div>
          )}
        </div>

        <Button variant="outline" className="w-full py-3" onClick={() => navigate('/medical/dashboard')}>
          Return to Dashboard
        </Button>
      </div>
    </Layout>
  );
}
