import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, RabbitItem, BicycleItem } from '../context/AuthContext';
import api from '../lib/api';
import { ArrowLeft, ShoppingCart, Check, Sparkles, Coins, Zap } from 'lucide-react';
import '../styles/shop.css';

export const Shop: React.FC = () => {
  const { user, token, openAuthModal, refreshUser } = useAuth();
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

      if (rabbitsRes.data.success) {
        setRabbits(rabbitsRes.data.rabbits);
      }
      if (bikesRes.data.success) {
        setBicycles(bikesRes.data.bicycles);
      }
    } catch (err) {
      console.warn('Shop API unreachable, loading fallback items:', err);
      setRabbits([
        { _id: 'rab_001', name: 'Starter White Rabbit', priceNaira: 0, speed: 10, jump: 10, stamina: 10, grip: 10, drift: 10, imageUrl: '/assets/rabbits/starter_rabbit.svg', description: 'A nimble white bunny ready to ride and explore.' },
        { _id: 'rab_002', name: 'Farmer Hat Bunny', priceNaira: 500, speed: 20, jump: 15, stamina: 25, grip: 15, drift: 10, imageUrl: '/assets/rabbits/farmer_hat.svg', description: 'Equipped with a sturdy straw hat.' },
        { _id: 'rab_003', name: 'Red Hoodie Rabbit', priceNaira: 1500, speed: 35, jump: 30, stamina: 30, grip: 25, drift: 20, imageUrl: '/assets/rabbits/red_hoodie.svg', description: 'Street-smart bunny with turbo energy.' },
        { _id: 'rab_004', name: 'Blue Aviator Rabbit', priceNaira: 3000, speed: 45, jump: 40, stamina: 40, grip: 35, drift: 35, imageUrl: '/assets/rabbits/blue_aviator.svg', description: 'Fly high over the farm hills.' },
        { _id: 'rab_005', name: 'Ninja Shadow Rabbit', priceNaira: 5000, speed: 60, jump: 50, stamina: 50, grip: 45, drift: 40, imageUrl: '/assets/rabbits/ninja_rabbit.svg', description: 'Stealthy, lightning quick farm sprinter.' }
      ]);
      setBicycles([
        { _id: 'bike_001', name: 'Classic Yellow Bike', priceNaira: 0, speed: 10, stability: 10, boost: 10, imageUrl: '/assets/bikes/starter_bike.svg', description: 'Reliable yellow farm bicycle with sturdy wheels.' },
        { _id: 'bike_002', name: 'Green Bloom Cruiser', priceNaira: 500, speed: 20, stability: 25, boost: 15, imageUrl: '/assets/bikes/green_bloom.svg', description: 'Eco-styled cruiser with smooth leaf shock absorbers.' },
        { _id: 'bike_003', name: 'Blue Basket Commuter', priceNaira: 1500, speed: 35, stability: 30, boost: 25, imageUrl: '/assets/bikes/blue_basket.svg', description: 'Front carrier basket holds bonus farm treasures.' },
        { _id: 'bike_004', name: 'Turbo Gold Sprinter', priceNaira: 4000, speed: 60, stability: 50, boost: 45, imageUrl: '/assets/bikes/turbo_gold.svg', description: 'High performance farm cruiser with ultra nitro speed.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleBuyOrEquip = async (itemType: 'rabbit' | 'bicycle', item: RabbitItem | BicycleItem) => {
    if (!token) {
      openAuthModal('login');
      return;
    }

    try {
      setActionLoadingId(item._id);
      const res = await api.post('/shop/buy', { itemType, itemId: item._id });

      if (res.data.success) {
        showToast(res.data.message);
        await refreshUser();
      }
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { message?: string } } };
      showToast(errorResponse.response?.data?.message || 'Transaction failed.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Helper to determine ownership & active equipment
  const isItemEquipped = (type: 'rabbit' | 'bicycle', id: string) => {
    if (type === 'rabbit') {
      const currentId = user?.currentRabbit?._id || user?.currentRabbit;
      return currentId?.toString() === id.toString();
    } else {
      const currentId = user?.currentBike?._id || user?.currentBike;
      return currentId?.toString() === id.toString();
    }
  };

  const isItemOwned = (type: 'rabbit' | 'bicycle', id: string, price: number) => {
    if (price === 0) return true;
    if (type === 'rabbit') {
      return (user?.ownedRabbits || []).some(
        (rab) => ((rab as RabbitItem)?._id || rab)?.toString() === id.toString()
      );
    } else {
      return (user?.ownedBikes || []).some(
        (bike) => ((bike as BicycleItem)?._id || bike)?.toString() === id.toString()
      );
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
              <span className="shop-subtitle">UPGRADE SHOP</span>
              <h1 className="shop-title">Rabbit Ride to the Farm</h1>
            </div>
          </div>

          <div className="shop-balance-pill" onClick={() => navigate('/wallet')} title="Click to View Wallet">
            <span style={{ fontSize: '1.4rem' }}>🥕</span>
            <span>₦{(user?.balanceNaira || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* SHOP NOTICE BANNER */}
      <div style={{ maxWidth: '1200px', margin: '1rem auto 0 auto', padding: '0 1.25rem' }}>
        <div style={{ background: '#F1F8E9', border: '1px solid #C5E1A5', borderRadius: '14px', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', color: '#174D2A', fontWeight: 700, fontSize: '1.05rem' }}>
            <span>🥕 Need More Energy? Visit the Farm Shop!</span>
            <span style={{ fontSize: '0.85rem', color: '#E65100', fontWeight: 600 }}>— Every good farmer knows when it's time to restock!</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#546E7A', lineHeight: 1.5 }}>
            The Rabbit Ride to the Farm shop offers available gameplay items, including energy, tickets, and extra chances to participate in selected activities.
            Purchases provide the in-game benefits displayed at checkout. Shop when it suits you. Play at your own pace.
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
            ALL ITEMS
          </button>
          <button
            onClick={() => setActiveTab('rabbits')}
            className={`shop-tab-btn ${activeTab === 'rabbits' ? 'active' : ''}`}
          >
            RABBITS
          </button>
          <button
            onClick={() => setActiveTab('bicycles')}
            className={`shop-tab-btn ${activeTab === 'bicycles' ? 'active' : ''}`}
          >
            BICYCLES
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
      <div className="shop-grid">
        {/* Render Rabbits */}
        {(activeTab === 'all' || activeTab === 'rabbits') &&
          rabbits
            .filter((r) => r.priceNaira > 0 || isItemEquipped('rabbit', r._id))
            .map((rabbit) => {
              const equipped = isItemEquipped('rabbit', rabbit._id);
              const owned = isItemOwned('rabbit', rabbit._id, rabbit.priceNaira);
              const isBusy = actionLoadingId === rabbit._id;

              return (
                <div key={rabbit._id} className={`shop-card ${equipped ? 'equipped-card' : ''}`}>
                  {equipped ? (
                    <span className="card-equipped-badge">EQUIPPED</span>
                  ) : owned ? (
                    <span className="card-owned-badge">OWNED</span>
                  ) : null}

                  <div className="shop-card-image-box">
                    <img src={rabbit.imageUrl} alt={rabbit.name} />
                  </div>

                  <h3 className="shop-card-name">{rabbit.name}</h3>

                  <div className="shop-card-stats">
                    <span style={{ fontSize: '1.1rem' }}>🧺</span>
                    <span>
                      Speed +{rabbit.speed} • Jump +{rabbit.jump}
                    </span>
                  </div>

                  <div className="shop-card-bottom">
                    <div className="shop-price-tag">
                      <span style={{ fontSize: '1.2rem' }}>🪙</span>
                      <span>{rabbit.priceNaira > 0 ? `${rabbit.priceNaira} ₦` : 'FREE'}</span>
                    </div>

                    {equipped ? (
                      <button className="shop-btn-active">ACTIVE</button>
                    ) : owned ? (
                      <button
                        onClick={() => handleBuyOrEquip('rabbit', rabbit)}
                        disabled={isBusy}
                        className="shop-btn-equip"
                      >
                        {isBusy ? 'EQUIPPING...' : 'EQUIP'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBuyOrEquip('rabbit', rabbit)}
                        disabled={isBusy}
                        className="shop-btn-buy"
                      >
                        {isBusy ? 'BUYING...' : 'BUY'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

        {/* Render Bicycles */}
        {(activeTab === 'all' || activeTab === 'bicycles') &&
          bicycles
            .filter((b) => b.priceNaira > 0 || isItemEquipped('bicycle', b._id))
            .map((bike) => {
              const equipped = isItemEquipped('bicycle', bike._id);
              const owned = isItemOwned('bicycle', bike._id, bike.priceNaira);
              const isBusy = actionLoadingId === bike._id;

              return (
                <div key={bike._id} className={`shop-card ${equipped ? 'equipped-card' : ''}`}>
                  {equipped ? (
                    <span className="card-equipped-badge">EQUIPPED</span>
                  ) : owned ? (
                    <span className="card-owned-badge">OWNED</span>
                  ) : null}

                  <div className="shop-card-image-box">
                    <img src={bike.imageUrl} alt={bike.name} />
                  </div>

                  <h3 className="shop-card-name">{bike.name}</h3>

                  <div className="shop-card-stats">
                    <span style={{ fontSize: '1.1rem' }}>🧺</span>
                    <span>
                      Speed +{bike.speed} • Stability +{bike.stability}
                    </span>
                  </div>

                  <div className="shop-card-bottom">
                    <div className="shop-price-tag">
                      <span style={{ fontSize: '1.2rem' }}>🪙</span>
                      <span>{bike.priceNaira > 0 ? `${bike.priceNaira} ₦` : 'FREE'}</span>
                    </div>

                    {equipped ? (
                      <button className="shop-btn-active">ACTIVE</button>
                    ) : owned ? (
                      <button
                        onClick={() => handleBuyOrEquip('bicycle', bike)}
                        disabled={isBusy}
                        className="shop-btn-equip"
                      >
                        {isBusy ? 'EQUIPPING...' : 'EQUIP'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBuyOrEquip('bicycle', bike)}
                        disabled={isBusy}
                        className="shop-btn-buy"
                      >
                        {isBusy ? 'BUYING...' : 'BUY'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
      </div>

      {/* BOTTOM BANNER */}
      <div className="shop-bottom-banner">
        <span>🥕</span>
        <span>Shop when it suits you. Play at your own pace. Enjoy your farm ride!</span>
        <span>⭐</span>
      </div>
    </div>
  );
};

export default Shop;
