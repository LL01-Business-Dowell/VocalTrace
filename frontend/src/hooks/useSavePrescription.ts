/**
 * useSavePrescription
 *
 * Implements the SAFE save flow required by the backend's full-replace upsert:
 *
 *  1. Fetch current patient metadata (or reuse already-loaded cache)
 *  2. Create the new prescription via facilityAPI.createPrescription
 *  3. Build a new history entry: { medicineId, name, datetime }
 *  4. Append it to the existing prescriptions array
 *  5. Send the COMPLETE updated array to adminAPI.updatePatientMetadata
 *
 * ⚠️ Step 5 is a FULL REPLACE — never send a partial array.
 *
 * The hook also prevents race conditions from double-clicks using a saving ref.
 */

import { useState, useRef, useCallback } from 'react';
import { adminAPI, facilityAPI, type PatientHistoryEntry, type PatientMetadataDoc } from '@/services/api';

export type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

export interface SavePrescriptionOptions {
    patientId: string;
    medicine: {
        medId: string;
        name: string;
        dosage: string;
        notes: string;
        audioUrl?: string;
        audioBlob?: Blob | null;
        imageBlob?: Blob | null;
        [key: string]: any;
    };
    status: 'DRAFT' | 'FINALIZED';
    /** Already-loaded metadata docs — passed in to avoid redundant fetches */
    cachedMetadataDocs?: PatientMetadataDoc[];
}

export interface UseSavePrescriptionReturn {
    saveStatus: SaveStatus;
    errorMessage: string;
    /** Returns the medicineId of the newly created prescription on success, null on failure */
    savePrescription: (opts: SavePrescriptionOptions) => Promise<string | null>;
    resetSaveStatus: () => void;
}

export function useSavePrescription(): UseSavePrescriptionReturn {
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const savingRef = useRef(false); // guard against double-clicks

    const savePrescription = useCallback(async (opts: SavePrescriptionOptions): Promise<string | null> => {
        // Guard against concurrent saves
        if (savingRef.current) return null;
        savingRef.current = true;

        const { patientId, medicine, status, cachedMetadataDocs } = opts;
        setSaveStatus('saving');
        setErrorMessage('');

        try {
            // ── Step 1: Get current metadata (reuse cache if provided) ────────────
            let existingPrescriptions: PatientHistoryEntry[] = [];
            let metaDocs: PatientMetadataDoc[] = cachedMetadataDocs ?? [];

            if (!metaDocs.length) {
                const metaRes = await adminAPI.fetchPatientMetadata(patientId.trim().toLowerCase());
                if (metaRes.success && metaRes.metadata?.length) {
                    metaDocs = metaRes.metadata;
                }
            }

            // Flatten all existing prescription entries across all docs
            for (const doc of metaDocs) {
                if (Array.isArray(doc.prescriptions)) {
                    existingPrescriptions.push(...doc.prescriptions);
                }
            }

            // ── Step 2: Generate a unique medicineId for this prescription ─────────
            // Format: mediscan-<patientId-suffix>-<uuid-short> — last 4 digits drive collection routing
            // const medicineId = `mediscan-${uuidv4()}`;
            const medicineId = medicine.medId; // Use the medId generated in the PrescriptionForm component

            // ── Step 3: Create the prescription in the medicine-specific collection ─
            const medicines = [{ ...medicine, medId: medicineId }];
            await facilityAPI.createPrescription(patientId.trim(), medicines, status);

            // ── Step 4: Build new metadata entry ──────────────────────────────────
            const newEntry: PatientHistoryEntry = {
                medicineId,
                name: medicine.name,
                datetime: new Date().toISOString(),
            };
            console.log("New history entry to add:", newEntry);

            // ── Step 5: Append & send FULL array (full-replace upsert) ────────────
            // ⚠️ CRITICAL: include ALL existing entries + the new one
            const updatedPrescriptions = [...existingPrescriptions, newEntry];
            console.log("Updated prescriptions:", updatedPrescriptions);

            const updateRes = await adminAPI.updatePatientMetadata(patientId.trim().toLowerCase(), {
                patientId: patientId.trim().toLowerCase(),
                prescriptions: updatedPrescriptions,
            });

            if (!updateRes.success) {
                throw new Error(updateRes.message || 'Failed to update patient history');
            }

            setSaveStatus('success');
            return medicineId;
        } catch (err: any) {
            console.error('useSavePrescription error:', err);
            setErrorMessage(err?.message || 'Failed to save prescription. Please try again.');
            setSaveStatus('error');
            return null;
        } finally {
            savingRef.current = false;
        }
    }, []);

    const resetSaveStatus = useCallback(() => {
        setSaveStatus('idle');
        setErrorMessage('');
    }, []);

    return { saveStatus, errorMessage, savePrescription, resetSaveStatus };
}