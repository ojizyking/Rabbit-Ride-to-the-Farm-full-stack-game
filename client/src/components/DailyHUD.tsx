import React, { useEffect, useState, useCallback } from 'react';
import { fetchDailyStatus, DailyStatus } from '../lib/api';
import { TrendingUp, Tv, Zap, Clock } from 'lucide-react';

interface Props {
  compact?: boolean;
}

const BASE_GAME_CAP  = 15000;
const AD_TOTAL_CAP   = 50000;
const MAX_ADS        = 10;

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 8, overflow: 'hidden', height: 8 }}>
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          borderRadius: 8,
          transition: 'width 0.5s ease'
        }}
      />
    </div>
  );
}

export const DailyHUD: React.FC<Props> = ({ compact = false }) => {
  const [status, setStatus]   = useState<DailyStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await fetchDailyStatus();
      setStatus(data);
    } catch {
      // silent — HUD is non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  if (loading) return null;
  if (!status)  return null;

  const gameCoins    = status.dailyCoinsEarned || 0;
  const adCoins      = status.dailyAdCoinsEarned || 0;
  const totalCoins   = gameCoins + adCoins;
  const adsWatched   = status.dailyAdsWatched || 0;
  const boostPct     = status.boostPct || 0;

  const gameFull     = gameCoins >= BASE_GAME_CAP;
  const adFull       = adsWatched >= MAX_ADS;
  const totalFull    = totalCoins >= AD_TOTAL_CAP;

  // Coin expiry warning
  let expiryWarning: string | null = null;
  if (status.coinExpiresAt) {
    const daysLeft = Math.ceil((new Date(status.coinExpiresAt).getTime() - Date.now()) / 86400000);
    if (daysLeft <= 2) expiryWarning = `⚠️ Play coins expire in ${daysLeft} day(s)! Keep playing.`;
  }

  if (compact) {
    return (
      <div style={{
        background: 'rgba(0,0,0,0.6)',
        borderRadius: 12,
        padding: '8px 14px',
        display: 'flex',
        gap: 14,
        alignItems: 'center',
        fontSize: 13,
        color: '#fff'
      }}>
        <span title="Game earnings today">
          <TrendingUp size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          {(gameCoins / 1000).toFixed(1)}/₦15
        </span>
        <span title="Ads watched today">
          <Tv size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          {adsWatched}/{MAX_ADS} ads
        </span>
        {boostPct > 0 && (
          <span style={{ color: '#FFD700' }} title="Active pack boost">
            <Zap size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            +{boostPct}%
          </span>
        )}
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
      borderRadius: 16,
      padding: 20,
      color: '#fff',
      marginBottom: 16,
      border: '1px solid rgba(255,255,255,0.1)'
    }}>
      <h3 style={{ margin: '0 0 14px 0', fontSize: 15, fontWeight: 700, letterSpacing: 0.5 }}>
        📊 Today's Earnings
      </h3>

      {/* Game Earnings Bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <TrendingUp size={13} /> Game Earnings
          </span>
          <span style={{ color: gameFull ? '#FF7043' : '#81C784' }}>
            {(gameCoins / 1000).toFixed(2)} / ₦15
            {gameFull && ' — CAPPED'}
          </span>
        </div>
        <ProgressBar value={gameCoins} max={BASE_GAME_CAP} color={gameFull ? '#FF7043' : '#66BB6A'} />
      </div>

      {/* Ad Earnings Bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Tv size={13} /> Ad Bonus ({adsWatched}/{MAX_ADS} ads)
          </span>
          <span style={{ color: adFull ? '#FF7043' : '#29B6F6' }}>
            {(adCoins / 1000).toFixed(2)} / ₦35 bonus
            {adFull && ' — DONE'}
          </span>
        </div>
        <ProgressBar value={adCoins} max={35000} color={adFull ? '#FF7043' : '#29B6F6'} />
      </div>

      {/* Total Bar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
          <span>Total Today</span>
          <span style={{ color: totalFull ? '#FF7043' : '#FFD700' }}>
            {(totalCoins / 1000).toFixed(2)} / ₦50
          </span>
        </div>
        <ProgressBar value={totalCoins} max={AD_TOTAL_CAP} color={totalFull ? '#FF7043' : '#FFD700'} />
      </div>

      {/* Boost + status messages */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {boostPct > 0 && (
          <span style={{
            background: 'rgba(255,215,0,0.15)',
            border: '1px solid #FFD700',
            borderRadius: 20,
            padding: '3px 10px',
            fontSize: 12,
            color: '#FFD700'
          }}>
            <Zap size={11} style={{ verticalAlign: 'middle' }} /> +{boostPct}% Pack Boost
          </span>
        )}
        {totalFull && (
          <span style={{
            background: 'rgba(255,112,67,0.15)',
            border: '1px solid #FF7043',
            borderRadius: 20,
            padding: '3px 10px',
            fontSize: 12,
            color: '#FF7043'
          }}>
            🌙 Daily limit reached. See you tomorrow!
          </span>
        )}
        {adFull && !totalFull && (
          <span style={{
            background: 'rgba(41,182,246,0.15)',
            border: '1px solid #29B6F6',
            borderRadius: 20,
            padding: '3px 10px',
            fontSize: 12,
            color: '#29B6F6'
          }}>
            📺 Come back tomorrow for more ad rewards
          </span>
        )}
        {status.withdrawableNaira > 0 && (
          <span style={{
            background: 'rgba(102,187,106,0.15)',
            border: '1px solid #66BB6A',
            borderRadius: 20,
            padding: '3px 10px',
            fontSize: 12,
            color: '#66BB6A'
          }}>
            💰 ₦{status.withdrawableNaira.toFixed(2)} withdrawable
          </span>
        )}
      </div>

      {expiryWarning && (
        <div style={{
          marginTop: 10,
          background: 'rgba(255,152,0,0.15)',
          border: '1px solid #FF9800',
          borderRadius: 8,
          padding: '6px 10px',
          fontSize: 12,
          color: '#FF9800',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <Clock size={12} /> {expiryWarning}
        </div>
      )}
    </div>
  );
};

export default DailyHUD;

