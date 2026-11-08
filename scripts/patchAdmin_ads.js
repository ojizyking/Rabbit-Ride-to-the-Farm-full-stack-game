/**
 * patchAdmin_ads.js — Task 3C
 * Adds the 📢 Ads tab to Admin.tsx with full ad CRUD manager
 */
const fs = require('fs');
const file = 'client/src/pages/Admin.tsx';
let src = fs.readFileSync(file, 'utf8');

// ── 1. Extend AdminTab type ───────────────────────────────────────────────
src = src.replace(
  `type AdminTab = 'overview' | 'users' | 'withdrawals' | 'game' | 'referrals' | 'settings';`,
  `type AdminTab = 'overview' | 'users' | 'withdrawals' | 'game' | 'referrals' | 'settings' | 'ads';

interface AdItem {
  _id?: string;
  title: string;
  subtitle: string;
  tag: string;
  slogan: string;
  perk: string;
  accentColor: string;
  bgColor: string;
  icon: string;
  imageUrl: string;
  linkUrl: string;
  isActive: boolean;
  order: number;
}`
);
console.log('✅ AdminTab type extended + AdItem interface added');

// ── 2. Add Megaphone to lucide imports ────────────────────────────────────
src = src.replace(
  `  Edit3, Lock, Unlock, ChevronRight, UserCheck, UserX, Check, X`,
  `  Edit3, Lock, Unlock, ChevronRight, UserCheck, UserX, Check, X, Megaphone, Plus, Trash2, Image, Link`
);
console.log('✅ Megaphone + Plus + Trash2 added to lucide imports');

// ── 3. Add ads state variables after configSaving state ──────────────────
const CONFIG_SAVING_STATE = `  const [configSaving, setConfigSaving] = useState(false);`;
const ADS_STATE = `  const [configSaving, setConfigSaving] = useState(false);

  // ── Ad Manager state ──────────────────────────────────────────────────
  const [adsList, setAdsList] = useState<AdItem[]>([]);
  const [adsLoading, setAdsLoading] = useState(false);
  const [showAdForm, setShowAdForm] = useState(false);
  const [editingAd, setEditingAd] = useState<AdItem | null>(null);
  const [adSaving, setAdSaving] = useState(false);
  const [adFormData, setAdFormData] = useState<AdItem>({
    title: '', subtitle: '', tag: 'SPONSOR', slogan: '', perk: '',
    accentColor: '#FF7A00', bgColor: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)',
    icon: '🌾', imageUrl: '', linkUrl: '', isActive: true, order: 0
  });`;

src = src.replace(CONFIG_SAVING_STATE, ADS_STATE);
console.log('✅ Ad manager state variables added');

// ── 4. Add fetchAds function after fetchSystemConfig ─────────────────────
const FETCH_SYS_CONFIG_END = `    fetchSystemConfig();
  }, [fetchOverviewAndTelemetry, fetchUsers, fetchWithdrawals, fetchGameStats, fetchReferrals, fetchSystemConfig]);`;

const FETCH_ADS_INSERT = `    fetchSystemConfig();
    if (activeTab === 'ads') fetchAds();
  }, [fetchOverviewAndTelemetry, fetchUsers, fetchWithdrawals, fetchGameStats, fetchReferrals, fetchSystemConfig]);

  const fetchAds = async () => {
    setAdsLoading(true);
    try {
      const res = await api.get('/admin/ads');
      if (res.data?.success) setAdsList(res.data.ads || []);
    } catch { /* silent */ } finally { setAdsLoading(false); }
  };

  const handleSaveAd = async () => {
    if (!adFormData.title.trim()) return;
    setAdSaving(true);
    try {
      if (editingAd?._id) {
        await api.put(\`/admin/ads/\${editingAd._id}\`, adFormData);
      } else {
        await api.post('/admin/ads', adFormData);
      }
      setShowAdForm(false);
      setEditingAd(null);
      setAdFormData({ title: '', subtitle: '', tag: 'SPONSOR', slogan: '', perk: '', accentColor: '#FF7A00', bgColor: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)', icon: '🌾', imageUrl: '', linkUrl: '', isActive: true, order: 0 });
      await fetchAds();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save ad.');
    } finally { setAdSaving(false); }
  };

  const handleDeleteAd = async (id: string) => {
    if (!window.confirm('Delete this ad permanently?')) return;
    try {
      await api.delete(\`/admin/ads/\${id}\`);
      await fetchAds();
    } catch { alert('Failed to delete ad.'); }
  };

  const handleToggleAdActive = async (ad: AdItem) => {
    try {
      await api.put(\`/admin/ads/\${ad._id}\`, { ...ad, isActive: !ad.isActive });
      await fetchAds();
    } catch { alert('Failed to toggle ad.'); }
  };

  const openEditAd = (ad: AdItem) => {
    setEditingAd(ad);
    setAdFormData({ ...ad });
    setShowAdForm(true);
  };

  const openNewAd = () => {
    setEditingAd(null);
    setAdFormData({ title: '', subtitle: '', tag: 'SPONSOR', slogan: '', perk: '', accentColor: '#FF7A00', bgColor: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)', icon: '🌾', imageUrl: '', linkUrl: '', isActive: true, order: 0 });
    setShowAdForm(true);
  };`;

