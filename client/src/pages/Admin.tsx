import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import {
  ShieldCheck, Activity, Users, CreditCard, Gamepad2, Gift, Settings,
  RefreshCw, ArrowUpRight, ArrowDownRight, CheckCircle2, XCircle, AlertTriangle,
  Search, Filter, Clock, Zap, Server, Database, TrendingUp, DollarSign,
  Edit3, Lock, Unlock, ChevronRight, UserCheck, UserX, Check, X
} from 'lucide-react';
import '../styles/admin.css';

type AdminTab = 'overview' | 'users' | 'withdrawals' | 'game' | 'referrals' | 'settings';

interface OverviewStats {
  onlineUsers: number;
  ridersInGame: number;
  authenticatedOnline: number;
  guestOnline: number;
  hitsToday: number;
  totalHits: number;
  requestsPerMin: number;
  totalUsers: number;
  totalRidesCount: number;
  totalRevenueNaira: number;
  totalDepositsNaira: number;
  totalSubscriptionsNaira: number;
  totalReferralPaidNaira: number;
  totalWithdrawalsPaid: number;
  pendingWithdrawalsCount: number;
  pendingWithdrawalsSum: number;
}

interface TelemetryData {
  totalHits: number;
  hitsToday: number;
  requestsPerMin: number;
  statusCodes: { '2xx': number; '3xx': number; '4xx': number; '5xx': number };
  avgLatencyMs: number;
  p95LatencyMs: number;
  topRoutes: { path: string; count: number }[];
  recentRequests: {
    id: string;
    timestamp: string;
    method: string;
    url: string;
    status: number;
    durationMs: number;
    ip: string;
    userEmail: string | null;
  }[];
  online: {
    totalOnline: number;
    authenticatedCount: number;
    guestCount: number;
    inGameCount: number;
    activeUsers: {
      id: string;
      email: string;
      role: string;
      activity: string;
      lastSeenAgoSec: number;
      ip: string;
    }[];
  };
  system: {
    uptimeSeconds: number;
    heapUsedMb: number;
    heapTotalMb: number;
    rssMb: number;
    nodeVersion: string;
  };
}

interface AdminUserItem {
  _id: string;
  email: string;
  firstName?: string;
  role: 'user' | 'admin';
  isBanned?: boolean;
  balanceNaira: number;
  subscriptionTier: string;
  totalRides: number;
  referralCode?: string;
  referralsCount?: number;
  referralEarnings?: number;
  createdAt: string;
}

interface AdminWithdrawal {
  _id: string;
  userId: string;
  userEmail: string;
  userBalance: number;
  amount: number;
  accountNumber: string;
  bankName: string;
  bankCode: string;
  accountName?: string;
  status: 'pending' | 'paid' | 'failed';
  paystackRef?: string;
  transferCode?: string;
  createdAt: string;
}

interface AdminTransaction {
  _id: string;
  userId: string;
  userEmail: string;
  type: string;
  amount: number;
  description: string;
  reference?: string;
  status: string;
  createdAt: string;
}

