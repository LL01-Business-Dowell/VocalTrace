import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { facilityAPI } from '@/services/api';
import type { Prescription } from '@/types';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScanLine, Plus, FileText, Search, Loader2, Clock, CheckCircle2, Pencil, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    facilityAPI.fetchPrescriptions(user.id)
      .then((res) => {
      if (res.success && res.prescriptions) {
        setPrescriptions(res.prescriptions);
      } else {
        setPrescriptions([]);
      }
    })
  });
    
  const filtered = prescriptions.filter(
    (p) => p.patientId.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Welcome */}
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">Welcome back</h1>
          <p className="text-sm text-muted-foreground">{user?.facilityName}</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/facility/scanner')}
            className="medical-gradient-subtle rounded-xl p-4 text-left border border-primary/10 hover:border-primary/30 transition-colors group"
          >
            <ScanLine className="w-6 h-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-sm font-semibold text-foreground">Scan QR</div>
            <div className="text-xs text-muted-foreground">Scan medicine code</div>
          </button>
          <button
            onClick={() => navigate('/facility/prescriptions/new')}
            className="bg-card rounded-xl p-4 text-left border border-border hover:border-primary/30 transition-colors group"
          >
            <Plus className="w-6 h-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-sm font-semibold text-foreground">New Rx</div>
            <div className="text-xs text-muted-foreground">Create prescription</div>
          </button>
        </div>

        {/* Prescriptions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> Prescriptions
            </h2>
            <span className="text-xs text-muted-foreground">{prescriptions.length} total</span>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by Patient ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No prescriptions found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((rx) => (
                <div
                  key={rx.id}
                  className="w-full glass-card rounded-xl p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">Patient {rx.patientId}</span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${rx.status === 'DRAFT' ? 'status-draft' : 'status-finalized'}`}>
                          {rx.status === 'DRAFT' ? <><Clock className="w-3 h-3 inline mr-0.5" />Draft</> : <><CheckCircle2 className="w-3 h-3 inline mr-0.5" />Final</>}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {rx.medicines.length} medicine{rx.medicines.length !== 1 ? 's' : ''} · {format(new Date(rx.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                    {rx.status === 'DRAFT' ? (
                      <Button variant="outline" size="sm" onClick={() => navigate(`/facility/prescriptions/${rx.id}/edit`)}>
                        <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/facility/prescriptions/${rx.id}`)}>
                        <Eye className="w-3.5 h-3.5 mr-1" /> View
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
