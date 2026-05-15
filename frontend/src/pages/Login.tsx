import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { adminAPI } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScanLine, ArrowRight, Loader2 } from 'lucide-react';
import { z } from 'zod';

const mobileSchema = z.string().min(10, 'Enter a valid mobile number').max(15).regex(/^\d+$/, 'Numbers only');

export default function Login() {
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const result = mobileSchema.safeParse(mobile);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      const user = await adminAPI.verifyMobile(mobile);
      console.log("This is the user:",user);
  
      if (user.success) {
        console.log("user verified");
        const facilityDetails = user.facilityDetails[0]
        
        console.log("This is the facility details:",facilityDetails);
        sessionStorage.setItem('facilityId', JSON.stringify(facilityDetails.facilityId))
        sessionStorage.setItem('facilityName', JSON.stringify(facilityDetails.facilityName));
        sessionStorage.setItem('mobile', JSON.stringify(facilityDetails.mobile));

        toast({ title: 'Welcome back!', description: `Signed in as ${facilityDetails.facilityName}` });
        navigate('/medical/facility/scanner');
      } else {
        navigate('/medical/facility/register', { state: { mobile } });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8 animate-slide-up">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl medical-gradient shadow-lg mb-4">
            <ScanLine className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">MedSignQR</h1>
          <p className="text-sm text-muted-foreground">Prescription management for medical professionals</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="glass-card rounded-xl p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Mobile Number</label>
              <Input
                type="tel"
                placeholder="Enter your mobile number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                maxLength={15}
                className="h-12 text-base"
              />
              {error && <p className="text-xs text-destructive mt-1">{error}</p>}
            </div>

            <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4 ml-2" /></>}
            </Button>
          </div>

          {/* <p className="text-xs text-center text-muted-foreground">
            Demo number: <button type="button" onClick={() => setMobile('1234567890')} className="text-primary font-medium hover:underline">1234567890</button>
          </p> */}
        </form>
      </div>
    </div>
  );
}
