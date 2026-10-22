import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Wallet as WalletIcon, ArrowDownCircle, ArrowUpCircle, CheckCircle2, AlertTriangle, ShieldCheck, CreditCard, RefreshCw, Copy, Share2, Users, Gift, Edit3, Check, X, PlusCircle, ExternalLink } from 'lucide-react';
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
  type: 'earn' | 'shop' | 'subscription' | 'withdrawal' | 'referral' | 'deposit' | 'coin_purchase';
  amount: number;
  description: string;
  reference?: string;
  status: string;
  createdAt: string;
}

export const Wallet: React.FC = () => {
  const { user, token, openAuthModal, refreshUser, updateBalance, customizeReferralCode } = useAuth();
  const [searchParams] = useSearchParams();

  // Dynamic banks and verification
  const [bankList, setBankList] = useState(NIGERIAN_BANKS);
  const [verifiedAccountName, setVerifiedAccountName] = useState<string | null>(null);
  const [verifyingAccount, setVerifyingAccount] = useState(false);

  // Direct Deposit state
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('2000');
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositPaystackData, setDepositPaystackData] = useState<{
    reference: string;
    authorization_url: string;
    amount: number;
  } | null>(null);

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

  // Referral Hub state
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showCustomCodeModal, setShowCustomCodeModal] = useState(false);
  const [customCode, setCustomCode] = useState('');
  const [customCodeLoading, setCustomCodeLoading] = useState(false);
  const [customCodeMsg, setCustomCodeMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Transactions list
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);

  const loadOfflineTransactions = () => {
    try {
      const stored = localStorage.getItem('rabbit_offline_transactions');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTransactions(parsed);
          return true;
        }
      }
    } catch (e) {
      console.warn('Failed to parse offline transactions', e);
    }
    return false;
  };

  const fetchTransactions = async () => {
    try {
      setLoadingTx(true);
      const res = await api.get('/wallet/transactions');
      if (res.data.success && Array.isArray(res.data.transactions) && res.data.transactions.length > 0) {
        // Merge offline transactions if any exist locally
        try {
          const stored = localStorage.getItem('rabbit_offline_transactions');
          const localList: Transaction[] = stored ? JSON.parse(stored) : [];
          const apiIds = new Set(res.data.transactions.map((t: Transaction) => t._id));
          const merged = [
            ...res.data.transactions,
            ...localList.filter((t: Transaction) => !apiIds.has(t._id))
          ];
          merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setTransactions(merged);
        } catch {
          setTransactions(res.data.transactions);
        }
      } else {
        loadOfflineTransactions();
      }
    } catch (err) {
      console.error('Error fetching transactions, falling back to offline records:', err);
      loadOfflineTransactions();
    } finally {
      setLoadingTx(false);
    }
  };

  useEffect(() => {
    if (token) {
      refreshUser();
      fetchTransactions();
    } else {
      loadOfflineTransactions();
    }
  }, [token]);

  // Load live Nigerian bank list from Paystack
  useEffect(() => {
    api.get('/wallet/banks')
      .then(res => {
        if (res.data.success && Array.isArray(res.data.banks) && res.data.banks.length > 0) {
          setBankList(res.data.banks);
        }
      })
      .catch(() => {});
  }, []);

  // Real-time bank account name verification
  useEffect(() => {
    if (accountNumber && accountNumber.length === 10 && bankCode) {
      setVerifyingAccount(true);
      setVerifiedAccountName(null);
      api.post('/wallet/resolve-account', { accountNumber, bankCode })
        .then(res => {
          if (res.data.success && res.data.accountName) {
            setVerifiedAccountName(res.data.accountName);
          }
        })
        .catch(() => {
          setVerifiedAccountName(null);
        })
        .finally(() => {
          setVerifyingAccount(false);
        });
    } else {
      setVerifiedAccountName(null);
    }
  }, [accountNumber, bankCode]);

  // Direct Wallet Deposit Handlers
  const handleInitializeDeposit = async (amt: number) => {
    if (!token) {
      openAuthModal('login');
      return;
    }
    setDepositLoading(true);
    try {
      const res = await api.post('/wallet/deposit', { amount: amt });
      if (res.data.success) {
        setDepositPaystackData({
          reference: res.data.reference,
          authorization_url: res.data.authorization_url,
          amount: res.data.amount
        });
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      alert(e.response?.data?.message || 'Could not initialize deposit.');
    } finally {
      setDepositLoading(false);
    }
  };

  const handleVerifyDeposit = async () => {
    if (!depositPaystackData) return;
    setDepositLoading(true);
    try {
      const res = await api.post('/wallet/verify-deposit', { reference: depositPaystackData.reference });
      if (res.data.success) {
        alert(res.data.message);
        setDepositPaystackData(null);
        setShowDepositModal(false);
        await refreshUser();
        await fetchTransactions();
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      alert(e.response?.data?.message || 'Deposit verification failed.');
    } finally {
      setDepositLoading(false);
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
      // Fallback if offline/network failure but user has sufficient balance
      if (!errorResponse.response && user && user.balanceNaira >= Number(withdrawAmount)) {
        const amt = Number(withdrawAmount);
        const newBal = Math.max(0, user.balanceNaira - amt);
        updateBalance(newBal);

        const mockTx: Transaction = {
          _id: 'tx_off_' + Date.now(),
          type: 'withdrawal',
          amount: -amt,
          description: `Withdrawal to ${accountNumber} (${NIGERIAN_BANKS.find(b => b.code === bankCode)?.name || 'Bank'})`,
          status: 'pending',
          createdAt: new Date().toISOString()
        };

        try {
          const stored = localStorage.getItem('rabbit_offline_transactions');
          const list = stored ? JSON.parse(stored) : [];
          list.unshift(mockTx);
          localStorage.setItem('rabbit_offline_transactions', JSON.stringify(list));
          setTransactions(list);
        } catch (e) {
          console.warn('Could not save offline transaction', e);
        }

        setWithdrawSuccess(`Offline Simulation: Withdrawal request of ₦${amt.toLocaleString()} received (test mode).`);
        setAccountNumber('');
      } else {
        setWithdrawError(errorResponse.response?.data?.message || 'Withdrawal failed. Please check inputs.');
      }
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

  const handleManualRefresh = async () => {
    if (token) {
      await refreshUser();
      await fetchTransactions();
    } else {
      loadOfflineTransactions();
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
            <button
              onClick={handleManualRefresh}
              title="Refresh Balance"
              style={{
                background: 'rgba(255,255,255,0.18)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={16} />
            </button>
          </div>
          <div style={{ fontSize: '0.95rem', color: '#FFE082', fontWeight: 600, marginBottom: '0.25rem' }}>
            🪙 {((user?.balanceNaira || 0) * 20).toLocaleString()} Coins (Rate: 1,000 Coins = ₦50)
          </div>
          <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>
            Equipped: {user?.currentRabbit?.name || 'Starter White Rabbit'} + {user?.currentBike?.name || 'Classic Bike'}
          </span>
          <div style={{ marginTop: '0.85rem' }}>
            <button
              onClick={() => setShowDepositModal(true)}
              className="btn-primary"
              style={{
                background: '#FFFFFF',
                color: '#174D2A',
                fontWeight: 700,
                fontSize: '0.9rem',
                padding: '0.45rem 1.15rem',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                cursor: 'pointer',
                border: 'none'
              }}
            >
              <PlusCircle size={18} /> Top Up Wallet (Deposit)
            </button>
          </div>
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
                {bankList.map((bank) => (
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
              {verifyingAccount && (
                <div style={{ fontSize: '0.8rem', color: '#0288D1', marginTop: '0.35rem', fontWeight: 600 }}>
                  Verifying account name via Paystack NUBAN...
                </div>
              )}
              {verifiedAccountName && (
                <div style={{ fontSize: '0.85rem', color: '#2E7D32', background: '#E8F5E9', padding: '0.4rem 0.75rem', borderRadius: '8px', marginTop: '0.45rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <CheckCircle2 size={15} /> Verified Recipient: {verifiedAccountName}
                </div>
              )}
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

      {/* ══════════ REFERRAL HUB CARD ══════════ */}
      <div style={{ background: 'linear-gradient(135deg, #1A237E 0%, #4A148C 50%, #880E4F 100%)', borderRadius: '20px', padding: '2rem', color: '#FFFFFF', boxShadow: '0 8px 32px rgba(26,35,126,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', padding: '0.65rem', borderRadius: '14px' }}>
            <Users size={28} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Referral Hub</h3>
            <p style={{ fontSize: '0.85rem', opacity: 0.8, margin: 0 }}>Invite friends → Earn ₦100 per invite</p>
          </div>
        </div>

        {/* Referral Code Display */}
        <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem', border: '1px solid rgba(255,255,255,0.2)' }}>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1.5px', opacity: 0.7, fontWeight: 600 }}>Your Referral Code</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '2px', color: '#FFC107', fontFamily: 'monospace' }}>
              {user?.referralCode || 'LOGIN_REQUIRED'}
            </span>
            <button
              onClick={() => {
                if (user?.referralCode) {
                  navigator.clipboard.writeText(user.referralCode);
                  setCodeCopied(true);
                  setTimeout(() => setCodeCopied(false), 2000);
                }
              }}
              style={{ background: codeCopied ? '#4CAF50' : 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '0.4rem 0.75rem', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s' }}
            >
              {codeCopied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
            </button>
            <button
              onClick={() => { setCustomCode(user?.referralCode || ''); setCustomCodeMsg(null); setShowCustomCodeModal(true); }}
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', padding: '0.4rem 0.75rem', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 600 }}
            >
              <Edit3 size={14} /> Customize
            </button>
          </div>
        </div>

        {/* Referral Link + Share Buttons */}
        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Share2 size={16} style={{ opacity: 0.7 }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.85 }}>Share Your Link</span>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '0.6rem 0.85rem', fontSize: '0.8rem', fontFamily: 'monospace', color: '#CE93D8', wordBreak: 'break-all', marginBottom: '0.85rem' }}>
            {user?.referralCode ? `${window.location.origin}?ref=${user.referralCode}` : 'Login to get your link'}
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            {/* Copy Link */}
            <button
              onClick={() => {
                if (user?.referralCode) {
                  navigator.clipboard.writeText(`${window.location.origin}?ref=${user.referralCode}`);
                  setLinkCopied(true);
                  setTimeout(() => setLinkCopied(false), 2000);
                }
              }}
              style={{ background: linkCopied ? '#4CAF50' : 'rgba(255,255,255,0.18)', border: 'none', borderRadius: '10px', padding: '0.55rem 1rem', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.2s' }}
            >
              {linkCopied ? <><Check size={15} /> Copied!</> : <><Copy size={15} /> Copy Link</>}
            </button>
            {/* WhatsApp */}
            <button
              onClick={() => {
                if (user?.referralCode) {
                  const msg = encodeURIComponent(`🐰 Join me on Rabbit Ride to the Farm! Ride, earn coins & withdraw real cash! Use my code ${user.referralCode} and get ₦50 welcome bonus!\n\n${window.location.origin}?ref=${user.referralCode}`);
                  window.open(`https://wa.me/?text=${msg}`, '_blank');
                }
              }}
              style={{ background: '#25D366', border: 'none', borderRadius: '10px', padding: '0.55rem 1rem', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 700 }}
            >
              WhatsApp
            </button>
            {/* Telegram */}
            <button
              onClick={() => {
                if (user?.referralCode) {
                  const msg = encodeURIComponent(`🐰 Join Rabbit Ride to the Farm! Earn coins & withdraw real cash! Use code ${user.referralCode} for ₦50 bonus!`);
                  const url = encodeURIComponent(`${window.location.origin}?ref=${user.referralCode}`);
                  window.open(`https://t.me/share/url?url=${url}&text=${msg}`, '_blank');
                }
              }}
              style={{ background: '#0088CC', border: 'none', borderRadius: '10px', padding: '0.55rem 1rem', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 700 }}
            >
              Telegram
            </button>
            {/* Native Share */}
            {'share' in navigator && (
              <button
                onClick={() => {
                  if (user?.referralCode) {
                    navigator.share({
                      title: 'Rabbit Ride to the Farm',
                      text: `🐰 Ride, earn coins & withdraw! Use my code ${user.referralCode} for ₦50 bonus!`,
                      url: `${window.location.origin}?ref=${user.referralCode}`
                    }).catch(() => {});
                  }
                }}
                style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '10px', padding: '0.55rem 1rem', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 600 }}
              >
                <Share2 size={15} /> More
              </button>
            )}
          </div>
        </div>

        {/* Referral Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '12px', padding: '1rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.15)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#FFC107' }}>{user?.referralsCount || 0}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.75, fontWeight: 600, marginTop: '0.2rem' }}>Friends Invited</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '12px', padding: '1rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.15)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#69F0AE' }}>₦{(user?.referralEarnings || 0).toLocaleString()}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.75, fontWeight: 600, marginTop: '0.2rem' }}>Total Referral Earnings</div>
          </div>
        </div>

        {/* Referral Reward Explanation */}
        <div style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', padding: '0.85rem 1rem', display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
          <Gift size={20} style={{ color: '#FFC107', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.82rem', lineHeight: 1.55, opacity: 0.85 }}>
            <strong>How it works:</strong> Share your code → Friend signs up → You earn <strong>₦100</strong> instantly. Your friend gets a <strong>₦50 welcome bonus</strong>. No limits — invite as many as you want!
          </div>
        </div>
      </div>

      {/* ══════════ CUSTOM CODE MODAL ══════════ */}
      {showCustomCodeModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.35rem', color: '#1A237E', fontWeight: 700, margin: 0 }}>Customize Referral Code</h3>
              <button
                onClick={() => setShowCustomCodeModal(false)}
                style={{ background: '#F5F5F5', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#546E7A' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#546E7A', marginBottom: '1rem', lineHeight: 1.5 }}>
              Choose a memorable code for your friends (3–15 characters, letters, numbers, and hyphens only).
            </p>

            {customCodeMsg && (
              <div style={{
                background: customCodeMsg.success ? '#E8F5E9' : '#FFEBEE',
                border: `1px solid ${customCodeMsg.success ? '#A5D6A7' : '#FFCDD2'}`,
                color: customCodeMsg.success ? '#2E7D32' : '#C62828',
                padding: '0.7rem', borderRadius: '10px', fontSize: '0.88rem', marginBottom: '1rem', fontWeight: 600
              }}>
                {customCodeMsg.text}
              </div>
            )}

            <input
              type="text"
              maxLength={15}
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase())}
              placeholder="e.g. KING-RIDER"
              style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', border: '2px solid #C5CAE9', fontSize: '1.2rem', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '2px', textAlign: 'center', marginBottom: '1rem', textTransform: 'uppercase' }}
            />

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={async () => {
                  if (customCode.length < 3) {
                    setCustomCodeMsg({ success: false, text: 'Code must be at least 3 characters.' });
                    return;
                  }
                  setCustomCodeLoading(true);
                  setCustomCodeMsg(null);
                  try {
                    const result = await customizeReferralCode(customCode);
                    setCustomCodeMsg({ success: result.success, text: result.message });
                    if (result.success) {
                      if (refreshUser) refreshUser();
                      setTimeout(() => setShowCustomCodeModal(false), 1500);
                    }
                  } catch {
                    setCustomCodeMsg({ success: false, text: 'Something went wrong. Try again.' });
                  } finally {
                    setCustomCodeLoading(false);
                  }
                }}
                disabled={customCodeLoading || customCode.length < 3}
                className="btn-primary"
                style={{ flex: 1, justifyContent: 'center', padding: '0.85rem' }}
              >
                {customCodeLoading ? 'Saving...' : 'Save Custom Code'}
              </button>
              <button
                onClick={() => setShowCustomCodeModal(false)}
                className="btn-outline"
                style={{ justifyContent: 'center', padding: '0.85rem' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* DIRECT DEPOSIT MODAL */}
      {showDepositModal && (
        <div className="modal-overlay" onClick={() => setShowDepositModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', background: '#E8F5E9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto', color: '#2E7D32' }}>
              <PlusCircle size={32} />
            </div>
            <h3 style={{ fontSize: '1.5rem', color: '#174D2A', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Top Up Naira Wallet</h3>
            <p style={{ color: '#546E7A', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              Add funds directly to your wallet via Paystack (Cards, USSD, Bank Transfer, Apple Pay, OPay)
            </p>

            {/* Quick preset amount chips */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {['1000', '2000', '5000', '10000'].map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setDepositAmount(amt)}
                  style={{
                    padding: '0.6rem 0.25rem',
                    borderRadius: '10px',
                    border: depositAmount === amt ? '2px solid #2E7D32' : '1px solid #CFD8DC',
                    background: depositAmount === amt ? '#E8F5E9' : '#FFFFFF',
                    color: depositAmount === amt ? '#174D2A' : '#37474F',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  ₦{Number(amt).toLocaleString()}
                </button>
              ))}
            </div>

            <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#37474F', marginBottom: '0.35rem' }}>
                Custom Deposit Amount (₦)
              </label>
              <input
                type="number"
                min="200"
                step="100"
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                placeholder="2000"
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '2px solid #CFD8DC', fontSize: '1.15rem', fontWeight: 700, boxSizing: 'border-box' }}
              />
            </div>

            {depositPaystackData ? (
              <div style={{ background: '#F1F8E9', padding: '1.25rem', borderRadius: '12px', marginBottom: '1.25rem', border: '1px solid #C8E6C9' }}>
                <p style={{ fontSize: '0.9rem', color: '#2E7D32', fontWeight: 700, margin: '0 0 0.75rem 0' }}>
                  Paystack Checkout Ready (₦{depositPaystackData.amount.toLocaleString()})
                </p>
                <a
                  href={depositPaystackData.authorization_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                  style={{ display: 'inline-flex', justifyContent: 'center', width: '100%', marginBottom: '0.75rem', padding: '0.85rem' }}
                >
                  <ExternalLink size={16} /> Open Paystack Checkout
                </a>
                <button
                  onClick={handleVerifyDeposit}
                  disabled={depositLoading}
                  className="btn-green"
                  style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
                >
                  {depositLoading ? 'Verifying...' : '✓ I Have Completed Payment'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleInitializeDeposit(Number(depositAmount))}
                disabled={depositLoading || Number(depositAmount) < 200}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', marginBottom: '0.5rem' }}
              >
                {depositLoading ? 'Connecting to Paystack...' : `Proceed with ₦${Number(depositAmount || 0).toLocaleString()}`}
              </button>
            )}

            <button
              onClick={() => { setShowDepositModal(false); setDepositPaystackData(null); }}
              className="btn-outline"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Cancel
            </button>
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
          Reward eligibility and withdrawals are governed by applicable game rules (Minimum withdrawal: ₦1,000; Rate: 1,000 Coins = ₦50).
          Please review the terms and conditions before making a purchase or participating in reward activities. Play responsibly and only spend what you can afford.
        </p>
      </div>

      {/* TRANSACTIONS LIST */}
      <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '1.75rem', border: '2px solid #C8E6C9', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.35rem', color: '#174D2A', fontWeight: 700 }}>Transaction History</h3>
          <button onClick={handleManualRefresh} className="hud-icon-btn" style={{ width: '36px', height: '36px' }} title="Refresh">
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
