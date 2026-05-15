import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { adminAPI, facilityAPI } from '@/services/api';
import { format } from 'date-fns';
import {
  Pill,
  ImageIcon,
  Mic,
  CheckCircle2,
  ScanLine,
  User,
  Calendar,
  ClipboardList,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';


/* ─── Loading skeleton ─────────────────────────────────────────────────────── */
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-blue-600 text-white py-4 px-4 shadow-md flex items-center gap-2">
        <ScanLine className="w-5 h-5" />
        <span className="font-bold text-lg">MedSignQR</span>
        <span className="text-xs opacity-75 ml-auto">Prescription Report</span>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-slate-500 text-sm font-medium">Loading your prescription…</p>
      </main>
    </div>
  );
}

/* ─── Error state ──────────────────────────────────────────────────────────── */
function ErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-blue-600 text-white py-4 px-4 shadow-md flex items-center gap-2">
        <ScanLine className="w-5 h-5" />
        <span className="font-bold text-lg">MedSignQR</span>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Prescription Not Found</h2>
        <p className="text-sm text-slate-500 max-w-xs">{message}</p>
      </main>
    </div>
  );
}

/* ─── Main component ───────────────────────────────────────────────────────── */
export default function MedicineReport() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const [rx, setRx] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!id) {
      setError('No prescription ID provided.');
      setLoading(false);
      return;
    }
    const decryptId = async (id: string) => {
      const result = await adminAPI.decryptId(id);
      if (result.success && result.decryptedId) {
          if (result.decryptedId.qr_id == null) {
            toast({
              title: 'No Prescription Found',
              description: `Incomplete QR code. Please check the QR code and try again.`,
            });
            navigate(`/medical/facility/scanner`);
          } else {
            const medId = result.decryptedId.qr_id;
            return medId;
          }
      } else {
        toast({
          title: 'Decryption Failed',
          description: result.message || 'Could not decrypt the QR code. Please try again.',
          variant: 'destructive',
        });
      }
    };

    decryptId(id).then((medId) => {
      facilityAPI
      .fetchPrescriptionByMedicineId(medId)
      .then((res) => {
        // console.log('API response:', res);
        if (res.success) {
          setRx(res.prescription[0]);         
        } else {
          setError('We could not find a prescription linked to this QR code.');
        }
      })
      .catch(() => setError('Something went wrong. Please try again or contact your clinic.'))
      .finally(() => setLoading(false));
        }
    );
      
  }, [id]);
  
  useEffect(() =>{
    if (!rx?.imageFileId) return;

    const fetchImage = async () => {
    try {
      if (rx?.imageFileId) {
        const file = await facilityAPI.getFileSignedUrl(rx.imageFileId);
        const imageSignedUrl = file.signedUrl;
        // console.log("Fetched image signed URL:", imageSignedUrl);
        setImageUrl(`${import.meta.env.VITE_DATACUBE_DOMAIN}${imageSignedUrl}`);
      }
    } catch (error) {
      console.error("Error fetching image:", error);
    }
  };

  fetchImage();
  }, [rx?.imageFileId]);

  useEffect(() =>{
    if (!rx?.audioFileId) return;

    const fetchAudio = async () => {
    try {
      if (rx?.audioFileId) {
        const file = await facilityAPI.getFileSignedUrl(rx.audioFileId);
        const audioSignedUrl = file.signedUrl;
        // console.log("Fetched audio signed URL:", audioSignedUrl);
        setAudioUrl(`${import.meta.env.VITE_DATACUBE_DOMAIN}${audioSignedUrl}`);
      }
    } catch (error) {
      console.error("Error fetching audio:", error);
    }
  };

  fetchAudio();
  }, [rx?.audioFileId]);

  if (loading) return <LoadingSkeleton />;
  if (error || !rx) return <ErrorState message={error || 'Prescription not found.'} />;

  const prescribedDate = rx.localtime ? format(new Date(rx.localtime), 'MMMM d, yyyy') : null;
  const med = rx;
  const hasImage = !!med.imageFileId;
  const hasAudio = !!med.audioFileId;
  
  // The prescription object is flat — it IS the medicine entry


  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* ── Header ── */}
      <header className="bg-blue-600 text-white py-4 px-4 shadow-md">
        <div className="max-w-lg mx-auto flex items-center gap-2">
          <ScanLine className="w-5 h-5" />
          <span className="font-bold text-lg tracking-tight">MedSignQR</span>
          <span className="text-xs opacity-75 ml-auto">Prescription Report</span>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-5 pb-12">

        {/* ── Status banner ── */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Verified Prescription</p>
            <p className="text-xs text-emerald-600 mt-0.5">This prescription has been finalised by your doctor</p>
          </div>
        </div>

        {/* ── Patient & date info ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Patient Details</h2>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{rx.patientId}</p>
              <p className="text-xs text-slate-400">Patient ID</p>
            </div>
          </div>
          {prescribedDate && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{prescribedDate}</p>
                <p className="text-xs text-slate-400">Date Prescribed</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Medicine details ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Prescribed Medicine</h2>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
              <Pill className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900 leading-tight">{med.name}</p>
              <p className="text-sm font-semibold text-blue-600 mt-0.5">{med.dosage}</p>
            </div>
          </div>

          {med.notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2">
              <ClipboardList className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-700 mb-1">Doctor's Notes</p>
                <p className="text-sm text-amber-900 leading-relaxed">{med.notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Medicine image ── */}
        {hasImage && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
              <ImageIcon className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-700">Medicine Reference Image</h2>
            </div>
            <img
              src={imageUrl}
              alt={`${med.name} reference`}
              className="w-full object-cover max-h-72"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).closest('div')!.style.display = 'none';
              }}
            />
            <p className="text-xs text-slate-400 text-center py-2 px-4">
              Use this image to identify your medicine at the pharmacy
            </p>
          </div>
        )}

        {/* ── Audio instructions ── */}
        {hasAudio && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <Mic className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-700">Doctor's Voice Instructions</h2>
                <p className="text-xs text-slate-400">Tap play to hear your doctor's instructions</p>
              </div>
            </div>
            <audio
              controls
              controlsList="nodownload"
              className="w-full rounded-lg"
              src={audioUrl}
              style={{ height: '48px' }}
            >
              Your browser does not support audio playback.
            </audio>
          </div>
        )}

        {/* Fallback if file IDs exist but signed URLs failed to resolve */}
        {!hasImage && med.imageFileId && (
          <div className="bg-slate-100 rounded-2xl p-4 flex items-center gap-3 text-slate-500">
            <ImageIcon className="w-5 h-5 shrink-0" />
            <p className="text-sm">Medicine image could not be loaded. Contact your clinic.</p>
          </div>
        )}
        {!hasAudio && med.audioFileId && (
          <div className="bg-slate-100 rounded-2xl p-4 flex items-center gap-3 text-slate-500">
            <Mic className="w-5 h-5 shrink-0" />
            <p className="text-sm">Audio instructions could not be loaded. Contact your clinic.</p>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="pt-2 border-t border-slate-200 text-center space-y-1">
          <p className="text-xs text-slate-400 font-medium">Generated by MedSignQR</p>
          <p className="text-xs text-slate-400">
            For questions about this prescription, contact your healthcare provider directly.
          </p>
        </div>
      </main>
    </div>
  );
}
