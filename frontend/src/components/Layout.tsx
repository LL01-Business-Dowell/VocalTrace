import { useAuth } from '@/context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Home, ScanLine, FileText, Menu, X } from 'lucide-react';
import { useState } from 'react';
import TransparentLogo from '@/assets/TransparentLogo.png';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/scanner', label: 'Scan QR', icon: ScanLine },
    { path: '/patients', label: 'Patients', icon: FileText },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="medical-gradient text-primary-foreground sticky top-0 z-50 shadow-md">
        <div className="container flex items-center justify-between h-14 px-4">
          <button onClick={() => navigate('/facility/dashboard')} className="flex items-center gap-2 font-display font-bold text-lg tracking-tight">
            <img
            src={TransparentLogo}
            alt="VocalTrace Logo"
            className="w-32 h-auto object-contain"
          />
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive(item.path) ? 'bg-primary-foreground/20' : 'hover:bg-primary-foreground/10'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
            <div className="w-px h-6 bg-primary-foreground/20 mx-2" />
            <span className="text-xs opacity-80 mr-2 max-w-[120px] truncate">{user?.facilityName}</span>
            <button onClick={() => { logout(); navigate('/'); }} className="p-1.5 rounded-md hover:bg-primary-foreground/10">
              <LogOut className="w-4 h-4" />
            </button>
          </nav>

          {/* Mobile menu toggle */}
          <button className="md:hidden p-1.5" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <nav className="md:hidden border-t border-primary-foreground/10 pb-3 px-4 animate-slide-up">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setMenuOpen(false); }}
                className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-md text-sm font-medium mt-1 ${
                  isActive(item.path) ? 'bg-primary-foreground/20' : 'hover:bg-primary-foreground/10'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
            <div className="border-t border-primary-foreground/10 mt-2 pt-2">
              <div className="text-xs opacity-70 px-3 mb-1">{user?.facilityName}</div>
              <button
                onClick={() => { logout(); navigate('/'); setMenuOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm hover:bg-primary-foreground/10"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </nav>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 container px-4 py-6 max-w-2xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
