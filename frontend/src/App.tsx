import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Index from "./pages/Index";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Scanner from "./pages/Scanner";
import PatientLookup from "./pages/PatientLookup";
import PrescriptionForm from "./pages/PrescriptionForm";
import PrescriptionView from "./pages/PrescriptionView";
import MedicineReport from "./pages/MedicineReport";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <Routes>
          {/* Public route — accessible by patients via QR code without login */}
          <Route path="/medical/" element={<MedicineReport />} />

          {/* All other routes require auth context */}
          <Route path="/*" element={
            <AuthProvider>
              <Routes>
                <Route path="/medical/facility/verify" element={<Index />} />
                <Route path="/medical/facility/register" element={<Register />} />
                <Route path="/medical/facility/dashboard" element={<Dashboard />} />
                <Route path="/medical/facility/scanner" element={<Scanner />} />
                <Route path="/medical/facility/patients/:medId" element={<PatientLookup />} />
                <Route path="/medical/facility/patient/*" element={<PatientLookup />} />
                <Route path="/medical/facility/prescriptions/new/:medId" element={<PrescriptionForm />} />
                <Route path="/medical/facility/prescriptions/:patientId/:medId" element={<PrescriptionView />} />
                <Route path="/medical/facility/prescriptions/:patientId/:medId/edit" element={<PrescriptionForm />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          } />
        </Routes>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
