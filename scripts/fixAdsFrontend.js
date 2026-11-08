const fs = require('fs');

// 1. Fix Play.tsx
{
  const playPath = 'client/src/pages/Play.tsx';
  let playSrc = fs.readFileSync(playPath, 'utf8');

  // Insert sponsors state if not present
  if (!playSrc.includes('const [sponsors, setSponsors]')) {
    const target = `  // 30-Second Billboard Ad State
  const [isBillboardOpen, setIsBillboardOpen] = useState(false);
  const [skipAvailable, setSkipAvailable] = useState(false);
  const [billboardCountdown, setBillboardCountdown] = useState(30);
  const [isBillboardComplete, setIsBillboardComplete] = useState(false);
  const [sponsorIdx, setSponsorIdx] = useState(0);
  const [reactions, setReactions] = useState<{ id: number; emoji: string; x: number }[]>([]);`;

    const replacement = `  // 30-Second Billboard Ad State
  const [isBillboardOpen, setIsBillboardOpen] = useState(false);
  const [skipAvailable, setSkipAvailable] = useState(false);
  const [billboardCountdown, setBillboardCountdown] = useState(30);
  const [isBillboardComplete, setIsBillboardComplete] = useState(false);
  const [sponsorIdx, setSponsorIdx] = useState(0);
  const [reactions, setReactions] = useState<{ id: number; emoji: string; x: number }[]>([]);

  // Dynamic ads fetched from admin (/api/ads/active)
  const [sponsors, setSponsors] = useState<SponsorInfo[]>(SPONSORS);
  useEffect(() => {
    api.get('/ads/active').then(res => {
      if (res.data?.ads && Array.isArray(res.data.ads) && res.data.ads.length > 0) {
        setSponsors(res.data.ads.map((a: any) => ({
          tag:         a.tag         || 'SPONSOR',
          title:       a.title       || '',
          subtitle:    a.subtitle    || '',
          perk:        a.perk        || '',
          accentColor: a.accentColor || '#FF7A00',
          bgColor:     a.bgColor     || 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)',
          icon:        a.icon        || '🌾',
          slogan:      a.slogan      || ''
        })));
      }
    }).catch(() => {});
  }, []);`;

    if (playSrc.includes(target)) {
      playSrc = playSrc.replace(target, replacement);
      console.log('✅ Added sponsors state & useEffect to Play.tsx');
    } else {
      console.warn('⚠️ Target for sponsors state not found in Play.tsx');
    }
  }

  // Update countdown logic in Play.tsx
  const countdownTarget = `          const next = prev - 1;
          sounds.playTick();
          // Cycle sponsor every 7.5 seconds
          const slide = Math.floor((30 - next) / 7.5) % SPONSORS.length;
          setSponsorIdx(slide);
          return next;`;
  const countdownRepl = `          const next = prev - 1;
          sounds.playTick();
          if (next <= 25) setSkipAvailable(true);
          // Cycle sponsor every 7.5 seconds
          const slide = Math.floor((30 - next) / 7.5) % Math.max(sponsors.length, 1);
          setSponsorIdx(slide);
          return next;`;
  if (playSrc.includes(countdownTarget)) {
    playSrc = playSrc.replace(countdownTarget, countdownRepl);
    console.log('✅ Updated countdown timer logic in Play.tsx');
  }

  // Update sponsor card rendering in Play.tsx
  const cardStart = `{/* Dynamic Animated Sponsor Spotlight */}`;
  const cardEnd = `{/* Interactive Reaction Cheers */}`;
  const idxStart = playSrc.indexOf(cardStart);
  const idxEnd = playSrc.indexOf(cardEnd);
  if (idxStart !== -1 && idxEnd !== -1) {
    const newCardBlock = `{/* Dynamic Animated Sponsor Spotlight */}
              {(() => {
                const currentSponsor = sponsors[sponsorIdx % Math.max(sponsors.length, 1)] || SPONSORS[0];
                return (
                  <div
                    className="billboard-sponsor-card"
                    style={{
                      background: currentSponsor.bgColor,
                      borderColor: currentSponsor.accentColor
                    }}
                  >
                    <div className="sponsor-card-top">
                      <span
                        className="sponsor-tag"
                        style={{ background: currentSponsor.accentColor }}
                      >
                        {currentSponsor.tag}
                      </span>
                      <span className="sponsor-slide-counter">
                        Commercial {(sponsorIdx % Math.max(sponsors.length, 1)) + 1} of {Math.max(sponsors.length, 1)}
                      </span>
                    </div>

                    <div className="sponsor-card-body">
                      <div className="sponsor-icon-animated">{currentSponsor.icon}</div>
                      <div className="sponsor-copy">
                        <h4 className="sponsor-title">{currentSponsor.title}</h4>
                        <p className="sponsor-desc">{currentSponsor.subtitle}</p>
                        <div className="sponsor-perk-pill">
                          <CheckCircle2 size={16} color={currentSponsor.accentColor} />
                          <span>{currentSponsor.perk}</span>
                        </div>
                      </div>
                    </div>

                    <div className="sponsor-slogan-bar">
                      <em>{currentSponsor.slogan}</em>
                    </div>
                  </div>
                );
              })()}

              `;
    playSrc = playSrc.slice(0, idxStart) + newCardBlock + playSrc.slice(idxEnd);
    console.log('✅ Updated sponsor spotlight JSX in Play.tsx');
  }

  fs.writeFileSync(playPath, playSrc, 'utf8');
}

