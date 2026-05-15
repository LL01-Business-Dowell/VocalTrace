import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Login from './Login';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/medical/scanner', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) return null;
  return <Login />;
};

export default Index;
