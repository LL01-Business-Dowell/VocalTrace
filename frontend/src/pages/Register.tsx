import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { adminAPI } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Building2 } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { v4 as uuidv4 } from 'uuid';

const schema = z.object({
  facilityName: z.string().trim().min(2, 'Facility name is required').max(100),
  address: z.string().trim().min(5, 'Address is required').max(200),
  mobile: z.string().min(10).max(15).regex(/^\d+$/, 'Invalid mobile'),
});

type FormData = z.infer<typeof schema>;

export default function Register() {
  const [loading, setLoading] = useState(false);
  // const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const mobilePrefill = (location.state as { mobile?: string })?.mobile || '';

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { mobile: mobilePrefill, facilityName: '', address: '' },
  });

  const onSubmit = async (data: { facilityId: string; facilityName: string; address: string; mobile: string }) => {
    setLoading(true);
    try {
      const facilityId = uuidv4()
      const user = await adminAPI.registerFacility({
        ...data, 
        facilityId: facilityId
      });
      // console.log("data:", data);
      sessionStorage.setItem('facilityId', JSON.stringify(facilityId))
      sessionStorage.setItem('facilityName', JSON.stringify(data.facilityName));
      sessionStorage.setItem('mobile', JSON.stringify(data.mobile));

      toast({ title: 'Registration successful', description: `Welcome, ${data.facilityName}!` });
      navigate('/facility/scanner');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 animate-slide-up">
        <button onClick={() => navigate('/')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent mb-2">
            <Building2 className="w-6 h-6 text-accent-foreground" />
          </div>
          <h1 className="text-xl font-display font-bold text-foreground">Register Facility</h1>
          <p className="text-sm text-muted-foreground">Set up your pharmacy or clinic</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="glass-card rounded-xl p-6 space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Facility Name</label>
            <Input {...register('facilityName')} placeholder="City General Pharmacy" className="h-11" />
            {errors.facilityName && <p className="text-xs text-destructive mt-1">{errors.facilityName.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Address</label>
            <Input {...register('address')} placeholder="123 Medical Ave" className="h-11" />
            {errors.address && <p className="text-xs text-destructive mt-1">{errors.address.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Mobile Number</label>
            <Input {...register('mobile')} readOnly className="h-11 bg-muted" />
          </div>

          <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
          </Button>
        </form>
      </div>
    </div>
  );
}
