import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Save,
  CheckCircle,
  Loader2,
  ArrowLeft,
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  LogOut,
  Pill,
  ChevronRight
} from 'lucide-react';

/** * MOCK SERVICES & COMPONENTS 
 * These replace external dependencies to ensure the file is self-contained.
 */
const facilityAPI = {
  fetchPrescriptions: async (patientId) => {
    // Mocking an API delay and response
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          prescriptions: [{
            patientId: patientId,
            status: 'DRAFT',
            medicines: [{
              medId: 'M123',
              name: 'Paracetamol',
              dosage: '500mg',
              notes: 'Take after food',
              imageUrl: '',
              audioUrl: ''
            }]
          }]
        });
      }, 500);
    });
  },
  createPrescription: async (patientId, medicines, status) => {
    return { success: true, id: 'RX' + Math.floor(Math.random() * 1000) };
  }
};

const Layout = ({ children }) => (
  <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
    <div className="max-w-2xl mx-auto">{children}</div>
  </div>
);

const MedicineEntry = ({ data, onChange }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
    <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
      <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
        <Pill className="w-5 h-5" />
      </div>
      <span className="font-bold text-slate-800">Medicine Details</span>
    </div>
    <div className="space-y-3">
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase">Medicine Name</label>
        <input
          className="w-full mt-1 p-2 border border-slate-200 rounded-lg"
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          placeholder="e.g. Amoxicillin"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase">Dosage</label>
        <input
          className="w-full mt-1 p-2 border border-slate-200 rounded-lg"
          value={data.dosage}
          onChange={(e) => onChange({ ...data, dosage: e.target.value })}
          placeholder="e.g. 500mg twice daily"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase">Notes</label>
        <textarea
          className="w-full mt-1 p-2 border border-slate-200 rounded-lg"
          value={data.notes}
          onChange={(e) => onChange({ ...data, notes: e.target.value })}
          placeholder="Special instructions..."
        />
      </div>
    </div>
  </div>
);

// UI Components
const Input = ({ ...props }) => <input {...props} className={`w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${props.className}`} />;
const Button = ({ children, variant, className, disabled, onClick }) => {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    emerald: "bg-emerald-600 text-white hover:bg-emerald-700",
    destructive: "border border-red-200 text-red-600 hover:bg-red-50"
  };
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${variants[variant] || variants.primary} ${className}`}
    >
      {children}
    </button>
  );
};

const Dialog = ({ open, children }) => open ? <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">{children}</div> : null;

/**
 * MAIN COMPONENT
 */
interface MedicineFormData {
  medId: string;
  name: string;
  dosage: string;
  imageUrl: string;
  audioUrl: string;
  notes: string;
}

const emptyMedicine = (): MedicineFormData => ({ medId: '', name: '', dosage: '', imageUrl: '', audioUrl: '', notes: '' });

const STATUTORY_WARNING_ITEMS = [
  'Patient Identity: Matches the intended recipient.',
  'Clinical Intent: Dosage and Frequency are medically accurate.',
  'Compliance: This audio matches signed/stamped prescription as per NMC guidelines.',
  'Support Tool: I understand this AI-voice supplements, but does not replace, the official written prescription.',
];

const DISPENSING_NOTICE = `⚠️ Dispensing Notice: Audio Instructions
The patient is using a QR code to access the clinician's voice instructions.
Please ensure the audio instructions match the Doctor's physical prescription.`;