// 2. Fix Admin.tsx
{
  const adminPath = 'client/src/pages/Admin.tsx';
  let adminSrc = fs.readFileSync(adminPath, 'utf8');

  // Add fetchAds and handlers after fetchSystemConfig
  const sysConfigBlock = `  // Fetch System Config
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
  }, []);`;

  const adsFuncs = `  // Fetch System Config
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

  // Fetch Ads
  const fetchAds = useCallback(async (isBg = false) => {
    try {
      if (!isBg) setAdsLoading(true);
      const res = await api.get('/admin/ads');
      if (res.data?.success) {
        setAdsList(res.data.ads || []);
      }
    } catch (err) {
      console.error('Error fetching ads:', err);
    } finally {
      if (!isBg) setAdsLoading(false);
    }
  }, []);

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
      setAdFormData({
        title: '', subtitle: '', tag: 'SPONSOR', slogan: '', perk: '',
        accentColor: '#FF7A00', bgColor: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)',
        icon: '🌾', imageUrl: '', linkUrl: '', isActive: true, order: 0
      });
      await fetchAds();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save ad.');
    } finally {
      setAdSaving(false);
    }
  };

  const handleDeleteAd = async (id: string) => {
    if (!window.confirm('Delete this ad permanently?')) return;
    try {
      await api.delete(\`/admin/ads/\${id}\`);
      await fetchAds();
    } catch {
      alert('Failed to delete ad.');
    }
  };

  const handleToggleAdActive = async (ad: AdItem) => {
    try {
      await api.put(\`/admin/ads/\${ad._id}\`, { ...ad, isActive: !ad.isActive });
      await fetchAds();
    } catch {
      alert('Failed to toggle ad.');
    }
  };

  const openEditAd = (ad: AdItem) => {
    setEditingAd(ad);
    setAdFormData({ ...ad });
    setShowAdForm(true);
  };

  const openNewAd = () => {
    setEditingAd(null);
    setAdFormData({
      title: '', subtitle: '', tag: 'SPONSOR', slogan: '', perk: '',
      accentColor: '#FF7A00', bgColor: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)',
      icon: '🌾', imageUrl: '', linkUrl: '', isActive: true, order: 0
    });
    setShowAdForm(true);
  };`;

  if (!adminSrc.includes('const fetchAds = useCallback')) {
    if (adminSrc.includes(sysConfigBlock)) {
      adminSrc = adminSrc.replace(sysConfigBlock, adsFuncs);
      console.log('✅ Added fetchAds and ad handler methods to Admin.tsx');
    } else {
      console.warn('⚠️ sysConfigBlock not found in Admin.tsx');
    }
  }

  // Update forceSyncAll
  const forceSyncOld = `        fetchGameStats(true),
        fetchReferrals(true),
        fetchSystemConfig(true)
      ]);`;
  const forceSyncNew = `        fetchGameStats(true),
        fetchReferrals(true),
        fetchSystemConfig(true),
        fetchAds(true)
      ]);`;
  if (adminSrc.includes(forceSyncOld)) {
    adminSrc = adminSrc.replace(forceSyncOld, forceSyncNew);
    adminSrc = adminSrc.replace(
      `[fetchOverviewAndTelemetry, fetchUsers, fetchWithdrawals, fetchGameStats, fetchReferrals, fetchSystemConfig]`,
      `[fetchOverviewAndTelemetry, fetchUsers, fetchWithdrawals, fetchGameStats, fetchReferrals, fetchSystemConfig, fetchAds]`
    );
    console.log('✅ Added fetchAds to forceSyncAll in Admin.tsx');
  }

  // Fix duplicate fetchAds in polling useEffect
  const pollOld = `    else if (activeTab === 'settings') fetchSystemConfig();
              else if (activeTab === 'ads') fetchAds();
    else if (activeTab === 'ads') fetchAds();`;
  const pollNew = `    else if (activeTab === 'settings') fetchSystemConfig();
    else if (activeTab === 'ads') fetchAds();`;
  if (adminSrc.includes(pollOld)) {
    adminSrc = adminSrc.replace(pollOld, pollNew);
    console.log('✅ Fixed duplicate fetchAds in Admin.tsx');
  }

  // Add fetchAds(true) to polling interval
  const pollIntervalOld = `      else if (activeTab === 'game') fetchGameStats(true);
      else if (activeTab === 'referrals') fetchReferrals(true);`;
  const pollIntervalNew = `      else if (activeTab === 'game') fetchGameStats(true);
      else if (activeTab === 'referrals') fetchReferrals(true);
      else if (activeTab === 'ads') fetchAds(true);`;
  if (adminSrc.includes(pollIntervalOld) && !adminSrc.includes("activeTab === 'ads') fetchAds(true)")) {
    adminSrc = adminSrc.replace(pollIntervalOld, pollIntervalNew);
    console.log('✅ Added fetchAds(true) to polling interval in Admin.tsx');
  }

  // Update tab refresh button
  const refreshOld = `              else if (activeTab === 'referrals') fetchReferrals();
              else if (activeTab === 'settings') fetchSystemConfig();
            }}`;
  const refreshNew = `              else if (activeTab === 'referrals') fetchReferrals();
              else if (activeTab === 'settings') fetchSystemConfig();
              else if (activeTab === 'ads') fetchAds();
            }}`;
  if (adminSrc.includes(refreshOld)) {
    adminSrc = adminSrc.replace(refreshOld, refreshNew);
    console.log('✅ Added fetchAds to refresh button in Admin.tsx');
  }

  // Insert ADS_PANEL if not already present
  if (!adminSrc.includes('activeTab === \'ads\' && (')) {
    const modalMarker = `{/* ─── MODAL: EDIT USER ACCOUNT ──────────────────────────────────────── */}`;
    const adsPanelJSX = `{/* ── AD MANAGER TAB ─────────────────────────────────────────── */}
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

      `;

    if (adminSrc.includes(modalMarker)) {
      adminSrc = adminSrc.replace(modalMarker, adsPanelJSX + modalMarker);
      console.log('✅ Added Ad Manager tab JSX to Admin.tsx');
    } else {
      console.warn('⚠️ modalMarker not found in Admin.tsx');
    }
  }

  fs.writeFileSync(adminPath, adminSrc, 'utf8');
}

console.log('All frontend ad fixes applied!');
