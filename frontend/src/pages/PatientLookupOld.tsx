import { useState } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { facilityAPI } from '@/services/api';
import type { Prescription } from '@/types';
import Layout from '@/components/Layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, FileText, Clock, CheckCircle2, Pencil, Eye, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function PatientLookup() {
  // const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [patientId, setPatientId] = useState('');
  const [results, setResults] = useState<Prescription[] | null>(null);
  const [loading, setLoading] = useState(false);
  const { medId } = useParams<{ medId: string }>();
  console.log("This is the medId in PateintLookup:", medId);

  const handleSearch = async () => {
    // if (!patientId.trim() || !user) return;
    // setLoading(true);
    console.log("LOOKUP FOR:", patientId);
    try {
      const data = await facilityAPI.fetchPrescriptions(patientId.trim());
      const prescriptions = data.prescriptions
      setResults(prescriptions);
      if (!data.success || prescriptions === null) toast({ title: 'No prescriptions found', description: `No records for ${patientId}` });
    } catch {
      toast({ title: 'Search failed', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-display font-bold">Patient Lookup</h1>
          <p className="text-sm text-muted-foreground">Enter Patient ID to fetch prescription history</p>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Enter Patient ID (e.g. PAT-001)"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            maxLength={20}
            className="h-11"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={loading || !patientId.trim()} className="h-11 px-4">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>

        {results !== null && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Prescription History ({results.length})</h2>
              <Button size="sm" onClick={() => navigate(`/medical/prescriptions/new/${medId}`)}>
                <Plus className="w-4 h-4 mr-1" /> New Prescription
              </Button>
            </div>

            {results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No records found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {results.map((rx) => (
                  <div
                    // key={rx.id}
                    className="w-full glass-card rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {/* <span className="text-sm font-medium">{rx.medicines.length} medicine{rx.medicines.length !== 1 ? 's' : ''}</span> */}
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${rx.status === 'DRAFT' ? 'status-draft' : 'status-finalized'}`}>
                            {rx.status === 'DRAFT' ? <><Clock className="w-3 h-3 inline mr-0.5" />Draft</> : <><CheckCircle2 className="w-3 h-3 inline mr-0.5" />Finalized</>}
                          </span>
                        </div>
                        {/* <p className="text-xs text-muted-foreground">{format(new Date(rx.createdAt), 'MMM d, yyyy')}</p> */}
                      </div>
                      <div className="flex items-center gap-2">
                        {rx.status === 'DRAFT' ? (
                          <Button
                            variant="outline"
                            size="sm"
                          // onClick={() => navigate(`/medical/prescriptions/${rx.id}/edit`)}
                          >
                            <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                          // onClick={() => navigate(`/prescriptions/${rx.id}`)}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" /> View
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
