/**
 * usePatientHistory
 *
 * Encapsulates all state and logic for:
 *  - Fetching patient prescription history from collection 0001 (via adminAPI.fetchPatientMetadata)
 *  - Providing cached metadata so the save flow can append rather than replace
 *
 * This hook is the single source of truth for patient metadata in the UI.
 */

import { useState, useCallback, useRef } from 'react';
import { adminAPI, type PatientHistoryEntry, type PatientMetadataDoc } from '@/services/api';

export type HistoryState = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export interface UsePatientHistoryReturn {
    /** The flat list of all prescription history entries across all metadata docs */
    history: PatientHistoryEntry[];
    /** The raw metadata documents (needed to perform safe upserts) */
    metadataDocs: PatientMetadataDoc[];
    state: HistoryState;
    errorMessage: string;
    /** Trigger a fetch for a given patientId */
    fetchHistory: (patientId: string) => Promise<void>;
    /** Optimistically append a new entry to the local history (call after successful save) */
    appendEntry: (entry: PatientHistoryEntry) => void;
    /** Reset to idle state */
    reset: () => void;
}

export function usePatientHistory(): UsePatientHistoryReturn {
    const [history, setHistory] = useState<PatientHistoryEntry[]>([]);
    const [metadataDocs, setMetadataDocs] = useState<PatientMetadataDoc[]>([]);
    const [state, setState] = useState<HistoryState>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    // Prevent overlapping fetch calls (e.g. double-click)
    const fetchingRef = useRef(false);

    const fetchHistory = useCallback(async (patientId: string) => {
        if (fetchingRef.current) return;
        fetchingRef.current = true;

        setState('loading');
        setErrorMessage('');

        try {
            const res = await adminAPI.fetchPatientMetadata(patientId.trim().toLowerCase());

            if (!res.success || !res.metadata?.length) {
                setHistory([]);
                setMetadataDocs([]);
                setState('empty');
                return;
            }

            // Flatten all prescriptions arrays across all metadata documents
            const allEntries: PatientHistoryEntry[] = [];
            for (const doc of res.metadata) {
                if (Array.isArray(doc.prescriptions)) {
                    allEntries.push(...doc.prescriptions);
                }
            }

            // Sort by datetime descending (most recent first)
            allEntries.sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());

            setMetadataDocs(res.metadata);
            setHistory(allEntries);
            setState(allEntries.length === 0 ? 'empty' : 'success');
        } catch (err) {
            console.error('usePatientHistory fetchHistory error:', err);
            setErrorMessage('Failed to load patient history. Please try again.');
            setState('error');
        } finally {
            fetchingRef.current = false;
        }
    }, []);

    /** Optimistically prepend a new entry without re-fetching (call after successful save). */
    const appendEntry = useCallback((entry: PatientHistoryEntry) => {
        setHistory((prev) => [entry, ...prev]);
        setState('success');
    }, []);

    const reset = useCallback(() => {
        setHistory([]);
        setMetadataDocs([]);
        setState('idle');
        setErrorMessage('');
    }, []);

    return { history, metadataDocs, state, errorMessage, fetchHistory, appendEntry, reset };
}