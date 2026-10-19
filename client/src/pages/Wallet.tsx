import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Wallet as WalletIcon, ArrowDownCircle, ArrowUpCircle, CheckCircle2, AlertTriangle, ShieldCheck, CreditCard, RefreshCw } from 'lucide-react';
import '../styles/wallet.css';


const NIGERIAN_BANKS = [
  { code: '058', name: 'Guaranty Trust Bank (GTBank)' },
  { code: '057', name: 'Zenith Bank' },
  { code: '044', name: 'Access Bank' },
  { code: '033', name: 'United Bank for Africa (UBA)' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '50211', name: 'Kuda Microfinance Bank' },
  { code: '999992', name: 'OPay Digital Services' },
  { code: '999991', name: 'PalmPay' },
  { code: '221', name: 'Stanbic IBTC Bank' },
  { code: '070', name: 'Fidelity Bank' }
];

interface Transaction {
  _id: string;
  type: 'earn' | 'shop' | 'subscription' | 'withdrawal';
  amount: number;
  description: string;
  reference?: string;
  status: string;
  createdAt: string;
}

export const Wallet: React.FC = () => {
  const { user, token, openAuthModal, refreshUser, updateBalance } = useAuth();
  const [searchParams] = useSearchParams();

  // Withdraw form state
  const [withdrawAmount, setWithdrawAmount] = useState('1000');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankCode, setBankCode] = useState('058');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  // Subscribe state
  const [selectedTier, setSelectedTier] = useState<number>(() => {
    const tierParam = searchParams.get('tier');
    return tierParam ? parseInt(tierParam, 10) : 2000;
  });
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [paystackModalData, setPaystackModalData] = useState<{
    reference: string;
    authorization_url: string;
    amount: number;
    tier: string;
  } | null>(null);

  // Transactions list
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);

  useEffect(() => {
    if (token) {
      fetchTransactions();
    }
  }, [token]);

  const fetchTransactions = async () => {
    try {
      setLoadingTx(true);
      const res = await api.get('/wallet/transactions');
      if (res.data.success) {
        setTransactions(res.data.transactions);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoadingTx(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      openAuthModal('login');
      return;
    }

    setWithdrawSuccess(null);
    setWithdrawError(null);
    setWithdrawLoading(true);

    try {
      const selectedBank = NIGERIAN_BANKS.find((b) => b.code === bankCode);
      const res = await api.post('/wallet/withdraw', {
        amount: Number(withdrawAmount),
        accountNumber,
        bankCode,
        bankName: selectedBank ? selectedBank.name : 'Commercial Bank'
      });

      if (res.data.success) {
        setWithdrawSuccess(res.data.message);
        if (res.data.newBalance !== undefined) {
          updateBalance(res.data.newBalance);
        }
        await fetchTransactions();
        setAccountNumber('');
      }
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { message?: string } } };
      setWithdrawError(errorResponse.response?.data?.message || 'Withdrawal failed. Please check inputs.');
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleInitializeSubscription = async (tierAmount: number) => {
    if (!token) {
      openAuthModal('login');
      return;
    }

    setSubscribeLoading(true);
    try {
      const res = await api.post('/wallet/subscribe', { tier: tierAmount });
      if (res.data.success) {
        setPaystackModalData({
          reference: res.data.reference,
          authorization_url: res.data.authorization_url,
          amount: res.data.amount,
          tier: res.data.tier
        });
      }
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { message?: string } } };
      alert(errorResponse.response?.data?.message || 'Could not initialize Paystack transaction.');
    } finally {
      setSubscribeLoading(false);
    }
  };

  const handleVerifySubscription = async () => {
    if (!paystackModalData) return;
    setSubscribeLoading(true);
    try {
      const res = await api.post('/wallet/verify', { reference: paystackModalData.reference });
      if (res.data.success) {
        alert(res.data.message);
        setPaystackModalData(null);
        await refreshUser();
        await fetchTransactions();
      }
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { message?: string } } };
      alert(errorResponse.response?.data?.message || 'Verification failed.');
    } finally {
      setSubscribeLoading(false);
    }
  };

  return (
    <div className="wallet-page-container">

      {/* BALANCE CARD */}
      <div
        style={{
          background: 'linear-gradient(135deg, #174D2A 0%, #2D8A4E 100%)',
          borderRadius: '24px',
          padding: '2.25rem',
          color: '#FFFFFF',
          boxShadow: 'var(--shadow-lg)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.5rem',
          alignItems: 'center'
        }}
      >
        <div>
          <span style={{ fontSize: '0.95rem', opacity: 0.85, fontWeight: 600 }}>ELIGIBLE REWARDS BALANCE</span>
          <div style={{ fontSize: '2.75rem', fontWeight: 700, margin: '0.25rem 0', color: '#FFC93C', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>₦{(user?.balanceNaira || 0).toLocaleString()}</span>
          </div>
          <div style={{ fontSize: '0.95rem', color: '#FFE082', fontWeight: 600, marginBottom: '0.25rem' }}>
            🪙 {((user?.balanceNaira || 0) * 10).toLocaleString()} Coins (Rate: 1,000 Coins = ₦100)
          </div>
          <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>
            Equipped: {user?.currentRabbit?.name || 'Starter White Rabbit'} + {user?.currentBike?.name || 'Classic Bike'}
          </span>
        </div>

        <div>
          <span style={{ fontSize: '0.95rem', opacity: 0.85, fontWeight: 600 }}>ACTIVE GAMEPLAY PACK</span>
          <div style={{ margin: '0.5rem 0' }}>
            <span className={`badge-tier ${user?.subscriptionTier || 'free'}`} style={{ fontSize: '1rem', padding: '0.35rem 1rem' }}>
              {(user?.subscriptionTier || 'free').toUpperCase()} PACK
            </span>
          </div>
          <span style={{ fontSize: '0.85rem', opacity: 0.85 }}>
            Session Boost: {user?.subscriptionTier === 'elite' ? '+50%' : user?.subscriptionTier === 'pro' ? '+25%' : user?.subscriptionTier === 'growth' ? '+10%' : user?.subscriptionTier === 'basic' ? '+5%' : '+0%'}
          </span>
        </div>

        <div>
          <span style={{ fontSize: '0.95rem', opacity: 0.85, fontWeight: 600 }}>TOTAL FARM RIDES</span>
          <div style={{ fontSize: '2.25rem', fontWeight: 700, margin: '0.25rem 0', color: '#FFFFFF' }}>
            {user?.totalRides || 0}
          </div>
          <span style={{ fontSize: '0.85rem', opacity: 0.85 }}>Daily Free Rides: 10/day (Unlimited on Paid Tiers)</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        {/* WITHDRAW FORM */}
        <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '1.75rem', border: '2px solid #C8E6C9', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ background: '#FFF3E0', padding: '0.6rem', borderRadius: '12px', color: '#E65100' }}>
              <ArrowDownCircle size={26} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.35rem', color: '#174D2A', fontWeight: 700 }}>Withdraw Eligible Rewards</h3>
              <p style={{ fontSize: '0.85rem', color: '#78909C' }}>Direct bank transfer via Paystack (Minimum: ₦1,000)</p>
            </div>
          </div>

          {withdrawSuccess && (
            <div style={{ background: '#E8F5E9', border: '1px solid #A5D6A7', color: '#2E7D32', padding: '0.75rem', borderRadius: '10px', fontSize: '0.9rem', marginBottom: '1rem', fontWeight: 600 }}>
              {withdrawSuccess}
            </div>
          )}

          {withdrawError && (
            <div style={{ background: '#FFEBEE', border: '1px solid #FFCDD2', color: '#C62828', padding: '0.75rem', borderRadius: '10px', fontSize: '0.9rem', marginBottom: '1rem', fontWeight: 600 }}>
              {withdrawError}
            </div>
          )}

          <form onSubmit={handleWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#37474F', marginBottom: '0.35rem' }}>
                Withdrawal Amount (₦)
              </label>
              <input
                type="number"
                min="1000"
                step="100"
                required
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '2px solid #CFD8DC', fontSize: '1.1rem', fontWeight: 700 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#37474F', marginBottom: '0.35rem' }}>
                Select Destination Bank
              </label>
              <select
                value={bankCode}
                onChange={(e) => setBankCode(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '2px solid #CFD8DC', fontSize: '0.95rem' }}
              >
                {NIGERIAN_BANKS.map((bank) => (
                  <option key={bank.code} value={bank.code}>
                    {bank.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#37474F', marginBottom: '0.35rem' }}>
                10-Digit NUBAN Account Number
              </label>
              <input
                type="text"
                maxLength={10}
                required
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="0123456789"
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '2px solid #CFD8DC', fontSize: '1.05rem', letterSpacing: '1px' }}
              />
            </div>

            <button
              type="submit"
              disabled={withdrawLoading || (user?.balanceNaira || 0) < Number(withdrawAmount)}
              className="btn-primary"
              style={{ justifyContent: 'center', padding: '0.85rem', marginTop: '0.5rem' }}
            >
              {withdrawLoading ? 'Processing Paystack Transfer...' : 'Request Bank Transfer'}
            </button>
          </form>
        </div>

        {/* GAMEPLAY PACKS */}
        <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '1.75rem', border: '2px solid #C8E6C9', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ background: '#E8F5E9', padding: '0.6rem', borderRadius: '12px', color: '#2E7D32' }}>
              <CreditCard size={26} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.35rem', color: '#174D2A', fontWeight: 700 }}>Optional Gameplay Packs</h3>
              <p style={{ fontSize: '0.85rem', color: '#78909C' }}>Session boosts, extra carrot tokens &amp; unlimited daily rides</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { amount: 1000, name: 'Basic Starter Pack', boost: '+5% Session Boost', color: '#FFE082' },
              { amount: 2000, name: 'Growth Pack (Popular)', boost: '+10% Boost + Weekly Crate', color: '#C8E6C9' },
              { amount: 5000, name: 'Pro Pack', boost: '+25% Boost + Premium Cosmetics', color: '#BBDEFB' },
              { amount: 10000, name: 'Elite Pack', boost: '+50% Boost + VIP Tracks', color: '#E1BEE7' }
            ].map((plan) => (
              <div
                key={plan.amount}
                onClick={() => setSelectedTier(plan.amount)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  border: `2px solid ${selectedTier === plan.amount ? 'var(--orange)' : '#ECEFF1'}`,
                  background: selectedTier === plan.amount ? '#FFF8E1' : '#FAFAFA',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: '#37474F' }}>{plan.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#689F38', fontWeight: 600 }}>{plan.boost}</div>
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.15rem', color: '#174D2A' }}>
                  ₦{plan.amount.toLocaleString()}
                </div>
              </div>
            ))}

            <button
              onClick={() => handleInitializeSubscription(selectedTier)}
              disabled={subscribeLoading}
              className="btn-green"
              style={{ justifyContent: 'center', padding: '0.85rem', marginTop: '0.75rem' }}
            >
              {subscribeLoading ? 'Connecting to Paystack...' : `Get Pack for ₦${selectedTier.toLocaleString()} via Paystack`}
            </button>
          </div>
        </div>
      </div>

      {/* PAYSTACK POPUP SIMULATION MODAL */}
      {paystackModalData && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '440px', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', background: '#E0F2F1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto', color: '#00897B' }}>
              <ShieldCheck size={32} />
            </div>
            <h3 style={{ fontSize: '1.5rem', color: '#004D40', fontWeight: 700 }}>Paystack Checkout</h3>
            <p style={{ color: '#546E7A', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              Complete payment for <strong>{paystackModalData.tier.toUpperCase()} PACK</strong>
            </p>

            <div style={{ background: '#F5F5F5', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                <span style={{ color: '#78909C' }}>Amount:</span>
                <span style={{ fontWeight: 700, color: '#263238' }}>₦{paystackModalData.amount.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#78909C' }}>Reference:</span>
                <span style={{ fontFamily: 'monospace', color: '#00897B' }}>{paystackModalData.reference.slice(0, 18)}...</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={handleVerifySubscription}
                disabled={subscribeLoading}
                className="btn-green"
                style={{ justifyContent: 'center', padding: '0.85rem' }}
              >
                <span>Simulate / Confirm Paystack Payment</span>
              </button>
              <button
                onClick={() => setPaystackModalData(null)}
                className="btn-outline"
                style={{ justifyContent: 'center' }}
              >
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REWARDS & WITHDRAWALS POLICY CARD */}
      <div style={{ background: '#F9FBE7', borderRadius: '16px', padding: '1.5rem', border: '2px solid #DCE775', color: '#33691E' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 700, fontSize: '1.1rem' }}>
          <AlertTriangle size={20} color="#689F38" />
          <span>Reward Rules &amp; Important Disclaimer</span>
        </div>
        <p style={{ fontSize: '0.9rem', color: '#37474F', lineHeight: 1.6, margin: 0 }}>
          Rabbit Ride to the Farm is a game featuring optional in-game purchases and eligible reward or withdrawal features.
          In-game purchases provide the items or gameplay access described at checkout and do not guarantee cash rewards, profits, or financial returns.
          Reward eligibility and withdrawals are governed by applicable game rules (Minimum withdrawal: ₦1,000; Rate: 1,000 Coins = ₦100).
          Please review the terms and conditions before making a purchase or participating in reward activities. Play responsibly and only spend what you can afford.
        </p>
      </div>

      {/* TRANSACTIONS LIST */}
      <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '1.75rem', border: '2px solid #C8E6C9', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.35rem', color: '#174D2A', fontWeight: 700 }}>Transaction History</h3>
          <button onClick={fetchTransactions} className="hud-icon-btn" style={{ width: '36px', height: '36px' }} title="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>

        {loadingTx ? (
          <p style={{ textAlign: 'center', color: '#90A4AE', padding: '2rem 0' }}>Loading transaction records...</p>
        ) : transactions.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#90A4AE', padding: '2rem 0' }}>No transactions recorded yet. Explore the farm and start riding!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {transactions.map((tx) => (
              <div
                key={tx._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  background: '#F9FBF9',
                  border: '1px solid #E8F5E9'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: tx.amount > 0 ? '#E8F5E9' : '#FFF3E0',
                      color: tx.amount > 0 ? '#2E7D32' : '#E65100',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {tx.amount > 0 ? <ArrowUpCircle size={22} /> : <ArrowDownCircle size={22} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#37474F' }}>{tx.description}</div>
                    <div style={{ fontSize: '0.8rem', color: '#90A4AE' }}>
                      {new Date(tx.createdAt).toLocaleDateString()} • {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '1.1rem',
                      color: tx.amount > 0 ? '#2E7D32' : '#E65100'
                    }}
                  >
                    {tx.amount > 0 ? `+₦${tx.amount.toLocaleString()}` : `-₦${Math.abs(tx.amount).toLocaleString()}`}
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#90A4AE', textTransform: 'uppercase' }}>
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Wallet;
