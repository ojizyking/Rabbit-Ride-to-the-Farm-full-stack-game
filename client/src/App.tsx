import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import RabbitRunningLoader from './components/common/RabbitRunningLoader';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Play from './pages/Play';
import Shop from './pages/Shop';
import Wallet from './pages/Wallet';
import Admin from './pages/Admin';
import api from './lib/api';
import './styles/index.css';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();

  // Periodic heartbeat for live presence and online user tracking
  useEffect(() => {
    const sendHeartbeat = () => {
      try {
        api.post('/telemetry/heartbeat', {
          userId: user?.id,
          email: user?.email,
          role: user?.role || 'user',
          activity: window.location.pathname.includes('/play') ? 'riding' : 'browsing'
        }).catch(() => {});
      } catch {
        // ignore
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [user]);

  if (isLoading) {
    return <RabbitRunningLoader fullscreen={true} />;
  }

  return (
    <div className="app-container">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={user ? <Dashboard /> : <Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/play" element={<Play />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
      <AuthModal />
      <PWAInstallPrompt />
    </div>
  );
};

export const App: React.FC = () => {
  // Capture ?ref=CODE query param on entry
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref) {
        localStorage.setItem('rabbit_referral_code', ref.toUpperCase().trim());
      }
    } catch {
      // ignore
    }
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