src = src.replace(FETCH_SYS_CONFIG_END, FETCH_ADS_INSERT);
console.log('✅ fetchAds + handleSaveAd + handleDeleteAd functions added');

// ── 5. Add 'ads' fetch in the tab-change effect ───────────────────────────
src = src.replace(
  `    else if (activeTab === 'settings') fetchSystemConfig();`,
  `    else if (activeTab === 'settings') fetchSystemConfig();
    else if (activeTab === 'ads') fetchAds();`
);
// Also in refresh handler
src = src.replace(
  `else if (activeTab === 'settings') fetchSystemConfig();`,
  `else if (activeTab === 'settings') fetchSystemConfig();
              else if (activeTab === 'ads') fetchAds();`
);
console.log('✅ ads tab fetch wired into tab-change effect');

// ── 6. Add Ads tab button in nav (before closing </nav>) ──────────────────
src = src.replace(
  `        <button
          className={\`admin-tab-btn \${activeTab === 'settings' ? 'active' : ''}\`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={18} /> Economy &amp; Config
        </button>
      </nav>`,
  `        <button
          className={\`admin-tab-btn \${activeTab === 'settings' ? 'active' : ''}\`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={18} /> Economy &amp; Config
        </button>

        <button
          className={\`admin-tab-btn \${activeTab === 'ads' ? 'active' : ''}\`}
          onClick={() => { setActiveTab('ads'); fetchAds(); }}
        >
          <Megaphone size={18} /> 📢 Ad Manager
        </button>
      </nav>`
);
console.log('✅ Ad Manager tab button added to nav');

// ── 7. Insert Ads tab content panel before the closing </div> of admin-content ─
// Find where settings tab ends and the page wrapper closes
const PAGE_CLOSE = `      {/* User Edit Modal */}`;

