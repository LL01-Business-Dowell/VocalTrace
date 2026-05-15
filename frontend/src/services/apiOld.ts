import type { User, Prescription, RegisterFacilityData, Medicine, APIResponse } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const BACKEND_URL = '/api/v1';

export const adminAPI = {
  verifyMobile: async (mobile: string): Promise<{ success: boolean; message?: string, facilityDetails?: any }> => {
    const endpoint = `${BACKEND_URL}/admin/verify/?mobile=${mobile}`;
    console.log(`Endpoint -->> ${endpoint}`)

    try {
      console.log('Verifying facility:', mobile);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorDetail = await response.text();
        return {
          success: false,
          message: `Verification failed: ${errorDetail}`,
        };
      }

      const res = await response.json();
      console.log("This is the response:", res);
      return res;
    } catch (error) {
      console.error('API Call Error in adminAPI.verifyFacility:', error);
      return {
        success: false,
        message: 'Network error during verification',
      };
    }
  },

  registerFacility: async (data: RegisterFacilityData): Promise<APIResponse<User>> => {
    const endpoint = `${BACKEND_URL}/admin/register`;
    console.log(`registry FacilityEndpoint -->> ${endpoint}`)

    try {
      console.log('Registering facility:', data.facilityName);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorDetail = await response.text();
        return {
          success: false,
          message: `Registration failed: ${errorDetail}`,
        };
      }

      const res = await response.json();
      return {
        success: res.success,
        message: res.message,
      };
    } catch (error) {
      console.error('API Call Error in adminAPI.registerFacility:', error);
      return {
        success: false,
        message: 'Network error during registration',
      };
    }
  },

  savePrescriptionMetaData: async (data: any): Promise<APIResponse<null>> => {
    const endpoint = `${BACKEND_URL}/admin/save-metadata`;
    console.log(`Save Prescription Metadata Endpoint -->> ${endpoint}`)

    try {
      console.log('Saving prescription metadata for patient:', data.patientId);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorDetail = await response.text();
        return {
          success: false,
          message: `Failed to save metadata: ${errorDetail}`,
        };
      }

      const res = await response.json();
      return {
        success: res.success,
        message: res.message,
      };
    } catch (error) {
      console.error('API Call Error in adminAPI.savePrescriptionMetaData:', error);
      return {
        success: false,
        message: 'Network error during saving metadata',
      };
    }
  },

  fetchPrescriptionMetaData: async (patientId: string): Promise<APIResponse<any>> => {
    const endpoint = `${BACKEND_URL}/admin/get-metadata/?patientId=${patientId}`;
    console.log(`Fetch Prescription Metadata Endpoint -->> ${endpoint}`)

    try {
      console.log('Fetching prescription metadata for patient:', patientId);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorDetail = await response.text();
        return {
          success: false,
          message: `Failed to fetch metadata: ${errorDetail}`,
        };
      }

      const res = await response.json();
      return {
        success: res.success,
        message: res.message,
        data: res.data
      };
    } catch (error) {
      console.error('API Call Error in adminAPI.fetchPrescriptionMetaData:', error);
      return {
        success: false,
        message: 'Network error during fetching metadata',
      };
    }
  },

  updateMetadata: async (patientId: string, data: any): Promise<APIResponse<null>> => {
    const endpoint = `${BACKEND_URL}/admin/update-metadata/?patientId=${patientId}`;
    console.log(`Update Prescription Metadata Endpoint -->> ${endpoint}`)

    try {
      console.log('Updating prescription metadata for patient:', patientId);    

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorDetail = await response.text();
        return {
          success: false,
          message: `Failed to update metadata: ${errorDetail}`,
        };
      }

      const res = await response.json();
      return {
        success: res.success,
        message: res.message,
      };
    } catch (error) {
      console.error('API Call Error in adminAPI.updateMetadata:', error);
      return {
        success: false,
        message: 'Network error during updating metadata',
      };
    }
  }

}

