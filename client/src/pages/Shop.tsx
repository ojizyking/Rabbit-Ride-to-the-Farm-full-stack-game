import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, RabbitItem, BicycleItem } from '../context/AuthContext';
import api from '../lib/api';
import { ArrowLeft, Zap, Shield, Rocket, Package, Star, Gift } from 'lucide-react';
import '../styles/shop.css';

// ─── Types ───────────────────────────────────────────────────────────────────

interface GadgetItem {
  id: string;
  name: string;
  description: string;
  priceNaira: number;
  imageUrl: string;
  effect: string;
}

interface MysteryPrize {
  type: 'coins' | 'naira' | 'rabbit' | 'bike' | 'gadget';
  label: string;
  value: number | string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface MysteryResult {
  success: boolean;
  prize: MysteryPrize;
  newBalance?: number;
}

type ShopTab = 'all' | 'rabbits' | 'bicycles' | 'gadgets' | 'mystery';

// ─── Fallback data (matches server seed) ─────────────────────────────────────

const FALLBACK_RABBITS: RabbitItem[] = [
  { _id: 'rab_001', name: 'Starter White Rabbit',  priceNaira: 0,     speed: 10, jump: 10, stamina: 10, grip: 10, drift: 10, imageUrl: '/assets/rabbits/starter_rabbit.svg',  description: 'A nimble white bunny ready to ride and earn.' },
  { _id: 'rab_002', name: 'Red Hoodie Rabbit',     priceNaira: 1000,  speed: 20, jump: 15, stamina: 20, grip: 15, drift: 12, imageUrl: '/assets/rabbits/red_hoodie.svg',      description: 'Street-smart rabbit with speed +10 and jump +5.' },
  { _id: 'rab_003', name: 'Blue Aviator Rabbit',   priceNaira: 2000,  speed: 30, jump: 20, stamina: 25, grip: 20, drift: 15, imageUrl: '/assets/rabbits/blue_aviator.svg',    description: 'Sky-cruising rabbit with speed +20 and grip +10.' },
  { _id: 'rab_004', name: 'Farmer Hat Rabbit',     priceNaira: 5000,  speed: 35, jump: 25, stamina: 35, grip: 25, drift: 20, imageUrl: '/assets/rabbits/farmer_hat.svg',      description: 'Veteran agricultural bunny with stamina +25 and carry +15.' },
  { _id: 'rab_005', name: 'Ninja Rabbit',          priceNaira: 10000, speed: 50, jump: 35, stamina: 45, grip: 35, drift: 35, imageUrl: '/assets/rabbits/ninja_rabbit.svg',    description: 'Shadow runner master rabbit with speed +40 and drift +25.' },
  { _id: 'rab_006', name: 'Chef Carrot-Flambé',   priceNaira: 1500,  speed: 22, jump: 18, stamina: 28, grip: 18, drift: 14, imageUrl: '/assets/rabbits/chef_rabbit.svg',     description: 'Master chef bunny that cooks up speed bursts and collects bonus carrots.' },
  { _id: 'rab_007', name: 'Disco Bunny',           priceNaira: 3500,  speed: 38, jump: 30, stamina: 32, grip: 28, drift: 30, imageUrl: '/assets/rabbits/disco_rabbit.svg',   description: 'Groovy rabbit that boosts coin multiplier every 10 jumps.' },
  { _id: 'rab_008', name: 'Astro-Bunny',           priceNaira: 7500,  speed: 55, jump: 50, stamina: 40, grip: 38, drift: 42, imageUrl: '/assets/rabbits/astro_rabbit.svg',   description: 'Zero-gravity bunny that floats over obstacles and doubles star value.' },
  { _id: 'rab_009', name: 'Cyber Mech Bunny',      priceNaira: 15000, speed: 70, jump: 55, stamina: 60, grip: 55, drift: 50, imageUrl: '/assets/rabbits/cyber_rabbit.svg',   description: 'Robotic bunny with auto-shield, crate magnet, and 2× balloon score.' },
];

const FALLBACK_BIKES: BicycleItem[] = [
  { _id: 'bike_001', name: 'Classic Yellow Bike',       priceNaira: 0,     speed: 10, stability: 10, boost: 10, imageUrl: '/assets/bikes/starter_bike.svg',     description: 'Reliable yellow farm bicycle with sturdy wheels.' },
  { _id: 'bike_002', name: 'Blue Basket Bike',          priceNaira: 2000,  speed: 25, stability: 30, boost: 20, imageUrl: '/assets/bikes/blue_basket.svg',       description: 'Cruiser bike with flower basket, speed +15 and stability +20.' },
  { _id: 'bike_003', name: 'Green Bloom Bike',          priceNaira: 5000,  speed: 45, stability: 40, boost: 30, imageUrl: '/assets/bikes/green_bloom.svg',       description: 'Eco-charged racing bike, speed +35 and boost +20.' },
  { _id: 'bike_004', name: 'Turbo Golden Farm Bike',    priceNaira: 10000, speed: 60, stability: 50, boost: 45, imageUrl: '/assets/bikes/turbo_gold.svg',        description: 'High performance farm cruiser with ultra nitro speed.' },
  { _id: 'bike_005', name: 'Vintage Farm Tractor',      priceNaira: 3500,  speed: 30, stability: 60, boost: 15, imageUrl: '/assets/bikes/vintage_tractor.svg',  description: 'Smashes hay bales without damage! Slow but indestructible.' },
  { _id: 'bike_006', name: 'Carrot Chopper V-Twin',     priceNaira: 7500,  speed: 65, stability: 35, boost: 55, imageUrl: '/assets/bikes/carrot_chopper.svg',   description: 'Rumbling V-twin chopper with max speed and +3× carrot value.' },
  { _id: 'bike_007', name: 'Crop-Circle Hover UFO',     priceNaira: 20000, speed: 80, stability: 70, boost: 70, imageUrl: '/assets/bikes/hover_ufo.svg',        description: 'Alien hovercraft — ignores gravity on jumps and magnets all collectibles.' },
];

const FALLBACK_GADGETS: GadgetItem[] = [
  { id: 'gadget_magnet',    name: 'Super Magnet',       priceNaira: 500,  imageUrl: '/assets/items/gadget_magnet.svg',    effect: 'Auto-collects all coins & carrots within 150px range.', description: 'Never miss a collectible again!' },
  { id: 'gadget_shield',    name: 'Golden Shield',      priceNaira: 800,  imageUrl: '/assets/items/gadget_shield.svg',    effect: 'Absorbs the first obstacle hit each ride — free extra life.', description: 'One free mistake per run.' },
  { id: 'gadget_heart',     name: 'Extra Heart',        priceNaira: 1500, imageUrl: '/assets/items/gadget_heart.svg',     effect: 'Start every ride with 4 hearts instead of 3.', description: 'More HP = more coins!' },
  { id: 'gadget_harvester', name: 'Double Harvester',   priceNaira: 2500, imageUrl: '/assets/items/gadget_harvester.svg', effect: '2× coin value for every carrot and crate collected.', description: 'Doubles your farm harvest earnings.' },
];

// ─── Rarity colours ──────────────────────────────────────────────────────────
const RARITY_COLOR: Record<string, string> = {
  common: '#78909C',
  rare: '#29B6F6',
  epic: '#CE93D8',
  legendary: '#FFD700',
};

// ─── Component ───────────────────────────────────────────────────────────────

export const Shop: React.FC = () => {
  const { user, refreshUser, updateBalance, openAuthModal } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<ShopTab>('all');
  const [rabbits, setRabbits] = useState<RabbitItem[]>([]);
  const [bicycles, setBicycles] = useState<BicycleItem[]>([]);
  const [gadgets, setGadgets] = useState<GadgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Mystery box state
  const [boxOpening, setBoxOpening] = useState<'wood' | 'gold' | null>(null);
  const [prizeResult, setPrizeResult] = useState<MysteryPrize | null>(null);
  const [showPrizeModal, setShowPrizeModal] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [rabbitsRes, bikesRes, gadgetsRes] = await Promise.allSettled([
        api.get('/shop/rabbits'),
        api.get('/shop/bicycles'),
        api.get('/shop/gadgets'),
      ]);

      setRabbits(
        rabbitsRes.status === 'fulfilled' && rabbitsRes.value.data?.rabbits
          ? rabbitsRes.value.data.rabbits
          : FALLBACK_RABBITS
      );
      setBicycles(
        bikesRes.status === 'fulfilled' && bikesRes.value.data?.bicycles
          ? bikesRes.value.data.bicycles
          : FALLBACK_BIKES
      );
      setGadgets(
        gadgetsRes.status === 'fulfilled' && gadgetsRes.value.data?.gadgets
          ? gadgetsRes.value.data.gadgets
          : FALLBACK_GADGETS
      );
    } catch {
      setRabbits(FALLBACK_RABBITS);
      setBicycles(FALLBACK_BIKES);
      setGadgets(FALLBACK_GADGETS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const extractId = (item: any): string => {
    if (!item) return '';
    if (typeof item === 'object') return (item._id || item.id || '').toString();
    return item.toString();
  };

  const isItemEquipped = (type: 'rabbit' | 'bicycle', id: string) => {
    const target = id.toString();
    if (type === 'rabbit') return extractId(user?.currentRabbit) === target;
    return extractId(user?.currentBike) === target;
  };

  const isItemOwned = (type: 'rabbit' | 'bicycle', id: string, price: number) => {
    if (price === 0) return true;
    const target = id.toString();
    if (type === 'rabbit') return (user?.ownedRabbits || []).some(r => extractId(r) === target);
    return (user?.ownedBikes || []).some(b => extractId(b) === target);
  };

  const isGadgetOwned = (gadgetId: string) =>
    (user?.ownedGadgets || []).includes(gadgetId);

  const coinEquiv = (naira: number) =>
    (naira * 100).toLocaleString();

  // ── Buy / Equip ────────────────────────────────────────────────────────────

  const handleBuyOrEquip = async (type: 'rabbit' | 'bicycle', item: RabbitItem | BicycleItem) => {
    if (!user) { openAuthModal('login'); return; }
    setActionLoadingId(item._id);
    try {
      const owned = isItemOwned(type, item._id, item.priceNaira);
      const action = owned ? 'equip' : 'buy';
      const res = await api.post('/shop/buy-or-equip', { type, itemId: item._id, action });
      if (res.data?.success) {
        showToast(res.data.message || `✅ ${item.name} ${action === 'buy' ? 'purchased' : 'equipped'}!`);
        if (res.data.newBalance !== undefined) updateBalance(res.data.newBalance);
        await refreshUser();
      } else {
        showToast(res.data?.message || 'Action failed.', 'error');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Network error — try again.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleBuyGadget = async (gadget: GadgetItem) => {
    if (!user) { openAuthModal('login'); return; }
    setActionLoadingId(gadget.id);
    try {
      const res = await api.post('/shop/buy-or-equip', { type: 'gadget', itemId: gadget.id, action: 'buy' });
      if (res.data?.success) {
        showToast(`⚡ ${gadget.name} unlocked permanently!`);
        if (res.data.newBalance !== undefined) updateBalance(res.data.newBalance);
        await refreshUser();
      } else {
        showToast(res.data?.message || 'Purchase failed.', 'error');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Network error — try again.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // ── Mystery Box ────────────────────────────────────────────────────────────

  const handleOpenBox = async (boxType: 'wood' | 'gold') => {
    if (!user) { openAuthModal('login'); return; }
    setBoxOpening(boxType);
    try {
      const res = await api.post('/shop/mystery-box', { boxType });
      if (res.data?.success) {
        const prize: MysteryPrize = res.data.prize;
        if (res.data.newBalance !== undefined) updateBalance(res.data.newBalance);
        await refreshUser();
        setPrizeResult(prize);
        setShowPrizeModal(true);
        setConfettiActive(true);
        setTimeout(() => setConfettiActive(false), 4000);
      } else {
        showToast(res.data?.message || 'Could not open box.', 'error');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Network error — try again.', 'error');
    } finally {
      setBoxOpening(null);
    }
  };

  // ── Render helpers ─────────────────────────────────────────────────────────

  const TabButton = ({ tab, label, emoji }: { tab: ShopTab; label: string; emoji: string }) => (
    <button
      className={`shop-tab-btn ${activeTab === tab ? 'shop-tab-active' : ''}`}
      onClick={() => setActiveTab(tab)}
    >
      {emoji} {label}
    </button>
  );

  const RabbitCard = ({ rabbit }: { rabbit: RabbitItem }) => {
    const equipped = isItemEquipped('rabbit', rabbit._id);
    const owned = isItemOwned('rabbit', rabbit._id, rabbit.priceNaira);
    const isBusy = actionLoadingId === rabbit._id;
    return (
      <div className={`shop-card ${equipped ? 'equipped-card' : ''}`}>
        {equipped ? <span className="card-equipped-badge">ACTIVE</span>
          : owned ? <span className="card-owned-badge">OWNED</span> : null}
        <div className="shop-card-image-box">
          <img src={rabbit.imageUrl} alt={rabbit.name}
            onError={e => { (e.currentTarget as HTMLImageElement).src = '/assets/rabbits/starter_rabbit.svg'; }} />
        </div>
        <h3 className="shop-card-name">{rabbit.name}</h3>
        {rabbit.description && <p className="shop-card-desc">{rabbit.description}</p>}
        <div className="shop-card-stats-grid">
          <span className="stat-pill"><Zap size={14} color="#FF7A00" /> Speed +{rabbit.speed}</span>
          <span className="stat-pill"><Rocket size={14} color="#00C853" /> Jump +{rabbit.jump}</span>
          {rabbit.stamina && <span className="stat-pill"><Shield size={14} color="#29B6F6" /> Stamina +{rabbit.stamina}</span>}
        </div>
        <div className="shop-card-bottom">
          <div className="shop-price-tag">
            <span style={{ fontSize: '1.2rem' }}>🐰</span>
            <span>
              {rabbit.priceNaira > 0
                ? <>₦{rabbit.priceNaira.toLocaleString()} <small style={{opacity:0.7}}>({coinEquiv(rabbit.priceNaira)} coins)</small></>
                : 'FREE STARTER'}
            </span>
          </div>
          {equipped ? (
            <button className="shop-btn-active" disabled>EQUIPPED</button>
          ) : owned ? (
            <button onClick={() => handleBuyOrEquip('rabbit', rabbit)} disabled={isBusy} className="shop-btn-equip">
              {isBusy ? 'EQUIPPING…' : 'EQUIP'}
            </button>
          ) : (
            <button onClick={() => handleBuyOrEquip('rabbit', rabbit)} disabled={isBusy} className="shop-btn-buy">
              {isBusy ? 'BUYING…' : 'BUY'}
            </button>
          )}
        </div>
      </div>
    );
  };

  const BikeCard = ({ bike }: { bike: BicycleItem }) => {
    const equipped = isItemEquipped('bicycle', bike._id);
    const owned = isItemOwned('bicycle', bike._id, bike.priceNaira);
    const isBusy = actionLoadingId === bike._id;
    return (
      <div className={`shop-card ${equipped ? 'equipped-card' : ''}`}>
        {equipped ? <span className="card-equipped-badge">ACTIVE</span>
          : owned ? <span className="card-owned-badge">OWNED</span> : null}
        <div className="shop-card-image-box">
          <img src={bike.imageUrl} alt={bike.name}
            onError={e => { (e.currentTarget as HTMLImageElement).src = '/assets/bikes/starter_bike.svg'; }} />
        </div>
        <h3 className="shop-card-name">{bike.name}</h3>
        {bike.description && <p className="shop-card-desc">{bike.description}</p>}
        <div className="shop-card-stats-grid">
          <span className="stat-pill"><Zap size={14} color="#FF7A00" /> Speed +{bike.speed}</span>
          <span className="stat-pill"><Shield size={14} color="#29B6F6" /> Stability +{bike.stability}</span>
          {bike.boost && <span className="stat-pill"><Rocket size={14} color="#00C853" /> Boost +{bike.boost}</span>}
        </div>
        <div className="shop-card-bottom">
          <div className="shop-price-tag">
            <span style={{ fontSize: '1.2rem' }}>🚜</span>
            <span>
              {bike.priceNaira > 0
                ? <>₦{bike.priceNaira.toLocaleString()} <small style={{opacity:0.7}}>({coinEquiv(bike.priceNaira)} coins)</small></>
                : 'FREE STARTER'}
            </span>
          </div>
          {equipped ? (
            <button className="shop-btn-active" disabled>EQUIPPED</button>
          ) : owned ? (
            <button onClick={() => handleBuyOrEquip('bicycle', bike)} disabled={isBusy} className="shop-btn-equip">
              {isBusy ? 'EQUIPPING…' : 'EQUIP'}
            </button>
          ) : (
            <button onClick={() => handleBuyOrEquip('bicycle', bike)} disabled={isBusy} className="shop-btn-buy">
              {isBusy ? 'BUYING…' : 'BUY'}
            </button>
          )}
        </div>
      </div>
    );
  };

  const GadgetCard = ({ gadget }: { gadget: GadgetItem }) => {
    const owned = isGadgetOwned(gadget.id);
    const isBusy = actionLoadingId === gadget.id;
    return (
      <div className={`shop-card gadget-card ${owned ? 'equipped-card' : ''}`}>
        {owned && <span className="card-equipped-badge">ACTIVE</span>}
        <div className="shop-card-image-box">
          <img src={gadget.imageUrl} alt={gadget.name}
            onError={e => { (e.currentTarget as HTMLImageElement).src = '/assets/items/gadget_magnet.svg'; }} />
        </div>
        <h3 className="shop-card-name">{gadget.name}</h3>
        <p className="shop-card-desc">{gadget.description}</p>
        <div className="gadget-effect-pill">
          <Zap size={12} color="#FFD700" />
          <span>{gadget.effect}</span>
        </div>
        <div className="shop-card-bottom">
          <div className="shop-price-tag">
            <span style={{ fontSize: '1.2rem' }}>⚡</span>
            <span>
              ₦{gadget.priceNaira.toLocaleString()} <small style={{opacity:0.7}}>({coinEquiv(gadget.priceNaira)} coins)</small>
            </span>
          </div>
          {owned ? (
            <button className="shop-btn-active" disabled>UNLOCKED ✓</button>
          ) : (
            <button onClick={() => handleBuyGadget(gadget)} disabled={isBusy} className="shop-btn-buy">
              {isBusy ? 'BUYING…' : 'UNLOCK'}
            </button>
          )}
        </div>
      </div>
    );
  };

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="shop-page">
      {/* Toast */}
      {toastMessage && (
        <div className={`shop-toast ${toastType === 'error' ? 'shop-toast-error' : ''}`}>
          {toastMessage}
        </div>
      )}

      {/* Prize Modal */}
      {showPrizeModal && prizeResult && (
        <div className="mystery-modal-overlay" onClick={() => { setShowPrizeModal(false); setPrizeResult(null); }}>
          <div className="mystery-modal" onClick={e => e.stopPropagation()}>
            {confettiActive && (
              <div className="confetti-wrap">
                {[...Array(24)].map((_, i) => (
                  <div key={i} className={`confetti-piece c${(i % 6) + 1}`}
                    style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 0.8}s` }} />
                ))}
              </div>
            )}
            <div className="mystery-prize-rarity" style={{ color: RARITY_COLOR[prizeResult.rarity] }}>
              ★ {prizeResult.rarity.toUpperCase()}
            </div>
            <div className="mystery-prize-icon">🎁</div>
            <h2 className="mystery-prize-label">{prizeResult.label}</h2>
            <p className="mystery-prize-sub">Added to your account!</p>
            <button className="shop-btn-equip" style={{ marginTop: '1rem' }}
              onClick={() => { setShowPrizeModal(false); setPrizeResult(null); }}>
              Awesome! 🎉
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="shop-header">
        <button className="shop-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} /> Back
        </button>
        <h1 className="shop-title">🌾 Farm Shop</h1>
        {user && (
          <div className="shop-balance">
            💰 ₦{(user.balanceNaira || 0).toLocaleString()}
          </div>
        )}
      </div>

      {/* Free-rider banner */}
      {(!user?.subscriptionTier || user.subscriptionTier === 'free') && (
        <div className="shop-free-banner">
          🔒 Free Rider Cap: <strong>₦50 / run (5,000 coins)</strong> — Buy any item to unlock unlimited earnings!
        </div>
      )}

      {/* Tabs */}
      <div className="shop-tabs">
        <TabButton tab="all"      label="ALL"      emoji="🌟" />
        <TabButton tab="rabbits"  label="RABBITS"  emoji="🐰" />
        <TabButton tab="bicycles" label="VEHICLES"  emoji="🚜" />
        <TabButton tab="gadgets"  label="GADGETS"  emoji="⚡" />
        <TabButton tab="mystery"  label="MYSTERY"  emoji="🎁" />
      </div>

      {/* Loading */}
      {loading ? (
        <div className="shop-loading">
          <div className="shop-spinner" />
          <p>Loading farm shop…</p>
        </div>
      ) : (
        <>
          {/* ── Mystery Box ───────────────────────────────────────────── */}
          {(activeTab === 'all' || activeTab === 'mystery') && (
            <div className="mystery-section">
              <h2 className="mystery-section-title">🎁 Mystery Boxes</h2>
              <p className="mystery-section-sub">Spin the farm gacha — every box hides a surprise reward!</p>
              <div className="mystery-boxes-row">
                {/* Wooden Box */}
                <div className="mystery-box-card wood-box">
                  <div className="mystery-box-icon">📦</div>
                  <h3>Wooden Crate</h3>
                  <p className="mystery-box-desc">Common to Rare prizes — coins, bonus naira, or starter items.</p>
                  <div className="mystery-box-prizes">
                    <span className="prize-tag" style={{color: RARITY_COLOR.common}}>🪙 Coins</span>
                    <span className="prize-tag" style={{color: RARITY_COLOR.rare}}>💵 Bonus ₦</span>
                    <span className="prize-tag" style={{color: RARITY_COLOR.epic}}>🐰 Rare Rabbit</span>
                  </div>
                  <div className="mystery-box-price">₦100 <small>(10,000 coins)</small></div>
                  <button
                    className="shop-btn-buy mystery-open-btn"
                    disabled={boxOpening !== null}
                    onClick={() => handleOpenBox('wood')}
                  >
                    {boxOpening === 'wood' ? '🎲 Spinning…' : '🎁 OPEN BOX'}
                  </button>
                </div>

                {/* Golden Barn Vault */}
                <div className="mystery-box-card gold-box">
                  <div className="mystery-box-icon">🏆</div>
                  <h3>Golden Barn Vault</h3>
                  <p className="mystery-box-desc">Rare to Legendary prizes — premium items, big naira, or ultimate rabbits!</p>
                  <div className="mystery-box-prizes">
                    <span className="prize-tag" style={{color: RARITY_COLOR.rare}}>⚡ Gadget</span>
                    <span className="prize-tag" style={{color: RARITY_COLOR.epic}}>💰 Big ₦ Prize</span>
                    <span className="prize-tag" style={{color: RARITY_COLOR.legendary}}>🌟 Legendary</span>
                  </div>
                  <div className="mystery-box-price">₦500 <small>(50,000 coins)</small></div>
                  <button
                    className="shop-btn-buy mystery-open-btn gold-open-btn"
                    disabled={boxOpening !== null}
                    onClick={() => handleOpenBox('gold')}
                  >
                    {boxOpening === 'gold' ? '🎲 Spinning…' : '🏆 OPEN VAULT'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Gadgets ──────────────────────────────────────────────── */}
          {(activeTab === 'all' || activeTab === 'gadgets') && (
            <div className="gadgets-section">
              <h2 className="mystery-section-title">⚡ Permanent Gadgets</h2>
              <p className="mystery-section-sub">One-time purchase — active on every ride forever!</p>
              <div className="shop-grid">
                {gadgets.map(g => <GadgetCard key={g.id} gadget={g} />)}
              </div>
            </div>
          )}

          {/* ── Rabbits + Bikes ───────────────────────────────────────── */}
          <div className="shop-grid">
            {(activeTab === 'all' || activeTab === 'rabbits') &&
              rabbits.map(r => <RabbitCard key={r._id} rabbit={r} />)}
            {(activeTab === 'all' || activeTab === 'bicycles') &&
              bicycles.map(b => <BikeCard key={b._id} bike={b} />)}
          </div>

          {/* Footer banner */}
          <div className="shop-bottom-banner">
            <span>🎮</span>
            <span>Equip your best gear and ride to victory! All items permanently saved to your farm wallet.</span>
            <span>🌾</span>
          </div>
        </>
      )}
    </div>
  );
};

export default Shop;
