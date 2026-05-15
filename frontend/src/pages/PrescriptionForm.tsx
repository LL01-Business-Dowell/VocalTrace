/**
 * PrescriptionForm
 *
 * Handles creating a new prescription with the SAFE save flow:
 *  1. Reads cachedMetadataDocs from navigation state (passed by PatientLookup)
 *  2. Uses useSavePrescription hook which:
 *     a) Fetches current metadata if no cache is available
 *     b) Creates the prescription via facilityAPI.createPrescription
 *     c) Appends new entry to existing prescriptions array
 *     d) Sends FULL updated array to adminAPI.updatePatientMetadata (full-replace upsert)
 *  3. On success: shows toast, navigates to PrescriptionView
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ImageUploader } from '@/components/ImageUploader';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useSavePrescription } from '@/hooks/useSavePrescription';

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
} from 'lucide-react';
import { AWSAPI } from '@/services/api';
import { a } from 'vitest/dist/chunks/suite.d.FvehnV49.js';

// ─── Local Layout (self-contained, no import to keep existing pattern) ────────
const Layout = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
        <div className="max-w-2xl mx-auto pb-20">{children}</div>
    </div>
);

// ─── Local sub-components ─────────────────────────────────────────────────────
const MedicineEntry = ({
    data,
    onChange,
}: {
    data: MedicineFormData;
    onChange: (d: MedicineFormData) => void;
}) => (
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

const InputField = ({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        {...props}
        className={`w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${props.className ?? ''}`}
    />
);

const Btn = ({
    children,
    variant = 'primary',
    className = '',
    disabled,
    onClick,
}: {
    children: React.ReactNode;
    variant?: string;
    className?: string;
    disabled?: boolean;
    onClick?: () => void;
}) => {
    const variants: Record<string, string> = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700',
        outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
        emerald: 'bg-emerald-600 text-white hover:bg-emerald-700',
        destructive: 'border border-red-200 text-red-600 hover:bg-red-50',
        ghost: 'hover:bg-slate-100 text-slate-600',
    };
    return (
        <button
            disabled={disabled}
            onClick={onClick}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant] ?? variants.primary} ${className}`}
        >
            {children}
        </button>
    );
};

const Checkbox = ({
    id,
    checked,
    onCheckedChange,
    disabled,
    className,
}: {
    id: string;
    checked: boolean;
    onCheckedChange: (v: boolean) => void;
    disabled?: boolean;
    className?: string;
}) => (
    <input
        type="checkbox"
        id={id}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className={`w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 ${className ?? ''}`}
    />
);

const Dialog = ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-100 animate-in zoom-in-95 duration-200">
                {children}
            </div>
        </div>
    ) : null;

// ─── Types ────────────────────────────────────────────────────────────────────
interface MedicineFormData {
    medId: string;
    name: string;
    dosage: string;
    imageUrl: string;
    imageFileId?: string;
    imageBlob?: Blob | null;
    audioFileId?: string;
    audioBlob?: Blob | null;
    audioUrl: string;
    notes: string;
    audioTranscript?: string;
}

const emptyMedicine = (): MedicineFormData => ({
    medId: '',
    name: '',
    dosage: '',
    imageUrl: '',
    audioUrl: '',
    notes: '',
});

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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PrescriptionForm() {
    // const { medId: urlMedId } = useParams<{ medId: string }>();
    const medId = sessionStorage.getItem('medId') ? JSON.parse(sessionStorage.getItem('medId') as string) : null;
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();

    // Navigation state: patientId and cached metadata docs from PatientLookup
    const navState = (location.state as any) ?? {};

    const [patientId, setPatientId] = useState(navState.patientId ?? '');
    const [medicine, setMedicine] = useState<MedicineFormData>(emptyMedicine());

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

    // Dispensing dialog state
    const [showDispensingDialog, setShowDispensingDialog] = useState(false);
    const [dispensingAgreed, setDispensingAgreed] = useState(false);
    const [pendingFinalize, setPendingFinalize] = useState(false);

    const { saveStatus, errorMessage, savePrescription } = useSavePrescription();
    const saving = saveStatus === 'saving';

    // Pre-fill from navigation state (e.g. scanned medicine from Scanner)
    useEffect(() => {
        if (navState.scannedMedicine) {
            setMedicine((prev) => ({ ...prev, ...navState.scannedMedicine }));
        }
    }, []); // run once on mount

    // Cleanup audio object URLs on unmount
    useEffect(() => {
        return () => {
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    // ── Validation ───────────────────────────────────────────────────────────
    const validate = (): string | null => {
        if (!patientId.trim()) return 'Patient ID is required';
        if (!medicine.name.trim()) return 'Medicine name is required';
        if (!medicine.dosage.trim()) return 'Dosage is required';
        return null;
    };

    // ── Audio Recording ──────────────────────────────────────────────────────
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
                setAudioUrl(URL.createObjectURL(blob));
                stream.getTracks().forEach((t) => t.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error('Mic access denied', err);
            toast({ title: 'Microphone access denied', variant: 'destructive' });
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
        setMedicine((prev) => ({
            ...prev,
            audioUrl: `audio_confirmed_${Date.now()}.webm`,
            audioBlob: audioBlob,
        }));
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

    // ── Save flow ────────────────────────────────────────────────────────────
    /**
     * Core save — called directly (bypasses dispensing dialog guard once agreed).
     * Uses useSavePrescription which handles the full fetch-append-update sequence.
     */
    const executeSave = async (finalize: boolean) => {
        const validationError = validate();
        if (validationError) {
            toast({ title: validationError, variant: 'destructive' });
            return;
        }

        const status = finalize ? 'FINALIZED' : 'DRAFT';
        let transcript = '';
        if (finalize && medicine.audioBlob) {
            try {
                const audioFileName = `prescription-audio-${Date.now()}.webm`
                const S3UploadRes = await AWSAPI.uploadAudioToS3(medicine.audioBlob, audioFileName);
                if (S3UploadRes.success && S3UploadRes.fileUrl) {
                    const transcriptionRes = await AWSAPI.transcribeAudio(audioFileName, "webm");
                    console.log("Transcription response:", transcriptionRes);
                    if (transcriptionRes.success ) {
                        transcript = transcriptionRes.data.transcript || 'Transcript not available';
                    }
                }
            } catch (error) {
                console.error('Audio transcription failed:', error);
                toast({
                    title: 'Audio transcription failed',
                    description: 'Prescription will still be saved.',
                    variant: 'destructive',
                });
            }
        }
        const medicinePayload = {
            ...medicine,
            medId: medId,
            imageBlob: imageBlob ?? null,
            audioBlob: audioBlob ?? null,
            audioTranscript: transcript ?? null,
        };
        // console.log("Saving prescription with payload:", medicinePayload);
        const newMedicineId = await savePrescription({
            patientId: patientId.trim(),
            medicine: medicinePayload,
            status,
            // Pass cached metadata docs so the hook skips the re-fetch if possible
            cachedMetadataDocs: navState.cachedMetadataDocs,
            // medId: medId
        });

        // console.log("This is the newMedicineId:", newMedicineId);
        if (newMedicineId) {
            toast({
                title: finalize ? 'Prescription finalized ✓' : 'Draft saved ✓',
                description: `Successfully saved for patient ${patientId.trim()}`,
            });

            if (finalize) {
                navigate(`/medical/facility/prescriptions/${patientId.trim()}/${newMedicineId}`, {
                    state: { justFinalized: true },
                });
            } else {
                navigate('/medical/facility/dashboard');
            }
        } else {
            toast({ title: 'Save failed', description: errorMessage, variant: 'destructive' });
        }
    };

    const handleSave = (finalize: boolean) => {
        const validationError = validate();
        if (validationError) {
            toast({ title: validationError, variant: 'destructive' });
            return;
        }

        // Show dispensing dialog before finalizing (only on first finalize attempt)
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
        executeSave(pendingFinalize);
    };

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <Layout>
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Page header */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-full transition-all"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">New Prescription</h1>
                        <p className="text-sm text-slate-500">Create a new patient record</p>
                    </div>
                </div>

                {/* Patient ID */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                        Patient Identifier *
                    </label>
                    <InputField
                        value={patientId}
                        onChange={(e) => setPatientId(e.target.value)}
                        className="font-mono text-lg"
                        placeholder="e.g. PAT-001"
                        maxLength={50}
                    />
                </div>

                {/* Medicine details */}
                <div className="space-y-3">
                    <h2 className="text-base font-semibold text-slate-800">Medication</h2>
                    <MedicineEntry data={medicine} onChange={setMedicine} />
                </div>

                {/* Image upload */}
                <div>
                    <Label className="mb-2 block">Medicine Image (Optional)</Label>
                    <ImageUploader
                        existingImageBlob={imageBlob || undefined}
                        onImageSelected={setImageBlob}
                    />
                </div>

                {/* Audio recording */}
                <div className="space-y-4">
                    <h2 className="text-base font-semibold flex items-center gap-2 text-slate-800">
                        <Mic className="w-4 h-4 text-blue-600" /> Audio Instructions
                    </h2>

                    {/* Statutory warning checklist */}
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
                            <label
                                htmlFor="statutory-agree"
                                className="text-xs font-bold text-amber-900 cursor-pointer leading-relaxed"
                            >
                                I have read, understood, and agree to all of the above statutory requirements.
                            </label>
                        </div>
                    </div>

                    {/* Audio controls */}
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
                                    {!statutoryAgreed
                                        ? 'Accept warning to record'
                                        : isRecording
                                            ? 'Recording… tap to stop'
                                            : 'Tap to start voice note'}
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
                                    <Btn variant="outline" onClick={togglePlayback}>
                                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                        {isPlaying ? 'Pause' : 'Play'}
                                    </Btn>
                                    <Btn variant="outline" onClick={handleReRecord}>
                                        <RotateCcw className="w-4 h-4" /> Re-record
                                    </Btn>
                                    <Btn variant="primary" onClick={handleConfirmAudio}>
                                        <ShieldCheck className="w-4 h-4" /> Confirm
                                    </Btn>
                                </div>
                                <p className="text-xs text-center font-medium text-slate-400">
                                    Review before locking the audio note
                                </p>
                            </div>
                        )}

                        {audioConfirmed && (
                            <div className="flex items-center gap-3 py-1 px-3 rounded-xl bg-emerald-50 border border-emerald-100 text-sm font-bold text-emerald-700">
                                <ShieldCheck className="w-5 h-5" />
                                Audio note confirmed and locked.
                                <button
                                    onClick={togglePlayback}
                                    className="ml-auto p-2 hover:bg-emerald-100 rounded-lg transition-colors"
                                >
                                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                </button>
                                {audioUrl && (
                                    <audio
                                        ref={audioPlayerRef}
                                        src={audioUrl}
                                        onEnded={() => setIsPlaying(false)}
                                        className="hidden"
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Error banner */}
                {saveStatus === 'error' && errorMessage && (
                    <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        {errorMessage}
                    </div>
                )}

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-3 pb-6">
                    <Btn
                        variant="destructive"
                        onClick={() => navigate('/medical/facility/dashboard')}
                        className="h-12 border-red-100"
                    >
                        <XCircle className="w-4 h-4" /> Cancel & Report
                    </Btn>
                    <Btn
                        variant="outline"
                        onClick={() => navigate('/medical/facility/dashboard')}
                        className="h-12 border-slate-200"
                    >
                        <LogOut className="w-4 h-4" /> Exit Without Saving
                    </Btn>
                    <Btn
                        variant="outline"
                        onClick={() => handleSave(false)}
                        disabled={saving}
                        className="h-12 border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                        {saving ? (
                            <Loader2 className="animate-spin w-4 h-4" />
                        ) : (
                            <>
                                <Save className="w-4 h-4" /> Save Draft
                            </>
                        )}
                    </Btn>
                    <Btn
                        variant="emerald"
                        onClick={() => handleSave(true)}
                        disabled={saving}
                        className="h-12 shadow-lg shadow-emerald-100"
                    >
                        {saving ? (
                            <Loader2 className="animate-spin w-4 h-4" />
                        ) : (
                            <>
                                <CheckCircle className="w-4 h-4" /> Finalize
                            </>
                        )}
                    </Btn>
                </div>
            </div>

            {/* Dispensing Notice Dialog */}
            <Dialog open={showDispensingDialog}>
                <div className="bg-amber-100 w-12 h-12 rounded-2xl flex items-center justify-center text-amber-600 mb-4">
                    <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-900">Dispensing Notice</h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Review the following requirements before finalizing.
                    </p>
                </div>
                <div className="text-xs p-4 bg-amber-50 rounded-xl text-amber-900 font-medium leading-relaxed border border-amber-200 max-h-[200px] overflow-y-auto whitespace-pre-line">
                    {DISPENSING_NOTICE}
                </div>
                <div className="flex flex-col gap-2 pt-2">
                    <Btn variant="emerald" onClick={handleDispensingAgreeAndSave} className="w-full py-3">
                        I Agree & Proceed
                    </Btn>
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