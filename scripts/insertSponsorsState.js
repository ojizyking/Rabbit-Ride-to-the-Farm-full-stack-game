const fs = require('fs');
const playPath = 'client/src/pages/Play.tsx';
let playSrc = fs.readFileSync(playPath, 'utf8');

const targetLine = "const [reactions, setReactions] = useState<{ id: number; emoji: string; x: number }[]>([]);";
const insertion = `

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

if (playSrc.includes(targetLine)) {
  playSrc = playSrc.replace(targetLine, targetLine + insertion);
  fs.writeFileSync(playPath, playSrc, 'utf8');
  console.log('✅ Successfully inserted sponsors state into Play.tsx');
} else {
  console.error('❌ targetLine not found in Play.tsx');
}
