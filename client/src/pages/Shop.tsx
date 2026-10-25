import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, RabbitItem, BicycleItem } from '../context/AuthContext';
import api from '../lib/api';
import { ArrowLeft, Check, Sparkles, Coins, Zap, Shield, Rocket } from 'lucide-react';
import '../styles/shop.css';

export const Shop: React.FC = () => {
  const { user, token, openAuthModal, refreshUser, updateBalance } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'all' | 'rabbits' | 'bicycles'>('all');
  const [rabbits, setRabbits] = useState<RabbitItem[]>([]);
  const [bicycles, setBicycles] = useState<BicycleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchShopItems();
  }, []);

  const fetchShopItems = async () => {
    try {
      setLoading(true);
      const [rabbitsRes, bikesRes] = await Promise.all([
        api.get('/shop/rabbits'),
        api.get('/shop/bicycles')
      ]);

      if (rabbitsRes.data?.success && Array.isArray(rabbitsRes.data.rabbits)) {
        setRabbits(rabbitsRes.data.rabbits);
      }
      if (bikesRes.data?.success && Array.isArray(bikesRes.data.bicycles)) {
        setBicycles(bikesRes.data.bicycles);
      }
    } catch (err) {
      console.warn('Shop API unreachable, loading fallback items:', err);
      // Synchronized with server seed items
      setRabbits([
        { _id: 'rab_001', name: 'Starter White Rabbit', priceNaira: 0, speed: 10, jump: 10, stamina: 10, grip: 10, drift: 10, imageUrl: '/assets/rabbits/starter_rabbit.svg', description: 'A nimble white bunny ready to ride and earn.' },
        { _id: 'rab_002', name: 'Red Hoodie Rabbit', priceNaira: 1000, speed: 20, jump: 15, stamina: 20, grip: 15, drift: 12, imageUrl: '/assets/rabbits/red_hoodie.svg', description: 'Street-smart rabbit with speed +10 and jump +5.' },
        { _id: 'rab_003', name: 'Blue Aviator Rabbit', priceNaira: 2000, speed: 30, jump: 20, stamina: 25, grip: 20, drift: 15, imageUrl: '/assets/rabbits/blue_aviator.svg', description: 'Sky-cruising rabbit with speed +20 and grip +10.' },
        { _id: 'rab_004', name: 'Farmer Hat Rabbit', priceNaira: 5000, speed: 35, jump: 25, stamina: 35, grip: 25, drift: 20, imageUrl: '/assets/rabbits/farmer_hat.svg', description: 'Veteran agricultural bunny with stamina +25 and carry +15.' },
        { _id: 'rab_005', name: 'Ninja Rabbit', priceNaira: 10000, speed: 50, jump: 35, stamina: 45, grip: 35, drift: 35, imageUrl: '/assets/rabbits/ninja_rabbit.svg', description: 'Shadow runner master rabbit with speed +40 and drift +25.' }
      ]);
      setBicycles([
        { _id: 'bike_001', name: 'Classic Yellow Bike', priceNaira: 0, speed: 10, stability: 10, boost: 10, imageUrl: '/assets/bikes/starter_bike.svg', description: 'Reliable yellow farm bicycle with sturdy wheels.' },
        { _id: 'bike_002', name: 'Blue Basket Bike', priceNaira: 2000, speed: 25, stability: 30, boost: 20, imageUrl: '/assets/bikes/blue_basket.svg', description: 'Cruiser bike with flower basket, speed +15 and stability +20.' },
        { _id: 'bike_003', name: 'Green Bloom Bike', priceNaira: 5000, speed: 45, stability: 40, boost: 30, imageUrl: '/assets/bikes/green_bloom.svg', description: 'Eco-charged racing bike, speed +35 and boost +20.' },
        { _id: 'bike_004', name: 'Turbo Golden Farm Bike', priceNaira: 10000, speed: 60, stability: 50, boost: 45, imageUrl: '/assets/bikes/turbo_gold.svg', description: 'High performance farm cruiser with ultra nitro speed.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Robust ID extractor supporting string, ObjectId, and populated objects
  const extractId = (item: any): string => {
    if (!item) return '';
    if (typeof item === 'object') return (item._id || item.id || '').toString();
    return item.toString();
  };

  const isItemEquipped = (type: 'rabbit' | 'bicycle', id: string) => {
    const target = id.toString();
    if (type === 'rabbit') {
      const current = extractId(user?.currentRabbit);
      return current === target;
    } else {
      const current = extractId(user?.currentBike);
      return current === target;
    }
  };

  const isItemOwned = (type: 'rabbit' | 'bicycle', id: string, price: number) => {
    if (price === 0) return true;
    const target = id.toString();
    if (type === 'rabbit') {
      return (user?.ownedRabbits || []).some((rab) => extractId(rab) === target);
    } else {
      return (user?.ownedBikes || []).some((bike) => extractId(bike) === target);
    }
  };

  const handleBuyOrEquip = async (itemType: 'rabbit' | 'bicycle', item: RabbitItem | BicycleItem) => {
    if (!token) {
      openAuthModal('login');
      return;
    }

    // Support offline / demo mode
    if (token.startsWith('offline_')) {
      const isOwned = isItemOwned(itemType, item._id, item.priceNaira);
      if (isOwned) {
        if (user) {
          if (itemType === 'rabbit') {
            user.currentRabbit = item as RabbitItem;
            if (!user.ownedRabbits?.some((r) => extractId(r) === item._id)) {
              user.ownedRabbits = [...(user.ownedRabbits || []), item as RabbitItem];
            }
          } else {
            user.currentBike = item as BicycleItem;
            if (!user.ownedBikes?.some((b) => extractId(b) === item._id)) {
              user.ownedBikes = [...(user.ownedBikes || []), item as BicycleItem];
            }
          }
          localStorage.setItem('rabbit_offline_user', JSON.stringify(user));
        }
        showToast(`${item.name} equipped successfully!`);
        if (refreshUser) await refreshUser();
        return;
      }

      if ((user?.balanceNaira || 0) < item.priceNaira) {
        showToast(`Insufficient balance! You need ₦${item.priceNaira.toLocaleString()}, but have ₦${(user?.balanceNaira || 0).toLocaleString()}.`);
        return;
      }

      const newBalance = Math.round(((user?.balanceNaira || 0) - item.priceNaira) * 100) / 100;
      if (user) {
        user.balanceNaira = newBalance;
        if (itemType === 'rabbit') {
          user.currentRabbit = item as RabbitItem;
          user.ownedRabbits = [...(user.ownedRabbits || []), item as RabbitItem];
        } else {
          user.currentBike = item as BicycleItem;
          user.ownedBikes = [...(user.ownedBikes || []), item as BicycleItem];
        }
        localStorage.setItem('rabbit_offline_user', JSON.stringify(user));
      }
      updateBalance(newBalance);
      showToast(`Congratulations! You unlocked and equipped ${item.name}!`);
      if (refreshUser) await refreshUser();
      return;
    }

    try {
      setActionLoadingId(item._id);
      const res = await api.post('/shop/buy', { itemType, itemId: item._id });

      if (res.data?.success) {
        showToast(res.data.message);
        if (refreshUser) await refreshUser();
      }
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { message?: string } }; message?: string };
      showToast(errorResponse.response?.data?.message || errorResponse.message || 'Transaction failed. Please try again.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="shop-page">
      {/* SHOP HEADER */}
      <div className="shop-header-banner">
        <div className="shop-header-container">
          <div className="shop-header-left">
            <button onClick={() => navigate('/play')} className="shop-back-btn" title="Back to Game">
              <ArrowLeft size={22} />
            </button>
            <div className="shop-title-group">
              <span className="shop-subtitle">FARM SHOP &amp; UPGRADES</span>
              <h1 className="shop-title">Rabbit Ride to the Farm</h1>
            </div>
          </div>

          <div
            className="shop-balance-pill"
            onClick={() => navigate('/wallet')}
            title="Click to View Wallet & Rewards"
            role="button"
            tabIndex={0}
          >
            <span style={{ fontSize: '1.4rem' }}>🥕</span>
            <span>₦{(user?.balanceNaira || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* SHOP NOTICE BANNER */}
      <div style={{ maxWidth: '1080px', margin: '1.25rem auto 0 auto', padding: '0 1rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, #F1F8E9 0%, #E8F5E9 100%)',
          border: '1.5px solid #A5D6A7',
          borderRadius: '16px',
          padding: '1rem 1.4rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', color: '#174D2A', fontWeight: 800, fontSize: '1.05rem' }}>
            <span>🥕 Farm Speed &amp; Boost Garage</span>
            <span style={{ fontSize: '0.85rem', color: '#E65100', fontWeight: 700 }}>
              — Unlock faster rabbits and higher stability bikes to maximize your earnings!
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#455A64', lineHeight: 1.5 }}>
            Each rabbit and bicycle comes equipped with unique handling, top speed, and turbo bonuses.
            Once unlocked, you own the gear permanently and can switch companions anytime!
          </p>
        </div>
      </div>

      {/* CATEGORY TABS */}
      <div className="shop-tabs-bar">
        <div className="shop-tabs-container">
          <button
            onClick={() => setActiveTab('all')}
            className={`shop-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          >
            ALL ITEMS ({rabbits.length + bicycles.length})
          </button>
          <button
            onClick={() => setActiveTab('rabbits')}
            className={`shop-tab-btn ${activeTab === 'rabbits' ? 'active' : ''}`}
          >
            🐰 RABBITS ({rabbits.length})
          </button>
          <button
            onClick={() => setActiveTab('bicycles')}
            className={`shop-tab-btn ${activeTab === 'bicycles' ? 'active' : ''}`}
          >
            🚲 BICYCLES ({bicycles.length})
          </button>
        </div>
      </div>

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="collect-toast-container">
          <div className="collect-toast">{toastMessage}</div>
        </div>
      )}

      {/* SHOP GRID */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#E8F5E9', fontSize: '1.2rem', fontWeight: 600 }}>
          <span>Loading farm shop inventory… 🌾</span>
        </div>
      ) : (
        <div className="shop-grid">
          {/* Render All Rabbits (None are hidden!) */}
          {(activeTab === 'all' || activeTab === 'rabbits') &&
            rabbits.map((rabbit) => {
              const equipped = isItemEquipped('rabbit', rabbit._id);
              const owned = isItemOwned('rabbit', rabbit._id, rabbit.priceNaira);
              const isBusy = actionLoadingId === rabbit._id;

              return (
                <div key={rabbit._id} className={`shop-card ${equipped ? 'equipped-card' : ''}`}>
                  {equipped ? (
                    <span className="card-equipped-badge">ACTIVE</span>
                  ) : owned ? (
                    <span className="card-owned-badge">OWNED</span>
                  ) : null}

                  <div className="shop-card-image-box">
                    <img src={rabbit.imageUrl} alt={rabbit.name} onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/rabbits/starter_rabbit.svg'; }} />
                  </div>

                  <h3 className="shop-card-name">{rabbit.name}</h3>
                  {rabbit.description && (
                    <p className="shop-card-desc">{rabbit.description}</p>
                  )}

                  <div className="shop-card-stats-grid">
                    <span className="stat-pill"><Zap size={14} color="#FF7A00" /> Speed +{rabbit.speed}</span>
                    <span className="stat-pill"><Rocket size={14} color="#00C853" /> Jump +{rabbit.jump}</span>
                    {rabbit.stamina && (
                      <span className="stat-pill"><Shield size={14} color="#29B6F6" /> Stamina +{rabbit.stamina}</span>
                    )}
                  </div>

                  <div className="shop-card-bottom">
                    <div className="shop-price-tag">
                      <span style={{ fontSize: '1.2rem' }}>🪙</span>
                      <span>{rabbit.priceNaira > 0 ? `₦${rabbit.priceNaira.toLocaleString()}` : 'FREE STARTER'}</span>
                    </div>

                    {equipped ? (
                      <button className="shop-btn-active" disabled>EQUIPPED</button>
                    ) : owned ? (
                      <button
                        onClick={() => handleBuyOrEquip('rabbit', rabbit)}
                        disabled={isBusy}
                        className="shop-btn-equip"
                      >
                        {isBusy ? 'EQUIPPING…' : 'EQUIP'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBuyOrEquip('rabbit', rabbit)}
                        disabled={isBusy}
                        className="shop-btn-buy"
                      >
                        {isBusy ? 'BUYING…' : 'BUY'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

          {/* Render All Bicycles (None are hidden!) */}
          {(activeTab === 'all' || activeTab === 'bicycles') &&
            bicycles.map((bike) => {
              const equipped = isItemEquipped('bicycle', bike._id);
              const owned = isItemOwned('bicycle', bike._id, bike.priceNaira);
              const isBusy = actionLoadingId === bike._id;

              return (
                <div key={bike._id} className={`shop-card ${equipped ? 'equipped-card' : ''}`}>
                  {equipped ? (
                    <span className="card-equipped-badge">ACTIVE</span>
                  ) : owned ? (
                    <span className="card-owned-badge">OWNED</span>
                  ) : null}

                  <div className="shop-card-image-box">
                    <img src={bike.imageUrl} alt={bike.name} onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/bikes/starter_bike.svg'; }} />
                  </div>

                  <h3 className="shop-card-name">{bike.name}</h3>
                  {bike.description && (
                    <p className="shop-card-desc">{bike.description}</p>
                  )}

                  <div className="shop-card-stats-grid">
                    <span className="stat-pill"><Zap size={14} color="#FF7A00" /> Speed +{bike.speed}</span>
                    <span className="stat-pill"><Shield size={14} color="#29B6F6" /> Stability +{bike.stability}</span>
                    {bike.boost && (
                      <span className="stat-pill"><Rocket size={14} color="#00C853" /> Boost +{bike.boost}</span>
                    )}
                  </div>

                  <div className="shop-card-bottom">
                    <div className="shop-price-tag">
                      <span style={{ fontSize: '1.2rem' }}>🪙</span>
                      <span>{bike.priceNaira > 0 ? `₦${bike.priceNaira.toLocaleString()}` : 'FREE STARTER'}</span>
                    </div>

                    {equipped ? (
                      <button className="shop-btn-active" disabled>EQUIPPED</button>
                    ) : owned ? (
                      <button
                        onClick={() => handleBuyOrEquip('bicycle', bike)}
                        disabled={isBusy}
                        className="shop-btn-equip"
                      >
                        {isBusy ? 'EQUIPPING…' : 'EQUIP'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBuyOrEquip('bicycle', bike)}
                        disabled={isBusy}
                        className="shop-btn-buy"
                      >
                        {isBusy ? 'BUYING…' : 'BUY'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* IN-FLOW BOTTOM BANNER */}
      <div className="shop-bottom-banner">
        <span>🥕</span>
        <span>Equip your best gear and ride to victory! All items permanently saved to your farm wallet.</span>
        <span>⭐</span>
      </div>
    </div>
  );
};

export default Shop;