const ADS_PANEL = `      {/* ── AD MANAGER TAB ─────────────────────────────────────────── */}
      {activeTab === 'ads' && (
        <div className="admin-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h2 style={{ color: '#FFD700', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Megaphone size={22} /> Ad Manager
            </h2>
            <button onClick={openNewAd} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Plus size={16} /> New Ad
            </button>
          </div>

          {adsLoading ? (
            <div style={{ textAlign: 'center', color: '#aaa', padding: '2rem' }}>Loading ads…</div>
          ) : adsList.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#aaa', padding: '2rem', border: '2px dashed #333', borderRadius: '12px' }}>
              <Megaphone size={36} style={{ opacity: 0.3 }} />
              <p>No ads yet. Click <strong>+ New Ad</strong> to publish your first sponsor.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {adsList.map(ad => (
                <div key={ad._id} style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                  borderLeft: \`4px solid \${ad.accentColor || '#FF7A00'}\`,
                  borderRadius: '10px', padding: '0.9rem 1.1rem',
                  display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap'
                }}>
                  <span style={{ fontSize: '1.6rem' }}>{ad.icon || '🌾'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ background: ad.accentColor, color: '#000', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', letterSpacing: 1 }}>{ad.tag}</span>
                      <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>{ad.title}</span>
                    </div>
                    {ad.subtitle && <div style={{ color: '#aaa', fontSize: '0.8rem', marginTop: '2px' }}>{ad.subtitle}</div>}
                    {ad.perk && <div style={{ color: '#FFD700', fontSize: '0.78rem' }}>⚡ {ad.perk}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: ad.isActive ? '#00C853' : '#aaa' }}>
                      {ad.isActive ? '🟢 Active' : '🔴 Hidden'}
                    </span>
                    <button onClick={() => handleToggleAdActive(ad)} className="btn-action-sm" title="Toggle active">
                      {ad.isActive ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                    <button onClick={() => openEditAd(ad)} className="btn-action-sm approve" title="Edit ad">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => ad._id && handleDeleteAd(ad._id)} className="btn-action-sm reject" title="Delete ad">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Ad Create / Edit Modal */}
          {showAdForm && (
            <div className="modal-overlay" onClick={() => setShowAdForm(false)}>
              <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
                <h3 style={{ color: '#FFD700', marginTop: 0 }}>
                  {editingAd ? '✏️ Edit Ad' : '➕ New Ad'}
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group-admin" style={{ gridColumn: '1/-1' }}>
                    <label>Title *</label>
                    <input value={adFormData.title} onChange={e => setAdFormData(p => ({...p, title: e.target.value}))} placeholder="e.g. Crunchy Carrot Nitro Juice" />
                  </div>
                  <div className="form-group-admin" style={{ gridColumn: '1/-1' }}>
                    <label>Subtitle</label>
                    <input value={adFormData.subtitle} onChange={e => setAdFormData(p => ({...p, subtitle: e.target.value}))} placeholder="Short tagline" />
                  </div>
                  <div className="form-group-admin">
                    <label>Tag Label</label>
                    <input value={adFormData.tag} onChange={e => setAdFormData(p => ({...p, tag: e.target.value}))} placeholder="SPONSOR" />
                  </div>
                  <div className="form-group-admin">
                    <label>Icon Emoji</label>
                    <input value={adFormData.icon} onChange={e => setAdFormData(p => ({...p, icon: e.target.value}))} placeholder="🌾" />
                  </div>
                  <div className="form-group-admin" style={{ gridColumn: '1/-1' }}>
                    <label>Perk Text</label>
                    <input value={adFormData.perk} onChange={e => setAdFormData(p => ({...p, perk: e.target.value}))} placeholder="e.g. +50% Jump Power" />
                  </div>
                  <div className="form-group-admin" style={{ gridColumn: '1/-1' }}>
                    <label>Slogan</label>
                    <input value={adFormData.slogan} onChange={e => setAdFormData(p => ({...p, slogan: e.target.value}))} placeholder='"Your catchy quote here."' />
                  </div>
                  <div className="form-group-admin">
                    <label>Accent Color</label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input type="color" value={adFormData.accentColor} onChange={e => setAdFormData(p => ({...p, accentColor: e.target.value}))} style={{ width: 44, height: 36, padding: 2, cursor: 'pointer' }} />
                      <input value={adFormData.accentColor} onChange={e => setAdFormData(p => ({...p, accentColor: e.target.value}))} placeholder="#FF7A00" style={{ flex: 1 }} />
                    </div>
                  </div>
                  <div className="form-group-admin">
                    <label>Display Order</label>
                    <input type="number" value={adFormData.order} onChange={e => setAdFormData(p => ({...p, order: Number(e.target.value)}))} min={0} />
                  </div>
                  <div className="form-group-admin" style={{ gridColumn: '1/-1' }}>
                    <label>Background Gradient (CSS)</label>
                    <input value={adFormData.bgColor} onChange={e => setAdFormData(p => ({...p, bgColor: e.target.value}))} placeholder="linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)" />
                    <div style={{ marginTop: 6, height: 20, borderRadius: 6, background: adFormData.bgColor }} />
                  </div>
                  <div className="form-group-admin" style={{ gridColumn: '1/-1' }}>
                    <label><Image size={13} style={{ verticalAlign: 'middle' }} /> Banner Image URL (optional)</label>
                    <input value={adFormData.imageUrl} onChange={e => setAdFormData(p => ({...p, imageUrl: e.target.value}))} placeholder="https://..." />
                  </div>
                  <div className="form-group-admin" style={{ gridColumn: '1/-1' }}>
                    <label><Link size={13} style={{ verticalAlign: 'middle' }} /> Click-through URL (optional)</label>
                    <input value={adFormData.linkUrl} onChange={e => setAdFormData(p => ({...p, linkUrl: e.target.value}))} placeholder="https://..." />
                  </div>
                  <div className="form-group-admin" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" id="adIsActive" checked={adFormData.isActive} onChange={e => setAdFormData(p => ({...p, isActive: e.target.checked}))} style={{ width: 18, height: 18, accentColor: '#00C853' }} />
                    <label htmlFor="adIsActive" style={{ margin: 0, color: adFormData.isActive ? '#00C853' : '#aaa', fontWeight: 700 }}>
                      {adFormData.isActive ? '🟢 Active (shown in-game)' : '🔴 Hidden'}
                    </label>
                  </div>
                </div>

                {/* Preview */}
                <div style={{ marginTop: '1rem', padding: '0.75rem', background: adFormData.bgColor, borderRadius: 10, border: \`2px solid \${adFormData.accentColor}\` }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: adFormData.accentColor, letterSpacing: 2, marginBottom: 4 }}>{adFormData.tag || 'TAG'}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1a1a1a' }}>{adFormData.icon} {adFormData.title || 'Ad Title'}</div>
                  {adFormData.subtitle && <div style={{ fontSize: '0.8rem', color: '#333' }}>{adFormData.subtitle}</div>}
                  {adFormData.slogan && <div style={{ fontSize: '0.78rem', fontStyle: 'italic', color: '#555', marginTop: 4 }}>{adFormData.slogan}</div>}
                </div>

                <div className="admin-modal-actions" style={{ marginTop: '1.25rem' }}>
                  <button onClick={() => setShowAdForm(false)} className="btn-admin-refresh">Cancel</button>
                  <button onClick={handleSaveAd} disabled={adSaving || !adFormData.title.trim()} className="btn-primary">
                    {adSaving ? 'Saving…' : editingAd ? 'Update Ad' : 'Publish Ad'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* User Edit Modal */}`;

src = src.replace(PAGE_CLOSE, ADS_PANEL);
console.log('✅ Ad Manager tab content panel inserted');

fs.writeFileSync(file, src, 'utf8');
console.log('\n🎉 patchAdmin_ads.js complete!');

