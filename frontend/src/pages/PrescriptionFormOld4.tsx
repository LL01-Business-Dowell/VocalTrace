import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { facilityAPI } from '@/services/api';
import { ImageUploader } from '@/components/ImageUploader';
import { Label } from '@/components/ui/label';


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
    Pill
} from 'lucide-react';

const Layout = ({ children }) => (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
        <div className="max-w-2xl mx-auto pb-20">{children}</div>
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
                <label className="text-xs font-semibold text-slate-500 uppercase">Medicine Name *</label>
                <input
                    className="w-full mt-1 p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    value={data.name}
                    onChange={(e) => onChange({ ...data, name: e.target.value })}
                    placeholder="e.g. Amoxicillin"
                />
            </div>
            <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Dosage *</label>
                <input
                    className="w-full mt-1 p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    value={data.dosage}
                    onChange={(e) => onChange({ ...data, dosage: e.target.value })}
                    placeholder="e.g. 500mg twice daily"
                />
            </div>
            <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Notes</label>
                <textarea
                    className="w-full mt-1 p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                    value={data.notes}
                    onChange={(e) => onChange({ ...data, notes: e.target.value })}
                    placeholder="Special instructions for the patient..."
                />
            </div>
        </div>
    </div>
);

// UI Components
const Input = ({ ...props }) => <input {...props} className={`w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${props.className}`} />;
const Button = ({ children, variant, className, disabled, onClick }) => {
    const variants = {
        primary: "bg-blue-600 text-white hover:bg-blue-700",
        outline: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
        emerald: "bg-emerald-600 text-white hover:bg-emerald-700",
        destructive: "border border-red-200 text-red-600 hover:bg-red-50",
        ghost: "hover:bg-slate-100 text-slate-600"
    };
    return (
        <button
            disabled={disabled}
            onClick={onClick}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant] || variants.primary} ${className}`}
        >
            {children}
        </button>
    );
};

const Checkbox = ({ id, checked, onCheckedChange, disabled, className }) => (
    <input
        type="checkbox"
        id={id}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className={`w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 ${className}`}
    />
);

const Dialog = ({ open, children }) => open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-100 animate-in zoom-in-95 duration-200">
            {children}
        </div>
    </div>
) : null;

/**
 * MAIN COMPONENT
 */
interface MedicineFormData {
    medId: string;
    name: string;
    dosage: string;
    imageUrl: string;
    imageFileId?: string;
    imageBlob?: string;
    audioFileId?: string;
    audioBlob?: string;
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

Action Required: Please ensure the audio instructions match the Doctor's physical prescription and the medication packaging.

Legal Authority: In case of any discrepancy, the signed/stamped prescription is the final authority. Report errors via the "Safety Flag" button.

I verify that the Patient Identity, Dosage, and Frequency are correct. I confirm this audio matches the doctor's signed/stamped prescription as per National Medical Commission guidelines. I understand this is a patient-aid tool only.`;

