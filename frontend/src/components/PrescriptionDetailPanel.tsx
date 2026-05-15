/**
 * PrescriptionDetailPanel
 *
 * Displays the full details of a single prescription fetched by medicineId.
 * Used as a slide-in panel/drawer within PatientLookup so users can return
 * to the history list without a full page navigation.
 */

import { useEffect, useState } from 'react';
import { facilityAPI } from '@/services/api';
import type { PatientHistoryEntry } from '@/services/api';
import {
    ArrowLeft,
    Pill,
    ImageIcon,
    Mic,
    Loader2,
    AlertCircle,
    Calendar,
    Hash,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

const DATACUBE_BASE_URL = 'https://datacube.uxlivinglab.online';

interface PrescriptionDetailPanelProps {
    entry: PatientHistoryEntry;
    onBack: () => void;
}

export function PrescriptionDetailPanel({ entry, onBack }: PrescriptionDetailPanelProps) {
    const [prescription, setPrescription] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        setError('');

        facilityAPI
            .fetchPrescriptionByMedicineId(entry.medicineId)
            .then((res) => {
                if (res.success && res.prescription) {
                    setPrescription(res.prescription);
                } else {
                    setError(res.message || 'Could not load prescription details.');
                }
            })
            .catch(() => setError('Network error. Please try again.'))
            .finally(() => setLoading(false));
    }, [entry.medicineId]);

    return (
        <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onBack}
                    className="p-2 rounded-full hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all"
                    aria-label="Back to history"
                >
                    <ArrowLeft className="w-4 h-4 text-slate-600" />
                </button>
                <div>
                    <h2 className="text-base font-bold text-slate-900">{entry.name}</h2>
                    <p className="text-xs text-muted-foreground">
                        Prescribed {entry.datetime ? format(new Date(entry.datetime), 'MMM d, yyyy · h:mm a') : '—'}
                    </p>
                </div>
            </div>

            {/* Meta pill */}
            <div className="flex flex-wrap gap-2 text-xs">
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-mono">
                    <Hash className="w-3 h-3" />
                    {entry.medicineId}
                </span>
                {entry.datetime && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(entry.datetime), 'PPP')}
                    </span>
                )}
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
                    <Loader2 className="w-7 h-7 animate-spin" />
                    <p className="text-sm">Loading prescription details…</p>
                </div>
            )}

            {/* Error */}
            {!loading && error && (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                    <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                        <AlertCircle className="w-6 h-6 text-red-400" />
                    </div>
                    <p className="text-sm text-slate-500 max-w-xs">{error}</p>
                    <Button variant="outline" size="sm" onClick={onBack}>
                        Go Back
                    </Button>
                </div>
            )}

            {/* Prescription details */}
            {!loading && !error && prescription && (
                <div className="space-y-4">
                    {/* Medicine card */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-50 p-2.5 rounded-xl">
                                <Pill className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-900 text-base">{prescription.name || entry.name}</p>
                                {prescription.dosage && (
                                    <p className="text-sm font-medium text-blue-600">{prescription.dosage}</p>
                                )}
                            </div>
                        </div>

                        {prescription.notes && (
                            <div className="p-3 bg-slate-50 rounded-xl text-sm text-slate-600 border border-slate-100 leading-relaxed">
                                {prescription.notes}
                            </div>
                        )}

                        {/* Status badge */}
                        {prescription.status && (
                            <div className="flex items-center gap-2">
                                <span
                                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${prescription.status === 'DRAFT'
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-emerald-100 text-emerald-700'
                                        }`}
                                >
                                    {prescription.status}
                                </span>
                                {prescription.patientId && (
                                    <span className="text-xs text-slate-400 font-mono">{prescription.patientId}</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Reference image */}
                    {prescription.imageSignedUrl && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                <ImageIcon className="w-3.5 h-3.5" /> Reference Image
                            </div>
                            <img
                                src={`${DATACUBE_BASE_URL}${prescription.imageSignedUrl}`}
                                alt={`${prescription.name} reference`}
                                className="w-full rounded-xl border border-border object-cover max-h-56"
                                onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        </div>
                    )}

                    {/* Audio instructions */}
                    {prescription.audioSignedUrl && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                <Mic className="w-3.5 h-3.5" /> Audio Instructions
                            </div>
                            <audio
                                controls
                                className="w-full"
                                src={`${DATACUBE_BASE_URL}${prescription.audioSignedUrl}`}
                            >
                                Your browser does not support audio playback.
                            </audio>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}