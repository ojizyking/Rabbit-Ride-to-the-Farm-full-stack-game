import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import Landing from './pages/Landing';
import Play from './pages/Play';
import Shop from './pages/Shop';
import Wallet from './pages/Wallet';
import './styles/index.css';

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
        <div className="app-container">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/play" element={<Play />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/wallet" element={<Wallet />} />
            </Routes>
          </main>
          <AuthModal />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