export default function PrescriptionForm() {
    const { medId: urlMedId } = useParams<{ medId: string }>();
    // FIX: Correct isEdit logic (Edit if we have a medId)
    const isEdit = !!urlMedId;

    const navigate = useNavigate();
    const location = useLocation();

    const [patientId, setPatientId] = useState('');
    const [medicine, setMedicine] = useState<MedicineFormData>(emptyMedicine());
    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);

    // Audio recording state
    const [statutoryAgreed, setStatutoryAgreed] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string>('');
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioConfirmed, setAudioConfirmed] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
    const [imageBlob, setImageBlob] = useState<Blob | null>(null);

    // Dispensing notice state
    const [showDispensingDialog, setShowDispensingDialog] = useState(false);
    const [dispensingAgreed, setDispensingAgreed] = useState(false);
    const [pendingFinalize, setPendingFinalize] = useState(false);

    // Pre-fill from navigation state
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
        if (!isEdit || !urlMedId) return;

        // Simulate loading
        if (patientId != "") {
            facilityAPI.fetchPrescriptions(patientId)
                .then((res) => {
                    if (res.success && res.prescriptions?.length) {
                        const rx = res.prescriptions[0];
                        setPatientId(rx.patientId);
                        const m = rx.medicines[0];
                        if (m) {
                            setMedicine({
                                medId: m.medId || '',
                                name: m.name || '',
                                dosage: m.dosage || '',
                                imageUrl: m.imageUrl || '',
                                imageFileId: m.imageFileId || '',
                                audioFileId: m.audioFileId || '',
                                audioUrl: m.audioUrl || '',
                                notes: m.notes || ''
                            });
                            if (m.audioUrl) {
                                setAudioConfirmed(true);
                                setStatutoryAgreed(true);
                            }
                        }
                    }
                })
                .finally(() => setLoading(false));

        } else {
            setMedicine({
                medId: '',
                name: '',
                dosage: '',
                imageUrl: '',
                audioUrl: '',
                notes: ''
            });
            setLoading(false);
        }


    }, [urlMedId]);

    // Cleanup audio URLs
    useEffect(() => {
        return () => {
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    const validate = (): string | null => {
        if (!patientId.trim()) return 'Patient ID is required';
        if (!medicine.name.trim()) return 'Medicine name is required';
        if (!medicine.dosage.trim()) return 'Dosage is required';
        return null;
    };

    // --- Audio Recording Logic ---
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
                stream.getTracks().forEach((t) => t.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Mic access denied", err);
        }
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    };

    const handleReRecord = () => {
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioBlob(null);
        setAudioUrl('');
        setIsPlaying(false);
        setAudioConfirmed(false);
    };

    const handleConfirmAudio = () => {
        setAudioConfirmed(true);
        setMedicine((prev) => ({ ...prev, audioUrl: `audio_confirmed_${Date.now()}.webm`, audioBlob: audioBlob }));
    };

    const togglePlayback = () => {
        if (!audioPlayerRef.current) return;
        if (isPlaying) {
            audioPlayerRef.current.pause();
        } else {
            audioPlayerRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    // --- Save / Finalize ---
    // Inner save — called directly after dispensing dialog is confirmed, bypassing the guard
    const executeSave = async (finalize: boolean) => {
        setSaving(true);
        try {
            const status = finalize ? 'FINALIZED' : 'DRAFT';
            medicine.imageBlob = imageBlob;
            const medicines = [medicine];
            const response = await facilityAPI.createPrescription(patientId.trim(), medicines, status);
            const targetMedId = response?.id || urlMedId || 'NEW';
            const targetPatientId = patientId.trim();
            if (finalize) {
                navigate(`/medical/prescriptions/${targetPatientId}/${targetMedId}`, { state: { justFinalized: true } });
            } else {
                navigate('/medical/dashboard');
            }
        } catch (err) {
            console.error('Save failed', err);
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async (finalize: boolean) => {
        const err = validate();
        if (err) return;

        if (!dispensingAgreed && finalize) {
            setPendingFinalize(finalize);
            setShowDispensingDialog(true);
            return;
        }

        executeSave(finalize);
    };

    const handleDispensingAgreeAndSave = () => {
        setDispensingAgreed(true);
        setShowDispensingDialog(false);
        // Call executeSave directly — avoids relying on stale dispensingAgreed state
        executeSave(pendingFinalize);
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
                        <p className="text-sm text-slate-500">{isEdit ? 'Update draft prescription' : 'Create a new patient record'}</p>
                    </div>
                </div>

                {/* Patient ID Section */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Patient Identifier *</label>
                    <Input
                        value={patientId}
                        onChange={(e) => setPatientId(e.target.value)}
                        className="font-mono text-lg"
                        placeholder="e.g. PAT-001"
                        maxLength={20}
                    />
                </div>

                {/* Medicine Section */}
                <div className="space-y-3">
                    <h2 className="text-base font-semibold text-slate-800">Medication</h2>
                    <MedicineEntry data={medicine} onChange={setMedicine} />
                </div>
                <div>
                    <Label className="mb-2 block">Medicine Image (Optional)</Label>
                    <ImageUploader
                        existingImageBlob={imageBlob || undefined}
                        onImageSelected={setImageBlob}
                    />
                </div>
                {/* Audio Recording Section */}
                <div className="space-y-4">
                    <h2 className="text-base font-semibold flex items-center gap-2 text-slate-800">
                        <Mic className="w-4 h-4 text-blue-600" /> Audio Instructions
                    </h2>

                    {/* Statutory Warning Checklist */}
                    <div className="rounded-2xl border-2 border-amber-500/30 bg-amber-50/50 p-5 space-y-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                            <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wide">
                                Statutory Warning — Review Checklist
                            </h3>
                        </div>

                        <ul className="space-y-2.5">
                            {STATUTORY_WARNING_ITEMS.map((item, i) => (
                                <li key={i} className="flex items-start gap-3 text-sm text-amber-900/80">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                    <span className="font-medium leading-tight">{item}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="flex items-start gap-3 pt-3 border-t border-amber-200">
                            <Checkbox
                                id="statutory-agree"
                                checked={statutoryAgreed}
                                disabled={audioConfirmed}
                                onCheckedChange={setStatutoryAgreed}
                                className="mt-1"
                            />
                            <label htmlFor="statutory-agree" className="text-xs font-bold text-amber-900 cursor-pointer leading-relaxed">
                                I have read, understood, and agree to all of the above statutory requirements.
                            </label>
                        </div>
                    </div>

                    {/* Audio Controls */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        {!audioBlob && !audioConfirmed && (
                            <div className="flex flex-col items-center gap-4 py-2">
                                {!isRecording ? (
                                    <button
                                        type="button"
                                        onClick={startRecording}
                                        disabled={!statutoryAgreed}
                                        className="h-16 w-16 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:bg-slate-200 disabled:shadow-none transition-all active:scale-95"
                                    >
                                        <Mic className="w-7 h-7" />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={stopRecording}
                                        className="h-16 w-16 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-200 animate-pulse active:scale-95"
                                    >
                                        <Square className="w-6 h-6" />
                                    </button>
                                )}
                                <p className="text-xs font-semibold text-slate-500">
                                    {!statutoryAgreed ? 'Accept warning to record' : isRecording ? 'Recording... tap to stop' : 'Tap to start voice note'}
                                </p>
                            </div>
                        )}

                        {audioBlob && !audioConfirmed && (
                            <div className="space-y-4">
                                <audio
                                    ref={audioPlayerRef}
                                    src={audioUrl}
                                    onEnded={() => setIsPlaying(false)}
                                    className="hidden"
                                />
                                <div className="flex items-center justify-center gap-3">
                                    <Button variant="outline" size="sm" onClick={togglePlayback}>
                                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                        {isPlaying ? 'Pause' : 'Play'}
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={handleReRecord}>
                                        <RotateCcw className="w-4 h-4" /> Re-record
                                    </Button>
                                    <Button variant="primary" size="sm" onClick={handleConfirmAudio}>
                                        <ShieldCheck className="w-4 h-4" /> Confirm
                                    </Button>
                                </div>
                                <p className="text-xs text-center font-medium text-slate-400">Review before locking the audio note</p>
                            </div>
                        )}

                        {audioConfirmed && (
                            <div className="flex items-center gap-3 py-1 px-3 rounded-xl bg-emerald-50 border border-emerald-100 text-sm font-bold text-emerald-700">
                                <ShieldCheck className="w-5 h-5" />
                                Audio note confirmed and locked.
                                <button onClick={togglePlayback} className="ml-auto p-2 hover:bg-emerald-100 rounded-lg transition-colors">
                                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                </button>
                                {audioUrl && <audio ref={audioPlayerRef} src={audioUrl} onEnded={() => setIsPlaying(false)} className="hidden" />}
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 pb-6">
                    <Button
                        variant="destructive"
                        onClick={() => navigate('/medical/dashboard')}
                        className="h-12 border-red-100"
                    >
                        <XCircle className="w-4 h-4" /> Cancel & Report
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => navigate('/medical/dashboard')}
                        className="h-12 border-slate-200"
                    >
                        <LogOut className="w-4 h-4" /> Exit Without Saving
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => handleSave(false)}
                        disabled={saving}
                        className="h-12 border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                        {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <><Save className="w-4 h-4" /> Save Draft</>}
                    </Button>
                    <Button
                        variant="emerald"
                        onClick={() => handleSave(true)}
                        disabled={saving}
                        className="h-12 shadow-lg shadow-emerald-100"
                    >
                        {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <><CheckCircle className="w-4 h-4" /> Finalize</>}
                    </Button>
                </div>
            </div>

            {/* Dispensing Notice Dialog */}
            <Dialog open={showDispensingDialog}>
                <div className="bg-amber-100 w-12 h-12 rounded-2xl flex items-center justify-center text-amber-600 mb-4">
                    <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-900">Dispensing Notice</h3>
                    <p className="text-sm text-slate-500 mt-1">Review the following requirements before finalizing.</p>
                </div>
                <div className="text-xs p-4 bg-amber-50 rounded-xl text-amber-900 font-medium leading-relaxed border border-amber-200 max-h-[200px] overflow-y-auto whitespace-pre-line">
                    {DISPENSING_NOTICE}
                </div>
                <div className="flex flex-col gap-2 pt-2">
                    <Button variant="emerald" onClick={handleDispensingAgreeAndSave} className="w-full py-3">
                        I Agree & Proceed
                    </Button>
                    <button
                        onClick={() => setShowDispensingDialog(false)}
                        className="text-sm text-slate-400 font-medium hover:text-slate-600 transition-colors py-2"
                    >
                        Go Back
                    </button>
                </div>
            </Dialog>
        </Layout>
    );
}