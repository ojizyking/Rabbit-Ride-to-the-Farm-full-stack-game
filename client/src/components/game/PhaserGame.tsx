import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import Preload from '../../game/scenes/Preload';
import FarmRide from '../../game/scenes/FarmRide';
import GameOver from '../../game/scenes/GameOver';
import { useAuth } from '../../context/AuthContext';
import { queueOfflineRide, cacheServerBalance } from '../../context/AuthContext';
import api from '../../lib/api';

interface PhaserGameProps {
  onCollect?: (item: { type: string; value: number }) => void;
  onRideEnd?: (results: {
    coins: number;
    distance: number;
    stars: number;
    carrots: number;
    boxes: number;
    adViews: number;
    nairaEarned?: number;
    newBalance?: number;
  }) => void;
}

export const PhaserGame: React.FC<PhaserGameProps> = ({ onCollect, onRideEnd }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const { user, updateBalance } = useAuth();

  // Map equipped rabbit name or id to asset key
  const getRabbitTextureKey = (): string => {
    const raw = user?.currentRabbit;
    const id = typeof raw === 'object' ? (raw?._id || '') : (raw || '');
    const name = (typeof raw === 'object' ? raw?.name : '') || '';
    if (id === 'rab_002' || name.includes('Red Hoodie')) return 'rabbit-red-hoodie';
    if (id === 'rab_003' || name.includes('Blue Aviator')) return 'rabbit-blue-aviator';
    if (id === 'rab_004' || name.includes('Farmer')) return 'rabbit-farmer-hat';
    if (id === 'rab_005' || name.includes('Ninja')) return 'rabbit-ninja';
    return 'rabbit-starter';
  };

  const getBikeTextureKey = (): string => {
    const raw = user?.currentBike;
    const id = typeof raw === 'object' ? (raw?._id || '') : (raw || '');
    const name = (typeof raw === 'object' ? raw?.name : '') || '';
    if (id === 'bike_002' || name.includes('Blue Basket')) return 'bike-blue-basket';
    if (id === 'bike_003' || name.includes('Green Bloom')) return 'bike-green-bloom';
    if (id === 'bike_004' || name.includes('Turbo Gold') || name.includes('Turbo Golden')) return 'bike-turbo-gold';
    return 'bike-starter';
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // Set globally for Phaser scene initialization
    (window as unknown as { currentEquippedRabbit: string }).currentEquippedRabbit = getRabbitTextureKey();
    (window as unknown as { currentEquippedBike: string }).currentEquippedBike = getBikeTextureKey();

    // Phaser Game Config
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: containerRef.current.clientWidth || 960,
      height: containerRef.current.clientHeight || 540,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: '100%',
        height: '100%'
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false
        }
      },
      render: {
        antialias: true,
        pixelArt: false
      },
      scene: [Preload, FarmRide, GameOver]
    };

    // Mount Phaser Game
    const game = new Phaser.Game(config);
    gameRef.current = game;

    // Listen to collectible pickup custom event
    const handleCollect = async (e: Event) => {
      const customEvent = e as CustomEvent<{ type: string; value: number }>;
      const { type, value } = customEvent.detail;

      if (onCollect) {
        onCollect({ type, value });
      }

      // Optimistic background API call to /api/game/collect
      try {
        const res = await api.post('/game/collect', { type, value });
        // Cache the updated server balance from collect response
        if (res.data?.success && res.data.newBalance !== undefined) {
          cacheServerBalance(res.data.newBalance);
        }
      } catch (err) {
        // Handled silently to never interrupt 60fps gameplay
        console.warn('Background collect sync error:', err);
      }
    };

    // Listen to ride end custom event
    const handleRideEnd = async (e: Event) => {
      const customEvent = e as CustomEvent<{
        coins: number;
        distance: number;
        stars: number;
        carrots: number;
        boxes: number;
        adViews: number;
      }>;
      const details = customEvent.detail;

      try {
        const res = await api.post('/game/end-ride', details);
        if (res.data.success) {
          if (res.data.newBalance !== undefined) {
            updateBalance(res.data.newBalance);
            // Cache the server's authoritative balance — prevents ₦50 reset on next login
            cacheServerBalance(res.data.newBalance);
          }
          if (onRideEnd) {
            onRideEnd({
              ...details,
              nairaEarned: res.data.nairaEarned,
              newBalance: res.data.newBalance
            });
          }
          return;
        }
      } catch (err) {
        console.warn('Backend ride sync offline, queueing for later sync:', err);
      }

      // ── Offline fallback: queue ride for later sync + compute local reward ──
      // Queue ride data for automatic server sync on next successful login
      queueOfflineRide(details);

      // Local calculation for immediate UI feedback: 1,000 Coins = ₦50 (20 Coins = ₦1)
      const fallbackNaira = Math.round((details.coins / 20) * 100) / 100;
      const currentBal = user?.balanceNaira !== undefined ? user.balanceNaira : Number(localStorage.getItem('rabbit_guest_balance') || 0);
      const newBal = Math.round((currentBal + fallbackNaira) * 100) / 100;

      // Update local balance for immediate UI feedback
      updateBalance(newBal);

      // Persist local transaction record
      try {
        const existingTx = JSON.parse(localStorage.getItem('rabbit_offline_transactions') || '[]');
        existingTx.unshift({
          _id: 'tx_' + Date.now(),
          type: 'earn',
          amount: fallbackNaira,
          description: `Ride reward (${(details.distance / 1000).toFixed(2)} km, ${details.coins} coins) [offline]`,
          status: 'pending_sync',
          createdAt: new Date().toISOString()
        });
        localStorage.setItem('rabbit_offline_transactions', JSON.stringify(existingTx.slice(0, 50)));
      } catch {
        // ignore
      }

      if (onRideEnd) {
        onRideEnd({
          ...details,
          nairaEarned: fallbackNaira,
          newBalance: newBal
        });
      }
    };

    window.addEventListener('game:collect', handleCollect);
    window.addEventListener('game:ride_end', handleRideEnd);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('game:collect', handleCollect);
      window.removeEventListener('game:ride_end', handleRideEnd);
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} className="game-canvas" id="phaser-game-container" />;
};

export default PhaserGame;
