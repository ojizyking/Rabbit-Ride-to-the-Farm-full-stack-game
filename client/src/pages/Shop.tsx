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
      console.error('Error fetching shop items:', err);
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

      {/* BOTTOM BANNER (matches Image 2 bottom banner) */}
      <div className="shop-bottom-banner">
        <span>🥕</span>
        <span>Select an item to ride &amp; race to the farm!</span>
        <span>⭐</span>
      </div>
    </div>
  );
};

export default Shop;
