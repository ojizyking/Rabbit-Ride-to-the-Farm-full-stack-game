import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../pwa/usePWAInstall';
import { Download, X, Share, PlusSquare, Sparkles } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, installApp } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    const dismissedUntil = localStorage.getItem('rabbit_pwa_dismissed');
    if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
      setIsDismissed(true);
    }
  }, []);

  if (isInstalled || isDismissed) return null;
  // Only display if installable on Chrome/Android, or if iOS Safari user who hasn't installed
  if (!isInstallable && !isIOS) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    // Remember dismissal for 2 days
    localStorage.setItem('rabbit_pwa_dismissed', String(Date.now() + 2 * 24 * 60 * 60 * 1000));
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIosGuide(true);
    } else {
      const ok = await installApp();
      if (!ok) handleDismiss();
    }
  };

  return (
    <>
      <div
        className="pwa-install-banner"
        style={{
          position: 'fixed',
          bottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 2rem)',
          maxWidth: '480px',
          background: 'linear-gradient(135deg, #1B3824 0%, #2D8A4E 100%)',
          color: '#FFFFFF',
          borderRadius: '16px',
          padding: '0.85rem 1.15rem',
          boxShadow: '0 12px 32px rgba(27, 56, 36, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.85rem',
          zIndex: 9999,
          border: '1.5px solid rgba(255, 201, 60, 0.4)',
          animation: 'pwaSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
          <img
            src="/assets/icons/icon-192.png"
            alt="Rabbit Ride Icon"
            style={{ width: '42px', height: '42px', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.3px', color: '#FFF' }}>
                Install Rabbit Ride App
              </span>
              <Sparkles size={14} color="#FFC93C" />
            </div>
            <div style={{ fontSize: '0.78rem', opacity: 0.88, color: '#E8F5E9', marginTop: '2px' }}>
              Fullscreen gaming &bull; Instant offline launch
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={handleInstallClick}
            style={{
              background: 'linear-gradient(135deg, #FFC93C 0%, #FF7A00 100%)',
              color: '#1B3824',
              fontWeight: 800,
              fontSize: '0.84rem',
              padding: '0.55rem 0.95rem',
              borderRadius: '9999px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              boxShadow: '0 4px 12px rgba(255, 122, 0, 0.35)'
            }}
          >
            <Download size={15} />
            <span>Install</span>
          </button>

          <button
            onClick={handleDismiss}
            aria-label="Dismiss install banner"
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* iOS Safari Installation Guide Modal */}
      {showIosGuide && (
        <div
          className="modal-overlay"
          onClick={() => setShowIosGuide(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1.25rem'
          }}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '1.75rem',
              maxWidth: '380px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
              border: '2px solid #C8E6C9'
            }}
          >
            <img
              src="/assets/icons/icon-192.png"
              alt="Rabbit Ride"
              style={{ width: '64px', height: '64px', borderRadius: '16px', margin: '0 auto 1rem', display: 'block' }}
            />
            <h3 style={{ fontSize: '1.25rem', color: '#1B3824', fontWeight: 800, marginBottom: '0.5rem' }}>
              Install on iPhone or iPad
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#607D8B', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Enjoy full-screen farm rides directly from your Home Screen with no app store download required:
            </p>

            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#F1F8E9', padding: '0.75rem 1rem', borderRadius: '12px' }}>
                <div style={{ width: '32px', height: '32px', background: '#2D8A4E', borderRadius: '50%', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                  1
                </div>
                <div style={{ fontSize: '0.85rem', color: '#2C3E50', fontWeight: 600 }}>
                  Tap the <Share size={15} style={{ verticalAlign: 'middle', margin: '0 3px', color: '#007AFF' }} /> <strong>Share</strong> button in Safari toolbar
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#F1F8E9', padding: '0.75rem 1rem', borderRadius: '12px' }}>
                <div style={{ width: '32px', height: '32px', background: '#2D8A4E', borderRadius: '50%', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                  2
                </div>
                <div style={{ fontSize: '0.85rem', color: '#2C3E50', fontWeight: 600 }}>
                  Scroll down &amp; tap <PlusSquare size={15} style={{ verticalAlign: 'middle', margin: '0 3px', color: '#2D8A4E' }} /> <strong>Add to Home Screen</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#F1F8E9', padding: '0.75rem 1rem', borderRadius: '12px' }}>
                <div style={{ width: '32px', height: '32px', background: '#2D8A4E', borderRadius: '50%', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                  3
                </div>
                <div style={{ fontSize: '0.85rem', color: '#2C3E50', fontWeight: 600 }}>
                  Tap <strong>Add</strong> in the top-right corner!
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIosGuide(false)}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '0.85rem' }}
            >
              Got it, let&apos;s ride! 🐰
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PWAInstallPrompt;
