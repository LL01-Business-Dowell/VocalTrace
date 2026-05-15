import type { User, Prescription, RegisterFacilityData, Medicine, APIResponse } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const BACKEND_URL = 'https://medsignqr.uxlivinglab.org/api/v1';

// ─────────────────────────────────────────────────────────────────────────────
// Types for patient history / metadata
// ─────────────────────────────────────────────────────────────────────────────

/** A single entry in the patient's prescription history (stored in collection 0001). */
export interface PatientHistoryEntry {
    medicineId: string;
    name: string;
    datetime: string;
}

/** The full metadata document returned by GET /admin/get-metadata */
export interface PatientMetadataDoc {
    patientId: string;
    prescriptions: PatientHistoryEntry[];
    [key: string]: any;
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin API — patient metadata management (collection 0001)
// ─────────────────────────────────────────────────────────────────────────────

export const adminAPI = {
    verifyMobile: async (mobile: string): Promise<{ success: boolean; message?: string; facilityDetails?: any }> => {
        const endpoint = `${BACKEND_URL}/admin/verify/?mobile=${mobile}`;
        try {
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!response.ok) {
                const errorDetail = await response.text();
                return { success: false, message: `Verification failed: ${errorDetail}` };
            }
            return await response.json();
        } catch (error) {
            console.error('API Call Error in adminAPI.verifyFacility:', error);
            return { success: false, message: 'Network error during verification' };
        }
    },

