const https = require('https');

function get(url, opts) {
  return new Promise((resolve, reject) => {
    const options = { headers: { 'User-Agent': 'node', ...(opts && opts.headers) } };
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    }).on('error', reject);
  });
}

function post(url, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      path: u.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function run() {
  const VERCEL = 'https://dist-kappa-livid-68.vercel.app';
  const ts = Date.now();

  console.log('=== 1. SW version on live Vercel ===');
  const sw = await get(VERCEL + '/sw.js', { headers: { 'Cache-Control': 'no-cache' } });
  const ver = sw.body.match(/rabbit-farm-pwa-v\d+/);
  console.log('SW version:', ver ? ver[0] : 'NOT FOUND');
  console.log('Cross-origin bypass:', sw.body.includes('url.origin !== self.location.origin') ? 'YES (kill-switch applied)' : 'NO - MISSING');

  console.log('\n=== 2. POST register via Vercel proxy ===');
  const reg = await post(VERCEL + '/api/auth/register', { email: 'e2e_' + ts + '@test.com', password: 'Password123!' });
  const rj = JSON.parse(reg.body);
  console.log('Status:', reg.status, rj.success ? 'OK - ' + rj.user.email : JSON.stringify(rj).slice(0, 100));

  console.log('\n=== 3. POST login via Vercel proxy ===');
  const log = await post(VERCEL + '/api/auth/login', { email: 'e2e_' + ts + '@test.com', password: 'Password123!' });
  const lj = JSON.parse(log.body);
  console.log('Status:', log.status, lj.success ? 'OK - token present: ' + !!lj.token : JSON.stringify(lj).slice(0, 100));

  console.log('\n=== 4. Bundle vercel.app routing ===');
  const bundle = await get(VERCEL + '/assets/index-B2_jDuhU.js');
  console.log('vercel.app in bundle:', bundle.body.includes('vercel.app') ? 'YES' : 'NO');
  const idx = bundle.body.indexOf('vercel.app');
  if (idx !== -1) console.log('Context:', bundle.body.slice(idx - 40, idx + 80));
}

run().catch(console.error);

