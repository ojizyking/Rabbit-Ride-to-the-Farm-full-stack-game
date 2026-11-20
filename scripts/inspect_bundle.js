const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'node' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function run() {
  const VERCEL = 'https://dist-kappa-livid-68.vercel.app';
  const r = await fetchUrl(VERCEL + '/assets/index-Be4CwtYG.js');
  const js = r.body;

  // Extract the full getApiBaseUrl function context
  const idx = js.indexOf('railway.app');
  const snippet = js.slice(idx - 150, idx + 400);
  console.log('=== Baked getApiBaseUrl logic ===');
  console.log(snippet);

  console.log('\n=== Actual API base URL logic (simplified) ===');
  // The key: what does it return when hostname is dist-kappa-livid-68.vercel.app ?
  // Simulate it:
  const hostname = 'dist-kappa-livid-68.vercel.app';
  const usesRelative = hostname.endsWith('railway.app') || hostname.endsWith('onrender.com') || hostname === 'localhost' || hostname === '127.0.0.1';
  console.log('Hostname:', hostname);
  console.log('Uses relative /api?', usesRelative);
  
  // Check if VITE_API_URL is baked in (it won't be - Vite replaces it at build time, empty string if unset)
  const viteApiMatch = js.match(/import\.meta\.env\.VITE_API_URL/g);
  console.log('VITE_API_URL still in bundle (unreplaced)?', viteApiMatch ? 'YES - NOT REPLACED' : 'NO - replaced at build time');
  
  // Find what the fallback resolves to
  const fallbackIdx = js.indexOf('https://rabbit-ride-backend.onrender.com/api');
  console.log('Render fallback URL in bundle:', fallbackIdx !== -1 ? 'YES - present' : 'NO - missing');
  
  if (fallbackIdx !== -1) {
    console.log('Context:', js.slice(fallbackIdx - 30, fallbackIdx + 60));
  }
}
run().catch(console.error);
