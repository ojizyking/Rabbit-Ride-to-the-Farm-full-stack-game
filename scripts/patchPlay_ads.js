/**
 * patchPlay_ads.js — Task 3B
 * 1. Add skipAvailable state + set it at 25s
 * 2. Fetch /api/ads/active on mount, replace hardcoded SPONSORS
 * 3. Add Skip Ad button to billboard modal (shows after 5s, no coin reward)
 */
const fs = require('fs');
const file = 'client/src/pages/Play.tsx';
let src = fs.readFileSync(file, 'utf8');

// ── 1. Add sponsors state (dynamic) + fetch on mount ──────────────────────
const SPONSORS_CONST = `const SPONSORS: SponsorInfo[] = [`;
const SPONSORS_STATE_INSERT = `// Dynamic sponsors state — fetched from /api/ads/active, falls back to hardcoded
// (declaration below is the hardcoded fallback)
`;

// Add useState for sponsors + fetch after jukeboxEnabled effect
const JUKEBOX_EFFECT_ANCHOR = `  }, []);

  // Listen to live stats from Phaser scene`;

const SPONSORS_FETCH = `  // Dynamic ads from admin
  const [sponsors, setSponsors] = useState<SponsorInfo[]>(SPONSORS);
  useEffect(() => {
    api.get('/ads/active').then(res => {
      if (res.data?.ads?.length) {
        setSponsors(res.data.ads.map((a: any) => ({
          tag:         a.tag         || 'SPONSOR',
          title:       a.title       || '',
          subtitle:    a.subtitle    || '',
          perk:        a.perk        || '',
          accentColor: a.accentColor || '#FF7A00',
          bgColor:     a.bgColor     || 'linear-gradient(135deg,#FFF3E0,#FFE0B2)',
          icon:        a.icon        || '🌾',
          slogan:      a.slogan      || ''
        })));
      }
    }).catch(() => {}); // fail silently — keep hardcoded fallback
  }, []);

  // Listen to live stats from Phaser scene`;

if (!src.includes('Dynamic ads from admin')) {
  src = src.replace(JUKEBOX_EFFECT_ANCHOR, SPONSORS_FETCH);
  console.log('✅ Dynamic sponsors fetch added to Play.tsx');
} else {
  console.log('ℹ️  sponsors fetch already in Play.tsx');
}

// ── 2. Add skipAvailable state ───────────────────────────────────────────
const SKIP_ANCHOR = `  const [isBillboardOpen, setIsBillboardOpen] = useState(false);`;
const SKIP_STATE  = `  const [isBillboardOpen, setIsBillboardOpen] = useState(false);
  const [skipAvailable, setSkipAvailable] = useState(false);`;

if (!src.includes('skipAvailable')) {
  src = src.replace(SKIP_ANCHOR, SKIP_STATE);
  console.log('✅ skipAvailable state added to Play.tsx');
}

// ── 3. Reset skipAvailable when ad opens ─────────────────────────────────
const AD_OPEN_ANCHOR = `      setIsBillboardOpen(true);
      setBillboardCountdown(30);
      setIsBillboardComplete(false);
      setSponsorIdx(0);
      setReactions([]);
      bgm.pause(); // Pause BGM during sponsor ad!`;

const AD_OPEN_NEW = `      setIsBillboardOpen(true);
      setBillboardCountdown(30);
      setIsBillboardComplete(false);
      setSkipAvailable(false);
      setSponsorIdx(0);
      setReactions([]);
      bgm.pause(); // Pause BGM during sponsor ad!`;

src = src.replace(AD_OPEN_ANCHOR, AD_OPEN_NEW);

// ── 4. Set skipAvailable=true when countdown reaches 25 (5s elapsed) ─────
const COUNTDOWN_CYCLE = `          // Cycle sponsor every 7.5 seconds
          const slide = Math.floor((30 - next) / 7.5) % SPONSORS.length;
          setSponsorIdx(slide);`;

const COUNTDOWN_CYCLE_NEW = `          // Cycle sponsor every 7.5 seconds
          const slide = Math.floor((30 - next) / 7.5) % sponsors.length;
          setSponsorIdx(slide);
          // Enable skip after 5 seconds
          if (next <= 25) setSkipAvailable(true);`;

src = src.replace(COUNTDOWN_CYCLE, COUNTDOWN_CYCLE_NEW);
console.log('✅ Skip timer (5s) wired into countdown');

// ── 5. Add handleSkipAd function ─────────────────────────────────────────
const TRIGGER_BILLBOARD = `  const handleTriggerBillboard = () => {`;
const SKIP_HANDLER = `  const handleSkipAd = () => {
    setIsBillboardOpen(false);
    setSkipAvailable(false);
    setBillboardCountdown(30);
    setIsBillboardComplete(false);
    bgm.resume();
  };

  const handleTriggerBillboard = () => {`;

if (!src.includes('handleSkipAd')) {
  src = src.replace(TRIGGER_BILLBOARD, SKIP_HANDLER);
  console.log('✅ handleSkipAd function added to Play.tsx');
}

// ── 6. Replace hardcoded SPONSORS[sponsorIdx] with sponsors[sponsorIdx] ──
// The sponsor card rendering uses SPONSORS[sponsorIdx]
src = src.replace(/SPONSORS\[sponsorIdx\]/g, 'sponsors[sponsorIdx]');
// Guard against out-of-bounds if sponsors array is shorter
src = src.replace(
  `sponsors[sponsorIdx]`,
  `sponsors[sponsorIdx % Math.max(sponsors.length, 1)]`
);
console.log('✅ SPONSORS[] → sponsors[] (dynamic) in billboard render');

// ── 7. Add Skip button to billboard modal — after billboard-countdown-row ─
// Insert before the reward pitch div
const REWARD_PITCH_ANCHOR = `              <div className="billboard-reward-pitch">`;
const SKIP_BTN_INSERT = `              {/* Skip Ad button — appears after 5s */}
              {skipAvailable && !isBillboardComplete && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.4rem' }}>
                  <button
                    onClick={handleSkipAd}
                    className="billboard-skip-btn"
                    title="Skip ad (no coin reward)"
                  >
                    Skip Ad ⏭
                  </button>
                </div>
              )}

              <div className="billboard-reward-pitch">`;

if (!src.includes('billboard-skip-btn')) {
  src = src.replace(REWARD_PITCH_ANCHOR, SKIP_BTN_INSERT);
  console.log('✅ Skip Ad button injected into billboard modal');
} else {
  console.log('ℹ️  Skip button already in billboard modal');
}

fs.writeFileSync(file, src, 'utf8');
console.log('\n🎉 patchPlay_ads.js complete!');