export default function PrescriptionForm() {
  const { medId } = useParams<{ medId: string }>();
  // FIX 1: Corrected isEdit logic. It should be true IF medId exists.
  const isEdit = !!medId;

  const navigate = useNavigate();
  const location = useLocation();

  const [patientId, setPatientId] = useState('');
  const [medicine, setMedicine] = useState<MedicineFormData>(emptyMedicine());
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  // Audio & Dialog States
  const [statutoryAgreed, setStatutoryAgreed] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioConfirmed, setAudioConfirmed] = useState(false);
  const [showDispensingDialog, setShowDispensingDialog] = useState(false);
  const [dispensingAgreed, setDispensingAgreed] = useState(false);
  const [pendingFinalize, setPendingFinalize] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const state = location.state as any;
    if (state?.scannedMedicine) {
      setMedicine({ ...emptyMedicine(), ...state.scannedMedicine });
    }
    if (state?.patientId) {
      setPatientId(state.patientId);
    }
  }, [location.state]);

  // Load existing prescription
  useEffect(() => {
    if (!isEdit || !medId) return;

    facilityAPI.fetchPrescriptions(patientId)
      .then((res) => {
        if (res.success && res.prescriptions?.length) {
          const rx = res.prescriptions[0];
          setPatientId(rx.patientId);
          // FIX 2: Correctly set the single medicine object instead of mapping to an array
          const m = rx.medicines[0];
          if (m) {
            setMedicine({
              medId: m.medId || '',
              name: m.name || '',
              dosage: m.dosage || '',
              imageUrl: m.imageUrl || '',
              audioUrl: m.audioUrl || '',
              notes: m.notes || ''
            });
          }
        }
      })
      .finally(() => setLoading(false));
  }, [medId, isEdit]);

  const handleSave = async (finalize: boolean) => {
    if (!patientId.trim() || !medicine.name.trim()) {
      return;
    }

    if (!dispensingAgreed && finalize) {
      setPendingFinalize(finalize);
      setShowDispensingDialog(true);
      return;
    }

    setSaving(true);
    try {
      const status = finalize ? 'FINALIZED' : 'DRAFT';
      const medicines = [medicine];

      let response;
      if (isEdit) {
        // response = await updatePrescription(medId, { medicines, status, patientId: patientId.trim() });
      } else {
        response = await facilityAPI.createPrescription(patientId.trim(), medicines, status);
      }

      // FIX 3: Use the patientId from the actual current state to ensure the URL is correct
      // and use the medId from the response if available, or the current state
      const targetMedId = response?.id || medId || 'NEW';
      const targetPatientId = patientId.trim();

      if (finalize) {
        navigate(`/medical/prescriptions/${targetPatientId}/${targetMedId}`, { state: { justFinalized: true } });
      } else {
        navigate('/medical/dashboard');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDispensingAgreeAndSave = () => {
    setDispensingAgreed(true);
    setShowDispensingDialog(false);
    setTimeout(() => handleSave(pendingFinalize), 100);
  };

  if (loading) return <Layout><div className="animate-pulse space-y-4"><div className="h-8 bg-slate-200 w-1/3 rounded" /><div className="h-48 bg-slate-200 rounded" /></div></Layout>;

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-full transition-all">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{isEdit ? 'Edit Prescription' : 'New Prescription'}</h1>
            <p className="text-sm text-slate-500">Facility: CareCentral API</p>
          </div>
        </div>

        {/* Patient ID */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Patient Identifier *</label>
          <Input
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            className="font-mono text-lg"
            placeholder="e.g. PAT-99201"
          />
        </div>

        {/* Medicine Entry */}
        <div className="space-y-3">
          <MedicineEntry data={medicine} onChange={setMedicine} />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-10">
          <Button variant="outline" className="py-4" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? <Loader2 className="animate-spin w-5 h-5" /> : <><Save className="w-5 h-5" /> Save as Draft</>}
          </Button>
          <Button variant="emerald" className="py-4" onClick={() => handleSave(true)} disabled={saving}>
            {saving ? <Loader2 className="animate-spin w-5 h-5" /> : <><CheckCircle className="w-5 h-5" /> Finalize Prescription</>}
          </Button>
        </div>
      </div>

      <Dialog open={showDispensingDialog}>
        <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 border border-slate-100">
          <div className="bg-amber-100 w-12 h-12 rounded-2xl flex items-center justify-center text-amber-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Dispensing Notice</h3>
            <p className="text-sm text-slate-500 mt-1">Please confirm you have verified the prescription details.</p>
          </div>
          <div className="text-xs p-4 bg-amber-50 rounded-xl text-amber-800 font-medium leading-relaxed border border-amber-100">
            {DISPENSING_NOTICE}
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="emerald" onClick={handleDispensingAgreeAndSave} className="w-full py-3">
              I Agree & Proceed
            </Button>
            <button onClick={() => setShowDispensingDialog(false)} className="text-sm text-slate-400 font-medium hover:text-slate-600 transition-colors py-2">
              Cancel
            </button>
          </div>
        </div>
      </Dialog>
    </Layout>
  );
}