/**
 * Real-Time Telemetry & Online Presence Service
 * Lightweight, zero-dependency in-memory circular aggregator for hits, latency, and active sessions.
 */

class TelemetryService {
  constructor() {
    this.startTime = Date.now();
    this.totalHits = 0;
    this.hitsToday = 0;
    this.todayDateStr = new Date().toISOString().slice(0, 10);

    // Status code buckets
    this.statusCodes = {
      '2xx': 0,
      '3xx': 0,
      '4xx': 0,
      '5xx': 0
    };

    // Route popularity: path -> count
    this.routeHits = new Map();

    // Response time latency tracker (ms)
    this.recentLatencies = [];
    this.MAX_LATENCY_SAMPLES = 200;

    // Recent requests circular log (last 60 requests)
    this.recentRequests = [];
    this.MAX_RECENT_REQUESTS = 60;

    // Hourly buckets for the last 24 hours
    this.hourlyHits = Array(24).fill(0);
    this.currentHour = new Date().getHours();

    // Online sessions map: key -> { id, userId, email, role, activity, lastSeen, ip, userAgent }
    this.activeSessions = new Map();
    this.SESSION_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes inactivity threshold

    // Periodically clean up stale sessions and update daily reset
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  cleanup() {
    const now = Date.now();
    // Daily reset check
    const currentToday = new Date().toISOString().slice(0, 10);
    if (currentToday !== this.todayDateStr) {
      this.todayDateStr = currentToday;
      this.hitsToday = 0;
      this.hourlyHits = Array(24).fill(0);
    }

    // Clean expired sessions
    for (const [key, session] of this.activeSessions.entries()) {
      if (now - session.lastSeen > this.SESSION_TIMEOUT_MS) {
        this.activeSessions.delete(key);
      }
    }
  }

  recordHit(req, res, durationMs) {
    this.totalHits++;
    this.hitsToday++;

    // Hourly tracking
    const hour = new Date().getHours();
    this.hourlyHits[hour] = (this.hourlyHits[hour] || 0) + 1;

    // Status code bucket
    const status = res.statusCode || 200;
    if (status >= 200 && status < 300) this.statusCodes['2xx']++;
    else if (status >= 300 && status < 400) this.statusCodes['3xx']++;
    else if (status >= 400 && status < 500) this.statusCodes['4xx']++;
    else if (status >= 500) this.statusCodes['5xx']++;

    // Route breakdown (normalize parameters to keep keys compact)
    const rawPath = req.baseUrl ? `${req.baseUrl}${req.path}` : req.path || req.url;
    const cleanPath = rawPath.split('?')[0].replace(/\/[0-9a-fA-F]{24}/g, '/:id');
    this.routeHits.set(cleanPath, (this.routeHits.get(cleanPath) || 0) + 1);

    // Latency
    this.recentLatencies.push(durationMs);
    if (this.recentLatencies.length > this.MAX_LATENCY_SAMPLES) {
      this.recentLatencies.shift();
    }

    // Recent requests log
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || req.connection?.remoteAddress || '127.0.0.1';
    this.recentRequests.unshift({
      id: `req_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      method: req.method,
      url: cleanPath,
      status,
      durationMs: Math.round(durationMs),
      ip: clientIp.replace('::ffff:', ''),
      userId: req.user ? (req.user._id || req.user.id) : null,
      userEmail: req.user ? req.user.email : null
    });

    if (this.recentRequests.length > this.MAX_RECENT_REQUESTS) {
      this.recentRequests.pop();
    }

    // If user is authenticated, update presence
    if (req.user) {
      this.recordHeartbeat({
        userId: req.user._id || req.user.id,
        email: req.user.email,
        role: req.user.role || 'user',
        activity: cleanPath.includes('/game') ? 'riding' : 'browsing',
        ip: clientIp
      });
    }
  }

  recordHeartbeat({ userId, email, role = 'user', activity = 'active', ip = '127.0.0.1' }) {
    const key = userId ? `usr_${userId}` : `ip_${ip}`;
    this.activeSessions.set(key, {
      id: key,
      userId: userId || null,
      email: email || 'Guest Rider',
      role,
      activity,
      lastSeen: Date.now(),
      ip: ip.replace('::ffff:', '')
    });
  }

  getOnlineStats() {
    const now = Date.now();
    let authenticatedCount = 0;
    let guestCount = 0;
    let inGameCount = 0;
    const usersList = [];

    for (const session of this.activeSessions.values()) {
      if (now - session.lastSeen <= this.SESSION_TIMEOUT_MS) {
        if (session.userId) {
          authenticatedCount++;
        } else {
          guestCount++;
        }
        if (session.activity === 'riding' || session.activity === 'in-game') {
          inGameCount++;
        }
        usersList.push({
          id: session.id,
          userId: session.userId,
          email: session.email,
          role: session.role,
          activity: session.activity,
          lastSeenAgoSec: Math.round((now - session.lastSeen) / 1000),
          ip: session.ip
        });
      }
    }

    usersList.sort((a, b) => a.lastSeenAgoSec - b.lastSeenAgoSec);

    return {
      totalOnline: authenticatedCount + guestCount,
      authenticatedCount,
      guestCount,
      inGameCount,
      activeUsers: usersList.slice(0, 30)
    };
  }

  getLiveTelemetry() {
    const online = this.getOnlineStats();

    // Calculate latency metrics
    const latencies = this.recentLatencies;
    const avgLatency = latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 12;
    const p95Latency = latencies.length > 0
      ? Math.round([...latencies].sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)] || avgLatency)
      : 25;

    // Top 8 popular endpoints
    const topRoutes = Array.from(this.routeHits.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([path, count]) => ({ path, count }));

    // Memory & Uptime
    const mem = process.memoryUsage();
    const uptimeSec = Math.round((Date.now() - this.startTime) / 1000);

    return {
      totalHits: this.totalHits,
      hitsToday: this.hitsToday,
      requestsPerMin: Math.round((this.hitsToday / Math.max(1, (uptimeSec / 60))) * 10) / 10,
      statusCodes: this.statusCodes,
      avgLatencyMs: avgLatency,
      p95LatencyMs: p95Latency,
      topRoutes,
      recentRequests: this.recentRequests.slice(0, 30),
      hourlyHits: this.hourlyHits,
      online,
      system: {
        uptimeSeconds: uptimeSec,
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024 * 10) / 10,
        heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024 * 10) / 10,
        rssMb: Math.round(mem.rss / 1024 / 1024 * 10) / 10,
        nodeVersion: process.version
      }
    };
  }
}

const telemetry = new TelemetryService();
module.exports = telemetry;