export const Admin: React.FC = () => {
  const { user, isLoading, openAuthModal, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Auto-heal stale admin sessions: if the email is a known admin but
  // the cached role is still 'user', re-fetch from server and reload once.
  const ADMIN_EMAILS_SET = ['etizzer@gmail.com', 'admin@rabbitride.farm', 'admin@farm.com'];
  useEffect(() => {
    if (!user) return;
    const email = (user.email || '').toLowerCase().trim();
    const emailIsAdmin = ADMIN_EMAILS_SET.includes(email) || email === 'etizzer@gmail.com';
    const roleIsStale = user.role !== 'admin';
    if (emailIsAdmin && roleIsStale) {
      // Silently re-fetch the authoritative profile from the server
      refreshUser().then(() => window.location.reload()).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  // Live Stream Mode State (live: 3s polling, standard: 10s, manual: off)
  const [streamMode, setStreamMode] = useState<'live' | 'standard' | 'manual'>('live');
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  // Overview & Telemetry State
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);

  // Users State
  const [usersList, setUsersList] = useState<AdminUserItem[]>([]);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersRoleFilter, setUsersRoleFilter] = useState('');
  const [usersTierFilter, setUsersTierFilter] = useState('');
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null);
  const [editBalanceAdjustment, setEditBalanceAdjustment] = useState('');
  const [editBalanceReason, setEditBalanceReason] = useState('');
  const [editTier, setEditTier] = useState('');
  const [editRole, setEditRole] = useState<'user' | 'admin'>('user');
  const [editIsBanned, setEditIsBanned] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  // Withdrawals Queue State
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);
  const [withdrawalStatusFilter, setWithdrawalStatusFilter] = useState('');
  const [processingWthId, setProcessingWthId] = useState<string | null>(null);

  // Transactions Ledger State
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [txTypeFilter, setTxTypeFilter] = useState('');

  // Game Stats State
  const [gameStats, setGameStats] = useState<{
    totalRides: number;
    totalCarrots: number;
    totalDistanceMeters: number;
    avgDistanceMeters: number;
    topRides: any[];
  } | null>(null);

  // Referrals State
  const [referralStats, setReferralStats] = useState<{
    totalReferralsCount: number;
    totalCommissionPaid: number;
    topReferrers: {
      userId: string;
      email: string;
      referralCode: string;
      referralsCount: number;
      referralEarnings: number;
    }[];
  } | null>(null);

  // System Configuration State
  const [systemConfig, setSystemConfig] = useState<Record<string, any>>({
    referralRewardNaira: 100,
    coinConversionRate: 0.05,
    freeDailyRides: 3,
    minWithdrawalNaira: 1000,
    maintenanceMode: false
  });
  const [configSaving, setConfigSaving] = useState(false);

  // Fetch Overview and Live Telemetry
  const fetchOverviewAndTelemetry = useCallback(async () => {
    try {
      const [ovRes, telRes] = await Promise.all([
        api.get('/admin/overview'),
        api.get('/admin/telemetry/live')
      ]);
      if (ovRes.data.success) setOverview(ovRes.data.stats);
      if (telRes.data.success) setTelemetry(telRes.data.telemetry);
      setLastSyncTime(new Date());
    } catch (err: any) {
      if (err.response?.status === 403) {
        setErrorMsg('Access denied: You must have an administrator account to view this page.');
      } else {
        console.error('Error fetching telemetry:', err);
      }
    }
  }, []);

  // Fetch Users (supports silent background refresh)
  const fetchUsers = useCallback(async (isBg = false) => {
    try {
      if (!isBg) setLoading(true);
      const res = await api.get('/admin/users', {
        params: {
          search: usersSearch,
          role: usersRoleFilter,
          tier: usersTierFilter,
          page: usersPage,
          limit: 15
        }
      });
      if (res.data.success) {
        setUsersList(res.data.users);
        setUsersTotalPages(res.data.totalPages || 1);
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      if (!isBg) setLoading(false);
    }
  }, [usersSearch, usersRoleFilter, usersTierFilter, usersPage]);

  // Fetch Withdrawals Queue (supports silent background refresh)
  const fetchWithdrawals = useCallback(async (isBg = false) => {
    try {
      if (!isBg) setLoading(true);
      const [wRes, txRes] = await Promise.all([
        api.get('/admin/withdrawals', { params: { status: withdrawalStatusFilter } }),
        api.get('/admin/transactions', { params: { type: txTypeFilter, limit: 30 } })
      ]);
      if (wRes.data.success) setWithdrawals(wRes.data.withdrawals);
      if (txRes.data.success) setTransactions(txRes.data.transactions);
      setLastSyncTime(new Date());
    } catch (err) {
      console.error('Error fetching financials:', err);
    } finally {
      if (!isBg) setLoading(false);
    }
  }, [withdrawalStatusFilter, txTypeFilter]);

  // Fetch Game Stats (supports silent background refresh)
  const fetchGameStats = useCallback(async (isBg = false) => {
    try {
      if (!isBg) setLoading(true);
      const res = await api.get('/admin/game-stats');
      if (res.data.success) {
        setGameStats(res.data.stats);
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.error('Error fetching game stats:', err);
    } finally {
      if (!isBg) setLoading(false);
    }
  }, []);

  // Fetch Referrals (supports silent background refresh)
  const fetchReferrals = useCallback(async (isBg = false) => {
    try {
      if (!isBg) setLoading(true);
      const res = await api.get('/admin/referrals');
      if (res.data.success) {
        setReferralStats(res.data);
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.error('Error fetching referrals:', err);
    } finally {
      if (!isBg) setLoading(false);
    }
  }, []);

  // Fetch System Config
  const fetchSystemConfig = useCallback(async (isBg = false) => {
    try {
      if (!isBg) setLoading(true);
      const res = await api.get('/admin/config');
      if (res.data.success) {
        setSystemConfig(res.data.config);
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.error('Error fetching config:', err);
    } finally {
      if (!isBg) setLoading(false);
    }
  }, []);

  // Force Sync All Endpoints Concurrently
  const forceSyncAll = useCallback(async () => {
    setIsSyncingAll(true);
    setErrorMsg(null);
    try {
      await Promise.allSettled([
        fetchOverviewAndTelemetry(),
        fetchUsers(true),
        fetchWithdrawals(true),
        fetchGameStats(true),
        fetchReferrals(true),
        fetchSystemConfig(true)
      ]);
      setLastSyncTime(new Date());
      setActionSuccessMsg('⚡ All mission control endpoints synced with live database!');
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Error in forceSyncAll:', err);
    } finally {
      setIsSyncingAll(false);
    }
  }, [fetchOverviewAndTelemetry, fetchUsers, fetchWithdrawals, fetchGameStats, fetchReferrals, fetchSystemConfig]);

  // Real-Time Dynamic Polling Engine
  useEffect(() => {
    setErrorMsg(null);
    setActionSuccessMsg(null);

    // Initial fetch on tab switch
    if (activeTab === 'overview') fetchOverviewAndTelemetry();
    else if (activeTab === 'users') fetchUsers();
    else if (activeTab === 'withdrawals') fetchWithdrawals();
    else if (activeTab === 'game') fetchGameStats();
    else if (activeTab === 'referrals') fetchReferrals();
    else if (activeTab === 'settings') fetchSystemConfig();

    if (streamMode === 'manual') return;

    // Fast polling in Live Mode (3s) or Standard Mode (10s)
    const intervalMs = streamMode === 'live' ? 3000 : 10000;
    const interval = setInterval(() => {
      // Keep overview and live telemetry hits fresh
      fetchOverviewAndTelemetry();

      // Refresh currently open tab in background without table flickering
      if (activeTab === 'users') fetchUsers(true);
      else if (activeTab === 'withdrawals') fetchWithdrawals(true);
      else if (activeTab === 'game') fetchGameStats(true);
      else if (activeTab === 'referrals') fetchReferrals(true);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [activeTab, streamMode, fetchOverviewAndTelemetry, fetchUsers, fetchWithdrawals, fetchGameStats, fetchReferrals, fetchSystemConfig]);

  // Handle Save User Modal
  const handleSaveUser = async () => {
    if (!editingUser) return;
    try {
      setEditSaving(true);
      const payload: any = {
        role: editRole,
        isBanned: editIsBanned
      };
      if (editTier) payload.subscriptionTier = editTier;
      if (editBalanceAdjustment && Number(editBalanceAdjustment) !== 0) {
        payload.balanceAdjustment = Number(editBalanceAdjustment);
        payload.reason = editBalanceReason || 'Admin Manual Adjustment';
      }

      const res = await api.patch(`/admin/users/${editingUser._id}`, payload);
      if (res.data.success) {
        setActionSuccessMsg(`User ${editingUser.email} updated successfully!`);
        setEditingUser(null);
        fetchUsers();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update user.');
    } finally {
      setEditSaving(false);
    }
  };

  // Handle Approve Withdrawal
  const handleApproveWithdrawal = async (id: string, method: 'paystack' | 'manual') => {
    if (!confirm(`Are you sure you want to approve this cashout via ${method.toUpperCase()}?`)) return;
    try {
      setProcessingWthId(id);
      const res = await api.post(`/admin/withdrawals/${id}/approve`, { method });
      if (res.data.success) {
        setActionSuccessMsg(res.data.message);
        fetchWithdrawals();
        fetchOverviewAndTelemetry();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error approving withdrawal.');
    } finally {
      setProcessingWthId(null);
    }
  };

  // Handle Reject Withdrawal
  const handleRejectWithdrawal = async (id: string) => {
    const reason = prompt('Please enter a rejection reason (funds will be refunded to rider balance):', 'Bank account invalid or flagged');
    if (!reason) return;
    try {
      setProcessingWthId(id);
      const res = await api.post(`/admin/withdrawals/${id}/reject`, { reason });
      if (res.data.success) {
        setActionSuccessMsg(res.data.message);
        fetchWithdrawals();
        fetchOverviewAndTelemetry();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error rejecting withdrawal.');
    } finally {
      setProcessingWthId(null);
    }
  };

  // Handle Save System Config
  const handleSaveConfig = async (key: string, value: any, description: string) => {
    try {
      setConfigSaving(true);
      const res = await api.put('/admin/config', { key, value, description });
      if (res.data.success) {
        setActionSuccessMsg(`Config [${key}] saved successfully!`);
        setSystemConfig(prev => ({ ...prev, [key]: value }));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update config.');
    } finally {
      setConfigSaving(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="admin-container" style={{ textAlign: 'center', paddingTop: '8rem' }}>
        <div style={{ color: '#94A3B8', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
          <RefreshCw className="spin" size={24} />
          <span>Verifying administrator credentials…</span>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="admin-container" style={{ textAlign: 'center', paddingTop: '5rem' }}>
        <div className="admin-panel" style={{ maxWidth: '540px', margin: '0 auto', textAlign: 'center' }}>
          <ShieldCheck size={54} color="#3B82F6" style={{ margin: '0 auto 1.25rem' }} />
          <h2 style={{ fontSize: '1.6rem', marginBottom: '0.75rem' }}>Administrator Sign In Required</h2>
          <p style={{ color: '#94A3B8', lineHeight: 1.6, marginBottom: '2rem' }}>
            Please sign in with your administrator account to access Mission Control.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button onClick={() => openAuthModal('login')} className="btn-primary">
              Sign In as Admin
            </button>
            <button onClick={() => navigate('/')} className="btn-secondary" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', padding: '0.75rem 1.5rem', borderRadius: '12px' }}>
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If user is not admin
  const ADMIN_EMAILS = ['etizzer@gmail.com', 'admin@rabbitride.farm', 'admin@farm.com'];
  const userEmail = (user.email || '').toLowerCase().trim();
  const isAdmin = user.role === 'admin' || ADMIN_EMAILS.includes(userEmail) || userEmail === 'etizzer@gmail.com';

  if (!isAdmin) {
    return (
      <div className="admin-container" style={{ textAlign: 'center', paddingTop: '5rem' }}>
        <div className="admin-panel" style={{ maxWidth: '540px', margin: '0 auto', textAlign: 'center' }}>
          <AlertTriangle size={54} color="#F59E0B" style={{ margin: '0 auto 1.25rem' }} />
          <h2 style={{ fontSize: '1.6rem', marginBottom: '0.75rem' }}>Restricted Access</h2>
          <p style={{ color: '#94A3B8', lineHeight: 1.6, marginBottom: '1rem' }}>
            You are signed in as <strong>{user.email}</strong>, but this session does not have administrator privileges.
          </p>
          <p style={{ color: '#64748B', fontSize: '0.85rem', marginBottom: '2rem' }}>
            If you are the admin, your session may be stale. Click <strong>Refresh Session</strong> to re-verify your role.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={async () => {
                await refreshUser();
                window.location.reload();
              }}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <RefreshCw size={16} /> Refresh Session
            </button>
            <button onClick={() => navigate('/')} className="btn-secondary" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', padding: '0.75rem 1.5rem', borderRadius: '12px' }}>
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* Top Header */}
      <header className="admin-header">
        <div className="admin-title-group">
          <h1><ShieldCheck size={32} /> Mission Control &amp; Admin Hub</h1>
          <p className="admin-subtitle">
            <span>Platform Telemetry, Traffic Hits &amp; Payment Gateway Operations</span>
          </p>
        </div>

        <div className="admin-top-actions">
          {/* Live Stream Mode Switcher */}
          <div className="admin-stream-selector" style={{ display: 'inline-flex', gap: '4px', background: 'rgba(255, 255, 255, 0.06)', padding: '3px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
            <button
              onClick={() => setStreamMode('live')}
              title="Stream live updates every 3 seconds"
              style={{
                background: streamMode === 'live' ? '#10B981' : 'transparent',
                color: streamMode === 'live' ? '#FFFFFF' : '#94A3B8',
                border: 'none',
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: streamMode === 'live' ? '#FFF' : '#10B981', display: 'inline-block' }} />
              LIVE 3s
            </button>

            <button
              onClick={() => setStreamMode('standard')}
              title="Poll every 10 seconds"
              style={{
                background: streamMode === 'standard' ? '#3B82F6' : 'transparent',
                color: streamMode === 'standard' ? '#FFFFFF' : '#94A3B8',
                border: 'none',
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              10s
            </button>

            <button
              onClick={() => setStreamMode('manual')}
              title="Pause automatic background polling"
              style={{
                background: streamMode === 'manual' ? '#64748B' : 'transparent',
                color: streamMode === 'manual' ? '#FFFFFF' : '#94A3B8',
                border: 'none',
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Paused
            </button>
          </div>

          {/* Master Force Sync All Endpoints */}
          <button
            onClick={forceSyncAll}
            disabled={isSyncingAll}
            className="btn-admin-sync-all"
            title="Force sync all 5 admin endpoints immediately with latest server data"
            style={{
              background: 'linear-gradient(135deg, #FF7A00 0%, #FF9E00 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              padding: '6px 14px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: isSyncingAll ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(255, 122, 0, 0.35)'
            }}
          >
            <Zap size={16} fill="#FFF" className={isSyncingAll ? 'spin' : ''} />
            <span>{isSyncingAll ? 'Syncing...' : 'Sync All'}</span>
          </button>

          {/* Refresh Current Tab */}
          <button
            onClick={() => {
              if (activeTab === 'overview') fetchOverviewAndTelemetry();
              else if (activeTab === 'users') fetchUsers();
              else if (activeTab === 'withdrawals') fetchWithdrawals();
              else if (activeTab === 'game') fetchGameStats();
              else if (activeTab === 'referrals') fetchReferrals();
              else if (activeTab === 'settings') fetchSystemConfig();
            }}
            className="btn-admin-refresh"
            title="Refresh current tab view"
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* Notifications */}
      {actionSuccessMsg && (
        <div className="alert-box success" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{actionSuccessMsg}</span>
          <button onClick={() => setActionSuccessMsg(null)} style={{ background: 'none', border: 'none', color: '#10B981', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="alert-box warning" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} style={{ background: 'none', border: 'none', color: '#F59E0B', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Navigation Tabs */}
      <nav className="admin-tabs-nav">
        <button
          className={`admin-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Activity size={18} /> Mission Control &amp; Live Hits
        </button>

        <button
          className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={18} /> Player Accounts ({overview?.totalUsers || 0})
        </button>

        <button
          className={`admin-tab-btn ${activeTab === 'withdrawals' ? 'active' : ''}`}
          onClick={() => setActiveTab('withdrawals')}
        >
          <CreditCard size={18} /> Financials &amp; Payouts {overview?.pendingWithdrawalsCount ? `(${overview.pendingWithdrawalsCount})` : ''}
        </button>

        <button
          className={`admin-tab-btn ${activeTab === 'game' ? 'active' : ''}`}
          onClick={() => setActiveTab('game')}
        >
          <Gamepad2 size={18} /> Game Telemetry
        </button>

        <button
          className={`admin-tab-btn ${activeTab === 'referrals' ? 'active' : ''}`}
          onClick={() => setActiveTab('referrals')}
        >
          <Gift size={18} /> Referral Program
        </button>

        <button
          className={`admin-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={18} /> Economy &amp; Config
        </button>
      </nav>

      {/* ─── TAB 1: MISSION CONTROL & LIVE HITS ───────────────────────────── */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Stat Cards Grid */}
          <div className="admin-kpi-grid">
            <div className="admin-kpi-card green">
              <div className="kpi-header">
                <span className="kpi-title">Online Riders Now</span>
                <div className="kpi-icon-wrap" style={{ color: '#34D399' }}><Users size={20} /></div>
              </div>
              <div className="kpi-value">{overview?.onlineUsers || 0}</div>
              <div className="kpi-subtext">
                <span>🎮 {overview?.ridersInGame || 0} in active game</span>
                <span>• {overview?.authenticatedOnline || 0} auth</span>
              </div>
            </div>

            <div className="admin-kpi-card orange">
              <div className="kpi-header">
                <span className="kpi-title">Hits Today</span>
                <div className="kpi-icon-wrap" style={{ color: '#FBBF24' }}><TrendingUp size={20} /></div>
              </div>
              <div className="kpi-value">{(overview?.hitsToday || 0).toLocaleString()}</div>
              <div className="kpi-subtext">
                <span>⚡ {overview?.requestsPerMin || 0} req/min</span>
                <span>• {(overview?.totalHits || 0).toLocaleString()} all-time</span>
              </div>
            </div>

            <div className="admin-kpi-card blue">
              <div className="kpi-header">
                <span className="kpi-title">Platform Revenue</span>
                <div className="kpi-icon-wrap" style={{ color: '#06B6D4' }}><DollarSign size={20} /></div>
              </div>
              <div className="kpi-value">₦{(overview?.totalRevenueNaira || 0).toLocaleString()}</div>
              <div className="kpi-subtext">
                <span>₦{(overview?.totalDepositsNaira || 0).toLocaleString()} deposits</span>
                <span>• ₦{(overview?.totalSubscriptionsNaira || 0).toLocaleString()} packs</span>
              </div>
            </div>

            <div className="admin-kpi-card rose">
              <div className="kpi-header">
                <span className="kpi-title">Pending Cashouts</span>
                <div className="kpi-icon-wrap" style={{ color: '#FB7185' }}><CreditCard size={20} /></div>
              </div>
              <div className="kpi-value">{overview?.pendingWithdrawalsCount || 0}</div>
              <div className="kpi-subtext">
                <span>Total ₦{(overview?.pendingWithdrawalsSum || 0).toLocaleString()} queued</span>
              </div>
            </div>

            <div className="admin-kpi-card purple">
              <div className="kpi-header">
                <span className="kpi-title">Total Rides</span>
                <div className="kpi-icon-wrap" style={{ color: '#A78BFA' }}><Gamepad2 size={20} /></div>
              </div>
              <div className="kpi-value">{(overview?.totalRidesCount || 0).toLocaleString()}</div>
              <div className="kpi-subtext">
                <span>Across {overview?.totalUsers || 0} registered riders</span>
              </div>
            </div>
          </div>

          {/* 2-Column Section: Real-time Traffic & Latency */}
          <div className="admin-grid-2col">
            {/* Left: Real-Time Traffic Stream */}
            <div className="admin-panel">
              <div className="admin-panel-header">
                <h3 className="admin-panel-title">
                  <Activity size={20} style={{ color: '#818CF8' }} /> Real-Time Traffic Stream
                </h3>
                <div className="status-code-pills">
                  <span className="status-pill s2xx">2xx: {telemetry?.statusCodes['2xx'] || 0}</span>
                  <span className="status-pill s3xx">3xx: {telemetry?.statusCodes['3xx'] || 0}</span>
                  <span className="status-pill s4xx">4xx: {telemetry?.statusCodes['4xx'] || 0}</span>
                  <span className="status-pill s5xx">5xx: {telemetry?.statusCodes['5xx'] || 0}</span>
                </div>
              </div>

              <div className="traffic-stream-box">
                <table className="traffic-stream-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Method</th>
                      <th>Endpoint</th>
                      <th>Status</th>
                      <th>Latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {telemetry?.recentRequests && telemetry.recentRequests.length > 0 ? (
                      telemetry.recentRequests.slice(0, 15).map(req => (
                        <tr key={req.id}>
                          <td style={{ color: '#555872', whiteSpace: 'nowrap' }}>
                            {new Date(req.timestamp).toLocaleTimeString()}
                          </td>
                          <td>
                            <span className={`method-tag ${req.method}`}>{req.method}</span>
                          </td>
                          <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {req.url}
                          </td>
                          <td>
                            <span style={{
                              fontWeight: 700,
                              color: req.status >= 500 ? '#F87171' : req.status >= 400 ? '#FBBF24' : '#34D399'
                            }}>
                              {req.status}
                            </span>
                          </td>
                          <td style={{ color: '#94A3B8' }}>{req.durationMs}ms</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>
                          Listening for incoming platform requests...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Server Telemetry & Top Routes */}
            <div className="admin-panel">
              <div className="admin-panel-header">
                <h3 className="admin-panel-title">
                  <Server size={20} style={{ color: '#34D399' }} /> System Health &amp; Endpoint Loads
                </h3>
                <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>
                  Avg Latency: <strong style={{ color: '#67E8F9' }}>{telemetry?.avgLatencyMs || 0}ms</strong> (p95: {telemetry?.p95LatencyMs || 0}ms)
                </span>
              </div>

              {/* Server Info Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }} className="system-health-grid">
                <div style={{ background: 'rgba(10, 12, 25, 0.6)', padding: '0.85rem', borderRadius: '14px', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#555872', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>MEMORY HEAP</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#34D399' }}>
                    {telemetry?.system.heapUsedMb || 0} MB
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#555872' }}>of {telemetry?.system.heapTotalMb || 0} MB</div>
                </div>

                <div style={{ background: 'rgba(10, 12, 25, 0.6)', padding: '0.85rem', borderRadius: '14px', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#555872', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>UPTIME</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#818CF8' }}>
                    {Math.floor((telemetry?.system.uptimeSeconds || 0) / 3600)}h {Math.floor(((telemetry?.system.uptimeSeconds || 0) % 3600) / 60)}m
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#555872' }}>Online &amp; Stable</div>
                </div>

                <div style={{ background: 'rgba(10, 12, 25, 0.6)', padding: '0.85rem', borderRadius: '14px', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#555872', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>GATEWAYS</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#C4B5FD' }}>
                    Paystack
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#34D399' }}>● Connected</div>
                </div>
              </div>

              {/* Popular Endpoints */}
              <h4 style={{ fontSize: '0.82rem', color: '#8B8FA3', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                Most Requested Endpoints
              </h4>
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Endpoint Path</th>
                      <th style={{ textAlign: 'right' }}>Total Hits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {telemetry?.topRoutes && telemetry.topRoutes.length > 0 ? (
                      telemetry.topRoutes.map((r, i) => (
                        <tr key={i}>
                          <td style={{ fontFamily: "'JetBrains Mono', monospace", color: '#818CF8' }}>{r.path}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{r.count.toLocaleString()}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} style={{ textAlign: 'center', color: '#64748B' }}>No routes recorded yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── TAB 2: USER DIRECTORY & ACCOUNT MODERATION ───────────────────── */}
      {activeTab === 'users' && (
        <div className="admin-panel">
          <div className="admin-panel-header">
            <h3 className="admin-panel-title">
              <Users size={20} style={{ color: '#A78BFA' }} /> Player Accounts Directory
            </h3>
            <span style={{ color: '#8B8FA3', fontSize: '0.85rem' }}>
              Showing {usersList.length} players
            </span>
          </div>

          {/* Filter & Search Bar */}
          <div className="admin-filter-bar">
            <input
              type="text"
              placeholder="Search by email, name, or referral code..."
              value={usersSearch}
              onChange={e => { setUsersSearch(e.target.value); setUsersPage(1); }}
              className="admin-search-input"
            />

            <select
              value={usersRoleFilter}
              onChange={e => { setUsersRoleFilter(e.target.value); setUsersPage(1); }}
              className="admin-select"
            >
              <option value="">All Roles</option>
              <option value="user">Standard Riders</option>
              <option value="admin">Administrators</option>
            </select>

            <select
              value={usersTierFilter}
              onChange={e => { setUsersTierFilter(e.target.value); setUsersPage(1); }}
              className="admin-select"
            >
              <option value="">All Subscription Tiers</option>
              <option value="free">Free Tier</option>
              <option value="basic">Basic (₦1k)</option>
              <option value="growth">Growth (₦2k)</option>
              <option value="pro">Pro (₦5k)</option>
              <option value="elite">Elite (₦10k)</option>
            </select>
          </div>

          {/* Users Table */}
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Player Email</th>
                  <th>Balance</th>
                  <th>Tier</th>
                  <th>Rides</th>
                  <th>Referral Code</th>
                  <th>Invites</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersList.length > 0 ? (
                  usersList.map(u => {
                    const activeSession = telemetry?.online?.activeUsers?.find(
                      s => s.id === u._id || s.email?.toLowerCase() === u.email?.toLowerCase()
                    );
                    const isOnline = Boolean(activeSession);
                    const isRiding = activeSession?.activity === 'riding';

                    return (
                      <tr key={u._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 700 }}>{u.email}</span>
                            {isOnline && (
                              <span style={{
                                background: isRiding ? 'rgba(255, 122, 0, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                color: isRiding ? '#FF9E00' : '#34D399',
                                border: `1px solid ${isRiding ? '#FF9E00' : '#34D399'}`,
                                borderRadius: '6px',
                                padding: '1px 6px',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                letterSpacing: '0.4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isRiding ? '#FF9E00' : '#34D399' }} />
                                {isRiding ? '🎮 RIDING' : '🟢 ONLINE'}
                              </span>
                            )}
                          </div>
                          {u.firstName && <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{u.firstName}</div>}
                        </td>
                      <td style={{ fontWeight: 700, color: '#34D399' }}>
                        ₦{(u.balanceNaira || 0).toLocaleString()}
                      </td>
                      <td>
                        <span className={`badge-tier ${u.subscriptionTier}`}>
                          {u.subscriptionTier}
                        </span>
                      </td>
                      <td>{u.totalRides || 0}</td>
                      <td>
                        <code style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                          {u.referralCode || 'NONE'}
                        </code>
                      </td>
                      <td>
                        <span style={{ color: '#FBBF24', fontWeight: 700 }}>{u.referralsCount || 0}</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748B' }}> (₦{(u.referralEarnings || 0).toLocaleString()})</span>
                      </td>
                      <td>
                        <span className={`badge-role ${u.role}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        {u.isBanned ? (
                          <span style={{ color: '#F87171', fontWeight: 700, fontSize: '0.8rem' }}>BANNED</span>
                        ) : (
                          <span style={{ color: '#34D399', fontSize: '0.8rem' }}>Active</span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => {
                            setEditingUser(u);
                            setEditRole(u.role);
                            setEditTier(u.subscriptionTier);
                            setEditIsBanned(Boolean(u.isBanned));
                            setEditBalanceAdjustment('');
                            setEditBalanceReason('');
                          }}
                          className="btn-action-sm edit"
                        >
                          <Edit3 size={14} /> Manage
                        </button>
                      </td>
                    </tr>
                  );
                })) : (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
                      No players matched the search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {usersTotalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button
                disabled={usersPage <= 1}
                onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                className="btn-admin-refresh"
              >
                Previous
              </button>
              <span style={{ padding: '0.55rem 1rem', color: '#94A3B8', fontWeight: 600 }}>
                Page {usersPage} of {usersTotalPages}
              </span>
              <button
                disabled={usersPage >= usersTotalPages}
                onClick={() => setUsersPage(p => Math.min(usersTotalPages, p + 1))}
                className="btn-admin-refresh"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: FINANCIALS & PAYOUTS QUEUE ─────────────────────────────── */}
      {activeTab === 'withdrawals' && (
        <>
          <div className="admin-panel">
            <div className="admin-panel-header">
              <h3 className="admin-panel-title">
                <CreditCard size={20} style={{ color: '#FB7185' }} /> Pending Cashout Queue
              </h3>
              <select
                value={withdrawalStatusFilter}
                onChange={e => setWithdrawalStatusFilter(e.target.value)}
                className="admin-select"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending Only</option>
                <option value="paid">Paid Only</option>
                <option value="failed">Failed / Refunded Only</option>
              </select>
            </div>

            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Rider Email</th>
                    <th>Amount</th>
                    <th>Destination Bank</th>
                    <th>Account Number</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.length > 0 ? (
                    withdrawals.map(w => (
                      <tr key={w._id}>
                        <td style={{ color: '#94A3B8', whiteSpace: 'nowrap' }}>
                          {new Date(w.createdAt).toLocaleDateString()} {new Date(w.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700 }}>{w.userEmail}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Bal: ₦{(w.userBalance || 0).toLocaleString()}</div>
                        </td>
                        <td style={{ fontWeight: 800, color: '#FBBF24', fontSize: '1rem' }}>
                          ₦{w.amount.toLocaleString()}
                        </td>
                        <td>{w.bankName || w.bankCode}</td>
                        <td>
                          <code style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                            {w.accountNumber}
                          </code>
                          {w.accountName && <div style={{ fontSize: '0.75rem', color: '#34D399' }}>{w.accountName}</div>}
                        </td>
                        <td>
                          <span className={`badge-status ${w.status}`}>
                            {w.status.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          {w.status === 'pending' ? (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                disabled={processingWthId === w._id}
                                onClick={() => handleApproveWithdrawal(w._id, 'paystack')}
                                className="btn-action-sm approve"
                                title="Execute real bank transfer via Paystack"
                              >
                                ⚡ Paystack Transfer
                              </button>
                              <button
                                disabled={processingWthId === w._id}
                                onClick={() => handleApproveWithdrawal(w._id, 'manual')}
                                className="btn-action-sm edit"
                                title="Mark as paid manually"
                              >
                                ✅ Mark Paid
                              </button>
                              <button
                                disabled={processingWthId === w._id}
                                onClick={() => handleRejectWithdrawal(w._id)}
                                className="btn-action-sm reject"
                                title="Reject and refund rider"
                              >
                                ✕ Reject
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                              Ref: {w.transferCode || w.paystackRef || 'N/A'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
                        No withdrawal requests found in this queue.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Full Transaction Audit Ledger */}
          <div className="admin-panel">
            <div className="admin-panel-header">
              <h3 className="admin-panel-title">
                <Clock size={20} style={{ color: '#67E8F9' }} /> Platform Transaction Audit Ledger
              </h3>
              <select
                value={txTypeFilter}
                onChange={e => setTxTypeFilter(e.target.value)}
                className="admin-select"
              >
                <option value="">All Types</option>
                <option value="deposit">Deposits</option>
                <option value="subscription">Subscriptions</option>
                <option value="coin_purchase">Coin Purchases</option>
                <option value="withdrawal">Withdrawals</option>
                <option value="referral">Referral Commissions</option>
              </select>
            </div>

            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>User</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Description</th>
                    <th>Reference</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length > 0 ? (
                    transactions.map(t => (
                      <tr key={t._id}>
                        <td style={{ color: '#94A3B8', whiteSpace: 'nowrap' }}>
                          {new Date(t.createdAt).toLocaleDateString()}
                        </td>
                        <td>{t.userEmail}</td>
                        <td>
                          <span className={`badge-tier ${t.type}`}>
                            {t.type}
                          </span>
                        </td>
                        <td style={{
                          fontWeight: 700,
                          color: t.amount > 0 ? '#34D399' : '#F87171'
                        }}>
                          {t.amount > 0 ? '+' : ''}₦{Math.abs(t.amount).toLocaleString()}
                        </td>
                        <td style={{ color: '#CBD5E1' }}>{t.description}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#64748B' }}>
                          {t.reference || '—'}
                        </td>
                        <td>
                          <span className={`badge-status ${t.status}`}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8' }}>
                        No transactions recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ─── TAB 4: GAME TELEMETRY ────────────────────────────────────────── */}
      {activeTab === 'game' && (
        <div className="admin-panel">
          <div className="admin-panel-header">
            <h3 className="admin-panel-title">
              <Gamepad2 size={20} style={{ color: '#A78BFA' }} /> Gameplay Activity &amp; Records
            </h3>
          </div>

          <div className="admin-kpi-grid">
            <div className="admin-kpi-card purple">
              <div className="kpi-header"><span className="kpi-title">Total Rides Finished</span></div>
              <div className="kpi-value">{(gameStats?.totalRides || 0).toLocaleString()}</div>
            </div>
            <div className="admin-kpi-card orange">
              <div className="kpi-header"><span className="kpi-title">Total Carrots Collected</span></div>
              <div className="kpi-value">{(gameStats?.totalCarrots || 0).toLocaleString()}</div>
            </div>
            <div className="admin-kpi-card blue">
              <div className="kpi-header"><span className="kpi-title">Total Distance Travelled</span></div>
              <div className="kpi-value">{Math.round((gameStats?.totalDistanceMeters || 0) / 1000)} km</div>
            </div>
            <div className="admin-kpi-card green">
              <div className="kpi-header"><span className="kpi-title">Average Run Distance</span></div>
              <div className="kpi-value">{gameStats?.avgDistanceMeters || 0} m</div>
            </div>
          </div>

          <h4 style={{ fontSize: '1rem', color: '#F1F5F9', marginTop: '1.5rem', marginBottom: '1rem' }}>
            🏆 Top 10 High Distance Rides
          </h4>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Distance</th>
                  <th>Carrots</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {gameStats?.topRides && gameStats.topRides.length > 0 ? (
                  gameStats.topRides.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 800, color: i === 0 ? '#FBBF24' : '#E2E8F0' }}>#{i + 1}</td>
                      <td style={{ fontWeight: 700, color: '#818CF8' }}>{Math.round(r.distanceTraveled || 0)} meters</td>
                      <td style={{ color: '#F59E0B', fontWeight: 700 }}>🥕 {r.carrotsCollected || 0}</td>
                      <td style={{ color: '#94A3B8' }}>{new Date(r.createdAt || Date.now()).toLocaleDateString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8' }}>No recorded rides yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 5: REFERRAL PROGRAM ──────────────────────────────────────── */}
      {activeTab === 'referrals' && (
        <div className="admin-panel">
          <div className="admin-panel-header">
            <h3 className="admin-panel-title">
              <Gift size={20} style={{ color: '#FBBF24' }} /> Referral Economy Command Center
            </h3>
          </div>

          <div className="admin-kpi-grid">
            <div className="admin-kpi-card orange">
              <div className="kpi-header"><span className="kpi-title">Total Platform Referrals</span></div>
              <div className="kpi-value">{referralStats?.totalReferralsCount || 0}</div>
              <div className="kpi-subtext">Successful friend invites credited</div>
            </div>
            <div className="admin-kpi-card green">
              <div className="kpi-header"><span className="kpi-title">Total Commissions Paid</span></div>
              <div className="kpi-value">₦{(referralStats?.totalCommissionPaid || 0).toLocaleString()}</div>
              <div className="kpi-subtext">At ₦100 per valid referral</div>
            </div>
          </div>

          <h4 style={{ fontSize: '1rem', color: '#F1F5F9', marginTop: '1.5rem', marginBottom: '1rem' }}>
            🥇 Top Referrers Leaderboard
          </h4>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player Email</th>
                  <th>Referral Code</th>
                  <th>Invited Players</th>
                  <th>Total Earned</th>
                </tr>
              </thead>
              <tbody>
                {referralStats?.topReferrers && referralStats.topReferrers.length > 0 ? (
                  referralStats.topReferrers.map((ref, idx) => (
                    <tr key={ref.userId}>
                      <td style={{ fontWeight: 800, color: idx === 0 ? '#FBBF24' : '#E2E8F0' }}>#{idx + 1}</td>
                      <td style={{ fontWeight: 700 }}>{ref.email}</td>
                      <td>
                        <code style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                          {ref.referralCode}
                        </code>
                      </td>
                      <td style={{ fontWeight: 800, color: '#818CF8' }}>{ref.referralsCount} riders</td>
                      <td style={{ fontWeight: 800, color: '#34D399' }}>₦{ref.referralEarnings.toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8' }}>
                      No player referrals recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 6: DYNAMIC SYSTEM CONFIG ─────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="admin-panel">
          <div className="admin-panel-header">
            <h3 className="admin-panel-title">
              <Settings size={20} style={{ color: '#A78BFA' }} /> Runtime Platform &amp; Economy Settings
            </h3>
            <span style={{ color: '#8B8FA3', fontSize: '0.82rem' }}>Changes apply immediately without redeploying</span>
          </div>

          <div className="config-card">
            <div className="config-info">
              <h4>Referral Bonus Commission (₦)</h4>
              <p>Amount credited to a player for inviting a new friend</p>
            </div>
            <div className="config-input-wrap">
              <input
                type="number"
                value={systemConfig.referralRewardNaira || 100}
                onChange={e => setSystemConfig({ ...systemConfig, referralRewardNaira: Number(e.target.value) })}
              />
              <button
                disabled={configSaving}
                onClick={() => handleSaveConfig('referralRewardNaira', systemConfig.referralRewardNaira, 'Referral reward per invite')}
                className="btn-action-sm approve"
              >
                Save
              </button>
            </div>
          </div>

          <div className="config-card">
            <div className="config-info">
              <h4>Coin Conversion Value (₦ per 1,000 Coins)</h4>
              <p>Default: ₦50 per 1,000 coins (0.05 rate)</p>
            </div>
            <div className="config-input-wrap">
              <input
                type="number"
                step="0.01"
                value={systemConfig.coinConversionRate || 0.05}
                onChange={e => setSystemConfig({ ...systemConfig, coinConversionRate: Number(e.target.value) })}
              />
              <button
                disabled={configSaving}
                onClick={() => handleSaveConfig('coinConversionRate', systemConfig.coinConversionRate, 'Coin exchange rate')}
                className="btn-action-sm approve"
              >
                Save
              </button>
            </div>
          </div>

          <div className="config-card">
            <div className="config-info">
              <h4>Free Tier Daily Rides Limit</h4>
              <p>Number of free rides before requiring a gameplay subscription</p>
            </div>
            <div className="config-input-wrap">
              <input
                type="number"
                value={systemConfig.freeDailyRides || 3}
                onChange={e => setSystemConfig({ ...systemConfig, freeDailyRides: Number(e.target.value) })}
              />
              <button
                disabled={configSaving}
                onClick={() => handleSaveConfig('freeDailyRides', systemConfig.freeDailyRides, 'Free tier daily rides')}
                className="btn-action-sm approve"
              >
                Save
              </button>
            </div>
          </div>

          <div className="config-card">
            <div className="config-info">
              <h4>Minimum Withdrawal Threshold (₦)</h4>
              <p>Minimum balance required for a rider to request bank payout</p>
            </div>
            <div className="config-input-wrap">
              <input
                type="number"
                value={systemConfig.minWithdrawalNaira || 1000}
                onChange={e => setSystemConfig({ ...systemConfig, minWithdrawalNaira: Number(e.target.value) })}
              />
              <button
                disabled={configSaving}
                onClick={() => handleSaveConfig('minWithdrawalNaira', systemConfig.minWithdrawalNaira, 'Minimum withdrawal threshold')}
                className="btn-action-sm approve"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: EDIT USER ACCOUNT ──────────────────────────────────────── */}
      {editingUser && (
        <div className="admin-modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Manage Player: {editingUser.email}</h3>
              <button onClick={() => setEditingUser(null)} className="btn-modal-close"><X size={20} /></button>
            </div>

            <div style={{ marginBottom: '1.25rem', padding: '0.85rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Current Balance: <strong style={{ color: '#34D399' }}>₦{(editingUser.balanceNaira || 0).toLocaleString()}</strong></div>
              <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Subscription: <strong style={{ color: '#38BDF8' }}>{editingUser.subscriptionTier}</strong></div>
              <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Total Rides: <strong>{editingUser.totalRides || 0}</strong></div>
            </div>

            <div className="form-group-admin">
              <label>Balance Adjustment (₦) (+ to Credit, - to Debit)</label>
              <input
                type="number"
                placeholder="e.g. 500 or -200"
                value={editBalanceAdjustment}
                onChange={e => setEditBalanceAdjustment(e.target.value)}
              />
            </div>

            {editBalanceAdjustment && (
              <div className="form-group-admin">
                <label>Reason for Adjustment</label>
                <input
                  type="text"
                  placeholder="e.g. Promotional Bonus, Correction"
                  value={editBalanceReason}
                  onChange={e => setEditBalanceReason(e.target.value)}
                />
              </div>
            )}

            <div className="form-group-admin">
              <label>Subscription Tier</label>
              <select value={editTier} onChange={e => setEditTier(e.target.value)}>
                <option value="free">Free Tier</option>
                <option value="basic">Basic (₦1,000)</option>
                <option value="growth">Growth (₦2,000)</option>
                <option value="pro">Pro (₦5,000)</option>
                <option value="elite">Elite (₦10,000)</option>
              </select>
            </div>

            <div className="form-group-admin">
              <label>Account Role</label>
              <select value={editRole} onChange={e => setEditRole(e.target.value as any)}>
                <option value="user">Standard User</option>
                <option value="admin">Administrator (Full Access)</option>
              </select>
            </div>

            <div className="form-group-admin" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}>
              <input
                type="checkbox"
                id="isBannedCheck"
                checked={editIsBanned}
                onChange={e => setEditIsBanned(e.target.checked)}
                style={{ width: 'auto' }}
              />
              <label htmlFor="isBannedCheck" style={{ margin: 0, color: editIsBanned ? '#F87171' : '#E2E8F0', fontWeight: 700 }}>
                Suspend / Ban Account
              </label>
            </div>

            <div className="admin-modal-actions">
              <button onClick={() => setEditingUser(null)} className="btn-admin-refresh">Cancel</button>
              <button disabled={editSaving} onClick={handleSaveUser} className="btn-primary">
                {editSaving ? 'Saving Changes...' : 'Save Player Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