    registerFacility: async (data: RegisterFacilityData): Promise<APIResponse<User>> => {
        const endpoint = `${BACKEND_URL}/admin/register`;
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const errorDetail = await response.text();
                return { success: false, message: `Registration failed: ${errorDetail}` };
            }
            const res = await response.json();
            return { success: res.success, message: res.message };
        } catch (error) {
            console.error('API Call Error in adminAPI.registerFacility:', error);
            return { success: false, message: 'Network error during registration' };
        }
    },

    decryptId: async (encryptedId: string): Promise<{ success: boolean; message?: string, decryptedId?: any }> => {
    const endpoint = `${BACKEND_URL}/admin/decrypt`;

    try {
      console.log('Decrypting token...');

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: encryptedId }),
      });

      if (!response.ok) {
        const errorDetail = await response.text();
        return {
          success: false,
          message: `Decryption failed: ${errorDetail}`,
        };
      }

      const res = await response.json();
      return {
        success: res.success,
        message: res.message,
        decryptedId: res.payload

      };
    } catch (error) {
      console.error('API Call Error in merchantOrderAPI.decryptOrderId:', error);
      return {
        success: false,
        message: 'Network error during decryption',
      };
    }
  },

    /**
     * Fetch patient prescription history from collection 0001.
     * Returns an array of metadata docs; each doc contains a `prescriptions` array
     * of { medicineId, name, datetime } entries.
     *
     * GET /api/v1/admin/get-metadata?patientId=<id>
     * Response: { success: boolean, message: string, metadata: PatientMetadataDoc[] }
     */
    fetchPatientMetadata: async (
        patientId: string
    ): Promise<{ success: boolean; message?: string; metadata?: PatientMetadataDoc[] }> => {
        const endpoint = `${BACKEND_URL}/admin/get-metadata/?patientId=${encodeURIComponent(patientId)}`;
        try {
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.status === 404) {
                return { success: false, message: 'No prescription history found for this patient.', metadata: [] };
            }

            if (!response.ok) {
                const errorDetail = await response.text();
                return { success: false, message: `Failed to fetch metadata: ${errorDetail}` };
            }

            const res = await response.json();
            return { success: res.success, message: res.message, metadata: res.metadata ?? [] };
        } catch (error) {
            console.error('API Call Error in adminAPI.fetchPatientMetadata:', error);
            return { success: false, message: 'Network error while fetching patient history' };
        }
    },

    /**
     * ⚠️ CRITICAL — FULL REPLACE upsert.
     * Always send the COMPLETE prescriptions array to avoid data loss.
     *
     * PUT /api/v1/admin/update-metadata?patientId=<id>
     * Body: { patientId, prescriptions: PatientHistoryEntry[] }
     */
    updatePatientMetadata: async (
        patientId: string,
        fullPayload: { patientId: string; prescriptions: PatientHistoryEntry[] }
    ): Promise<APIResponse<null>> => {
        const endpoint = `${BACKEND_URL}/admin/update-metadata/`;
        try {
            console.log('This is the payload being sent to the backend for updating patient metadata:', fullPayload)
            const response = await fetch(endpoint, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patientId: patientId,
                    updateData: {
                        prescriptions: fullPayload.prescriptions
                    }
                }),
            });
            if (!response.ok) {
                const errorDetail = await response.text();
                return { success: false, message: `Failed to update metadata: ${errorDetail}` };
            }
            const res = await response.json();
            return { success: res.success, message: res.message };
        } catch (error) {
            console.error('API Call Error in adminAPI.updatePatientMetadata:', error);
            return { success: false, message: 'Network error while updating patient metadata' };
        }
    },

    // Legacy aliases for backward compatibility
    savePrescriptionMetaData: async (data: any): Promise<APIResponse<null>> => {
        const endpoint = `${BACKEND_URL}/admin/save-metadata`;
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const errorDetail = await response.text();
                return { success: false, message: `Failed to save metadata: ${errorDetail}` };
            }
            const res = await response.json();
            return { success: res.success, message: res.message };
        } catch (error) {
            return { success: false, message: 'Network error during saving metadata' };
        }
    },

    fetchPrescriptionMetaData: async (patientId: string): Promise<APIResponse<any>> => {
        return adminAPI.fetchPatientMetadata(patientId) as any;
    },

    updateMetadata: async (patientId: string, data: any): Promise<APIResponse<null>> => {
        return adminAPI.updatePatientMetadata(patientId, data);
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// Facility API — prescriptions and file management
// ─────────────────────────────────────────────────────────────────────────────

export const facilityAPI = {
    createPrescription: async (
        patientId: string,
        medicines: any[],
        status: string = 'DRAFT'
    ): Promise<APIResponse<Prescription>> => {
        const endpoint = `${BACKEND_URL}/facility/create-prescription`;
        const fileUploadEndPoint = `${BACKEND_URL}/facility/upload`;

        try {
            let imageFileId: string | null = null;
            let audioFileId: string | null = null;
            let fieldKey = uuidv4();

            if (medicines[0].audioBlob) {
                const formData = new FormData();
                formData.append('file', medicines[0].audioBlob);
                formData.append('filename', `prescription-audio-${fieldKey}`);
                const uploadResponse = await fetch(fileUploadEndPoint, { method: 'POST', body: formData });
                if (!uploadResponse.ok) throw new Error(`Audio upload failed for order ${patientId}`);
                const uploadResult = await uploadResponse.json();
                audioFileId = uploadResult.data.file_id;
            }

            if (medicines[0].imageBlob) {
                const formData = new FormData();
                formData.append('file', medicines[0].imageBlob, `medicine-image-original${fieldKey}`);
                formData.append('filename', `medicine-image${fieldKey}`);
                const uploadResponse = await fetch(fileUploadEndPoint, { method: 'POST', body: formData });
                if (!uploadResponse.ok) throw new Error(`Image upload failed for order ${patientId}`);
                const uploadResult = await uploadResponse.json();
                imageFileId = uploadResult.data.file_id;
            }

            delete medicines[0].imageBlob;
            delete medicines[0].audioBlob;

            const prescriptionPayload = {
                patientId,
                type: 'mediScanQR',
                status,
                ...medicines[0],
                imageFileId,
                audioFileId,
                transcript: ""
            };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(prescriptionPayload),
            });

            if (!response.ok) {
                const errorDetail = await response.text();
                throw new Error(`Failed to create: ${errorDetail}`);
            }

            const resData = await response.json();
            return { success: true, message: 'Prescription created successfully', data: resData };
        } catch (error) {
            console.error('API Call Error for Prescription:', error);
            throw error;
        }
    },

    fetchPrescriptions: async (
        patientId: string
    ): Promise<{ success: boolean; message?: string; prescriptions?: any }> => {
        const endpoint = `${BACKEND_URL}/facility/get-prescriptions/?patientId=${patientId}`;
        try {
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                if (response.status === 404) {
                    return {
                        success: false,
                        message: `Could not find prescriptions for patientID: ${patientId}`,
                        prescriptions: [],
                    };
                }
                const errorDetail = await response.text();
                throw new Error(`Failed to fetch prescriptions. Status: ${response.status}. Detail: ${errorDetail}`);
            }

            const res = await response.json();

            if (res.success && res.prescriptions?.length) {
                const enriched = await Promise.all(
                    res.prescriptions.map(async (rx: any) => {
                        const enrichedRx = { ...rx };
                        if (rx.imageFileId) {
                            const detail = await facilityAPI.getFileSignedUrl(rx.imageFileId);
                            enrichedRx.imageSignedUrl = detail?.signedUrl || null;
                        }
                        if (rx.audioFileId) {
                            const detail = await facilityAPI.getFileSignedUrl(rx.audioFileId);
                            enrichedRx.audioSignedUrl = detail?.signedUrl || null;
                        }
                        return enrichedRx;
                    })
                );
                return { ...res, prescriptions: enriched };
            }

            return res;
        } catch (error) {
            console.error('API Call Error in facilityAPI.fetchPrescriptions:', error);
            throw error;
        }
    },

    /**
     * Fetch a single prescription detail by medicineId.
     * Backend derives the collection from the last 4 digits of medicineId.
     *
     * GET /api/v1/facility/get-prescriptions?medicineId=<id>
     */
    fetchPrescriptionByMedicineId: async (
        medicineId: string
    ): Promise<{ success: boolean; message?: string; prescription?: any| null }> => {
        const endpoint = `${BACKEND_URL}/facility/get-prescription-by-medicine/?medicineId=${encodeURIComponent(medicineId)}`;
        try {
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.status === 404) {
                return { success: false, message: 'Prescription not found.', prescription: null };
            }

            if (!response.ok) {
                const errorDetail = await response.text();
                return { success: false, message: `Failed to fetch: ${errorDetail}`, prescription: null };
            }

            const res = await response.json();
            console.log('Raw API response for fetchPrescriptionByMedicineId:', res);
            if (res.success && res.prescription) {
                const rx = res.prescription;
                const enriched = { ...rx };
                if (rx.imageFileId) {
                    const detail = await facilityAPI.getFileSignedUrl(rx.imageFileId);
                    enriched.imageSignedUrl = detail?.signedUrl || null;
                }
                if (rx.audioFileId) {
                    const detail = await facilityAPI.getFileSignedUrl(rx.audioFileId);
                    enriched.audioSignedUrl = detail?.signedUrl || null;
                }
                return { success: true, message: res.message, prescription: enriched };
            }
            return { success: false, message: 'No prescription found.', prescription: null };
        } catch (error) {
            console.error('API Call Error in facilityAPI.fetchPrescriptionByMedicineId:', error);
            return { success: false, message: 'Network error', prescription: null };
        }
    },

    getFileSignedUrl: async (
        fileId: string
    ): Promise<{ signedUrl: string | null; filename: string | null; contentType: string | null } | null> => {
        const endpoint = `${BACKEND_URL}/facility/files/${fileId}`;
        try {
            const response = await fetch(endpoint, { method: 'GET' });
            if (!response.ok) return null;
            const data = await response.json();
            return {
                signedUrl: data.signedUrl || null,
                filename: data.filename || null,
                contentType: data.contentType || null,
            };
        } catch (error) {
            console.error(`getFileSignedUrl error for ${fileId}:`, error);
            return null;
        }
    },
};

export const AWSAPI = {
    uploadAudioToS3: async (file: Blob, fileName: string): Promise<{ success: boolean; message?: string; fileUrl?: string }> => {
        const endpoint = `${BACKEND_URL}/transcription/upload-to-s3`;

        try {
            const formData = new FormData();
            formData.append('file', file, fileName);
            formData.append('fileName', fileName);
            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) {
                const errorDetail = await response.text();
                throw new Error(`Failed to upload to S3. Status: ${response.status}. Detail: ${errorDetail}`);
            }
            const res = await response.json();
            return res;
        } catch (error) {
            console.error('API Call Error in transcriptionAPI.uploadAudioToS3:', error);
            throw error; 
        }
    },
    transcribeAudio: async (fileName: string, format: string): Promise<{ success: boolean; message?: string; data?: any }> => {
        const endpoint = `${BACKEND_URL}/transcription/transcribe`;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName, format }),
            });

            if (!response.ok) {
                const errorDetail = await response.text();
                throw new Error(`Failed to transcribe audio. Status: ${response.status}. Detail: ${errorDetail}`);
            }

            const res = await response.json();
            return res;
        } catch (error) {
            console.error('API Call Error in transcriptionAPI.transcribeAudio:', error);
            throw error;
        }
    },


};