export const facilityAPI = {
  createPrescription: async (patientId: string, medicines: any[], status: string = 'DRAFT'): Promise<APIResponse<Prescription>> => {
    const endpoint = `${BACKEND_URL}/facility/create-prescription`;
    const fileUploadEndPoint = `${BACKEND_URL}/facility/upload`;

    try {
      let imageFileId: string | null = null;
      let audioFileId: string | null = null;
      let fieldKey = uuidv4();
      console.log(`Medicines length ${medicines.length}`)
      console.log(`Medicines imageblob ${medicines[0].imageBlob}`)
      console.log(`Medicines audioblob ${medicines[0].audioBlob}`)
      console.log(`FieldKey = ${fieldKey}`)

      // 2. Handle Audio Upload (Optional)
      // Note: Check if the blob exists, not just the URL
      if (medicines[0].audioBlob) {
        console.log(`Present Audio Blob = ${fieldKey}`)

        const formData = new FormData();
        formData.append("file", medicines[0].audioBlob);
        formData.append("filename", `prescription-audio-${fieldKey}`);

        const uploadResponse = await fetch(fileUploadEndPoint, { method: "POST", body: formData });
        if (!uploadResponse.ok) {

          throw new Error(`Audio upload failed for order ${patientId}`);
        }
        // if (uploadResponse.ok) {
        //     const uploadResult = await uploadResponse.json();
        //     audioFileId = uploadResult.file_id;
        // }
        const uploadResult = await uploadResponse.json();
        console.log("Audio Upload Result:", uploadResult)
        audioFileId = uploadResult.data.file_id;

      } else {
        console.log("There was no Audio Blob")
      }

      // 1. Handle Image Upload (Optional)
      if (medicines[0].imageBlob) {
        console.log(`Present Image Blob = ${fieldKey}`)

        const formData = new FormData();
        formData.append("file", medicines[0].imageBlob, `medicine-image-original${fieldKey}`);
        formData.append("filename", `medicine-image${fieldKey}`);

        const uploadResponse = await fetch(fileUploadEndPoint, { method: "POST", body: formData });
        if (!uploadResponse.ok) {
          throw new Error(`Image upload failed for order ${patientId}`);
        }
        // if (uploadResponse.ok) {
        //     const uploadResult = await uploadResponse.json();
        //     imageFileId = uploadResult.file_id;
        // }
        const uploadResult = await uploadResponse.json();
        console.log("Image Upload Result:", uploadResult)
        imageFileId = uploadResult.data.file_id;
      } else {
        console.log("There was no ImageBlob")
      }


      delete medicines[0].imageBlob
      delete medicines[0].audioBlob
      // 3. Main API Call (Now outside the if-checks)
      console.log("About to create a new prescription in", endpoint)
      const prescriptionPayload = {
        patientId: patientId,
        type: 'mediScanQR',
        status: status,
        ...medicines[0],
        imageFileId: imageFileId,
        audioFileId: audioFileId
      };
      console.log(`Prescroptopm Payload ${prescriptionPayload}`)

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
      return {
        success: true,
        message: "Prescription created successfully",
        data: resData // Ensure you return the actual response data (including the new ID)
      };
    } catch (error) {
      console.error("API Call Error for Prescription:", error);
      throw error;
    }
  },

  fetchPrescriptions: async (patientId: string): Promise<{ success: boolean, message?: string, prescriptions?: any }> => {
    console.log(`Fetching details for patient: ${patientId}`);
    const endpoint = `${BACKEND_URL}/facility/get-prescriptions/?patientId=${patientId}`;
    console.log('Fetch  prescription facility:', endpoint);

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            message: `Could not find prescriptions for patientID: ${patientId}`,
            prescriptions: []
          }
        } else {
          const errorDetail = await response.text();
          throw new Error(`Failed to fetch prescriptions. Status: ${response.status}. Detail: ${errorDetail}`);
        }
      }

      const res = await response.json();
      console.log("res fetched from db", res);

      // Enrich prescriptions: resolve imageFileId and audioFileId to signed URLs.
      // The prescription object is flat — medicine fields (name, dosage, imageFileId, audioFileId)
      // live directly on the prescription, not in a nested medicines array.
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
      console.error("API Call Error in merchantOrderAPI.getOrder:", error);
      throw error;
    }
  },

  getFileSignedUrl: async (fileId: string): Promise<{ signedUrl: string | null; filename: string | null; contentType: string | null } | null> => {
    const endpoint = `${BACKEND_URL}/facility/files/${fileId}`;
    try {
      const response = await fetch(endpoint, { method: 'GET' });
      if (!response.ok) {
        console.warn(`Could not fetch signed URL for file ${fileId}: ${response.status}`);
        return null;
      }
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
}

const DELAY_MIN = 500;
const DELAY_MAX = 1000;
const ERROR_RATE = 0.05; // 5% simulated failure

function delay(): Promise<void> {
  const ms = DELAY_MIN + Math.random() * (DELAY_MAX - DELAY_MIN);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function maybeError(): void {
  if (Math.random() < ERROR_RATE) {
    throw new Error('Network error: Please try again.');
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// localStorage helpers
function getUsers(): User[] {
  return JSON.parse(localStorage.getItem('mediscan_users') || '[]');
}
function saveUsers(users: User[]): void {
  localStorage.setItem('mediscan_users', JSON.stringify(users));
}
function getPrescriptions(): Prescription[] {
  return JSON.parse(localStorage.getItem('mediscan_prescriptions') || '[]');
}
function savePrescriptions(prescriptions: Prescription[]): void {
  localStorage.setItem('mediscan_prescriptions', JSON.stringify(prescriptions));
}

// Seed some demo data on first load
// function seedData(): void {
//   if (localStorage.getItem('mediscan_seeded')) return;
//   const demoUser: User = {
//     id: 'user_demo',
//     mobile: '1234567890',
//     facilityName: 'City General Pharmacy',
//     address: '123 Medical Ave, Health City',
//   };
//   saveUsers([demoUser]);

//   const demoPrescriptions: Prescription[] = [
//     {
//       id: 'rx_001',
//       patientId: 'PAT-001',
//       userId: 'user_demo',
//       status: 'FINALIZED',
//       createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
//       medicines: [
//         { id: 'med_001', name: 'Amoxicillin', dosage: '500mg 3x daily', imageUrl: '', audioUrl: '', notes: 'Take with food' },
//       ],
//     },
//     {
//       id: 'rx_002',
//       patientId: 'PAT-002',
//       userId: 'user_demo',
//       status: 'DRAFT',
//       createdAt: new Date(Date.now() - 86400000).toISOString(),
//       medicines: [
//         { id: 'med_002', name: 'Ibuprofen', dosage: '200mg as needed', imageUrl: '', audioUrl: '', notes: 'Max 4x daily' },
//         { id: 'med_003', name: 'Omeprazole', dosage: '20mg before breakfast', imageUrl: '', audioUrl: '', notes: '' },
//       ],
//     },
//   ];
//   savePrescriptions(demoPrescriptions);
//   localStorage.setItem('mediscan_seeded', 'true');
// }

// seedData();

// // ---- API Methods ----

// // export async function verifyMobile(mobile: string): Promise<User | null> {
// //   await delay();
// //   maybeError();
// //   const users = getUsers();
// //   return users.find((u) => u.mobile === mobile) || null;
// // }

// // export async function registerFacility(data: RegisterFacilityData): Promise<User> {
// //   await delay();
// //   maybeError();
// //   const users = getUsers();
// //   if (users.find((u) => u.mobile === data.mobile)) {
// //     throw new Error('Mobile number already registered.');
// //   }
// //   const user: User = { id: generateId(), ...data };
// //   users.push(user);
// //   saveUsers(users);
// //   return user;
// // }

// // export async function fetchPrescriptions(userId: string, patientId?: string): Promise<Prescription[]> {
// //   await delay();
// //   maybeError();
// //   let list = getPrescriptions().filter((p) => p.userId === userId);
// //   if (patientId) {
// //     list = list.filter((p) => p.patientId === patientId);
// //   }
// //   return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
// // }

export async function fetchPrescriptionById(id: string): Promise<Prescription | null> {
  await delay();
  maybeError();
  return getPrescriptions().find((p) => p.id === id) || null;
}

// export async function createPrescription(
//   userId: string,
//   patientId: string,
//   medicines: Omit<Medicine, 'id'>[],
//   status: 'DRAFT' | 'FINALIZED' = 'DRAFT'
// ): Promise<Prescription> {
//   await delay();
//   maybeError();
//   const rx: Prescription = {
//     id: generateId(),
//     patientId,
//     userId,
//     status,
//     createdAt: new Date().toISOString(),
//     medicines: medicines.map((m) => ({ ...m, id: generateId() })),
//   };
//   const all = getPrescriptions();
//   all.push(rx);
//   savePrescriptions(all);
//   return rx;
// }

export async function updatePrescription(
  id: string,
  data: { medicines?: Omit<Medicine, 'id'>[]; status?: 'DRAFT' | 'FINALIZED'; patientId?: string }
): Promise<Prescription> {
  await delay();
  maybeError();
  const all = getPrescriptions();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error('Prescription not found.');
  if (all[idx].status === 'FINALIZED') throw new Error('Cannot edit a finalized prescription.');

  if (data.medicines) {
    all[idx].medicines = data.medicines.map((m) => ({ ...m, id: generateId() }));
  }
  if (data.status) all[idx].status = data.status;
  if (data.patientId) all[idx].patientId = data.patientId;

  savePrescriptions(all);
  return all[idx];
}

export async function lookupMedicine(medicineId: string): Promise<{ id: string; name: string; dosage: string } | null> {
  await delay();
  // Simulated medicine database lookup from QR code
  const mockMedicines: Record<string, { name: string; dosage: string }> = {
    'MED001': { name: 'Amoxicillin', dosage: '500mg' },
    'MED002': { name: 'Ibuprofen', dosage: '200mg' },
    'MED003': { name: 'Metformin', dosage: '850mg' },
    'MED004': { name: 'Omeprazole', dosage: '20mg' },
    'MED005': { name: 'Lisinopril', dosage: '10mg' },
  };
  const med = mockMedicines[medicineId];
  if (!med) return null;
  return { id: medicineId, ...med };
}
