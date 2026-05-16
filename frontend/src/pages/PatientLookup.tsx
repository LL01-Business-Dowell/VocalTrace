/**
 * PatientLookup
 *
 * Allows staff to:
 *  1. Search for a patient by ID → loads prescription history from collection 0001
 *  2. Click any history entry to view that prescription's detail panel
 *  3. Navigate to create a new prescription for the patient
 *
 * State machine:
 *   idle → loading → success | empty | error
 *   success → (click entry) → detail panel (inline, preserves list state)
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import { PrescriptionDetailPanel } from '@/components/PrescriptionDetailPanel';
import { usePatientHistory } from '@/hooks/usePatientHistory';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Search,
    Loader2,
    FileText,
    Plus,
    AlertCircle,
    Clock,
    ChevronRight,
    Pill,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import type { PatientHistoryEntry } from '@/services/api';

export default function PatientLookup() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { medId } = useParams<{ medId: string }>();

    const [patientIdInput, setPatientIdInput] = useState('');
    // The ID that was actually searched (may differ from the input while typing)
    const [searchedPatientId, setSearchedPatientId] = useState('');
    // The history entry the user clicked on (null = show list view)
    const [selectedEntry, setSelectedEntry] = useState<PatientHistoryEntry | null>(null);

    const { history, metadataDocs, state, errorMessage, fetchHistory } = usePatientHistory();

    const handleSearch = async () => {
        const trimmed = patientIdInput.trim();
        if (!trimmed) return;

        setSelectedEntry(null); // clear any open detail panel
        setSearchedPatientId(trimmed);

        await fetchHistory(trimmed);

        // Toast only if completely empty after a valid search
        if (state === 'empty') {
            toast({ title: 'No records found', description: `No prescription history for ${trimmed}` });
        }
    };

    const handleEntryClick = (entry: PatientHistoryEntry) => {
        setSelectedEntry(entry);
    };

    const handleBackToList = () => {
        setSelectedEntry(null);
    };

    const handleNewPrescription = () => {
        // Pass patientId and cached metadataDocs via navigation state so PrescriptionForm
        // can perform the safe fetch-append-update without re-fetching
        navigate(`/facility/prescriptions/new/${medId ?? 'new'}`, {
            state: {
                patientId: searchedPatientId,
                cachedMetadataDocs: metadataDocs,
            },
        });
    };

    return (
        <Layout>
            <div className="space-y-6 animate-fade-in">
                <div>
                    <h1 className="text-xl font-display font-bold">Patient Lookup</h1>
                    <p className="text-sm text-muted-foreground">Enter Patient ID to view prescription history</p>
                </div>

                {/* Search bar */}
                <div className="flex gap-2">
                    <Input
                        placeholder="Enter Patient ID (e.g. PAT-001)"
                        value={patientIdInput}
                        onChange={(e) => setPatientIdInput(e.target.value)}
                        maxLength={50}
                        className="h-11"
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        disabled={state === 'loading'}
                    />
                    <Button
                        onClick={handleSearch}
                        disabled={state === 'loading' || !patientIdInput.trim()}
                        className="h-11 px-4 shrink-0"
                    >
                        {state === 'loading' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Search className="w-4 h-4" />
                        )}
                    </Button>
                </div>

                {/* ── Prescription Detail Panel (inline) ── */}
                {selectedEntry && (
                    <PrescriptionDetailPanel entry={selectedEntry} onBack={handleBackToList} />
                )}

                {/* ── History List ── */}
                {!selectedEntry && state !== 'idle' && (
                    <div>
                        {/* List header */}
                        {(state === 'success' || state === 'empty') && (
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-sm font-semibold text-slate-700">
                                    Prescription History
                                    {history.length > 0 && (
                                        <span className="ml-2 text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                                            {history.length}
                                        </span>
                                    )}
                                </h2>
                                <Button size="sm" onClick={handleNewPrescription} className="gap-1">
                                    <Plus className="w-4 h-4" /> New Prescription
                                </Button>
                            </div>
                        )}

                        {/* Loading skeleton */}
                        {state === 'loading' && (
                            <div className="space-y-2">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="glass-card rounded-xl p-4 animate-pulse">
                                        <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
                                        <div className="h-3 bg-slate-100 rounded w-1/2" />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Error */}
                        {state === 'error' && (
                            <div className="flex flex-col items-center py-10 gap-3 text-center">
                                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                                    <AlertCircle className="w-6 h-6 text-red-400" />
                                </div>
                                <p className="text-sm text-slate-500 max-w-xs">{errorMessage}</p>
                                <Button variant="outline" size="sm" onClick={handleSearch}>
                                    Retry
                                </Button>
                            </div>
                        )}

                        {/* Empty state */}
                        {state === 'empty' && (
                            <div className="text-center py-10 text-muted-foreground">
                                <FileText className="w-10 h-10 mx-auto mb-3 opacity-25" />
                                <p className="text-sm font-medium mb-1">No prescription history</p>
                                <p className="text-xs text-slate-400 mb-4">
                                    No records found for <span className="font-mono font-semibold">{searchedPatientId}</span>
                                </p>
                                <Button size="sm" onClick={handleNewPrescription} className="gap-1">
                                    <Plus className="w-4 h-4" /> Create First Prescription
                                </Button>
                            </div>
                        )}

                        {/* History entries */}
                        {state === 'success' && history.length > 0 && (
                            <div className="space-y-2">
                                {history.map((entry, idx) => (
                                    <button
                                        key={`${entry.medicineId}-${idx}`}
                                        onClick={() => handleEntryClick(entry)}
                                        className="w-full glass-card rounded-xl p-4 text-left hover:bg-white/80 active:scale-[0.99] transition-all group"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="shrink-0 bg-blue-50 p-2 rounded-lg">
                                                    <Pill className="w-4 h-4 text-blue-600" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-slate-900 text-sm truncate">
                                                        {entry.name || 'Unnamed Medicine'}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                                        <p className="text-xs text-muted-foreground truncate">
                                                            {entry.datetime
                                                                ? format(new Date(entry.datetime), 'MMM d, yyyy · h:mm a')
                                                                : 'Date unknown'}
                                                        </p>
                                                    </div>
                                                    <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">
                                                        {entry.medicineId}
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 group-hover:text-slate-600 transition-colors" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
}