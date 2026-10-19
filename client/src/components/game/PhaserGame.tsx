import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import Preload from '../../game/scenes/Preload';
import FarmRide from '../../game/scenes/FarmRide';
import GameOver from '../../game/scenes/GameOver';
import { useAuth } from '../../context/AuthContext';
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
    const name = user?.currentRabbit?.name || '';
    if (name.includes('Red Hoodie')) return 'rabbit-red-hoodie';
    if (name.includes('Blue Aviator')) return 'rabbit-blue-aviator';
    if (name.includes('Farmer')) return 'rabbit-farmer-hat';
    if (name.includes('Ninja')) return 'rabbit-ninja';
    return 'rabbit-starter';
  };

  const getBikeTextureKey = (): string => {
    const name = user?.currentBike?.name || '';
    if (name.includes('Blue Basket')) return 'bike-blue-basket';
    if (name.includes('Green Bloom')) return 'bike-green-bloom';
    if (name.includes('Turbo Gold')) return 'bike-turbo-gold';
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
        await api.post('/game/collect', { type, value });
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
          }
          if (onRideEnd) {
            onRideEnd({
              ...details,
              nairaEarned: res.data.nairaEarned,
              newBalance: res.data.newBalance
            });
          }
        }
      } catch (err) {
        console.error('Error recording ride end:', err);
        if (onRideEnd) {
          const fallbackNaira = Math.round((details.coins / 10) * 100) / 100;
          onRideEnd({
            ...details,
            nairaEarned: fallbackNaira,
            newBalance: (user?.balanceNaira || 0) + fallbackNaira
          });
        }
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
