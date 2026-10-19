# 🐇 Rabbit Ride to the Farm - Fullstack Play-to-Earn Web Game

A full-stack play-to-earn web game where players ride their bicycle through the farm, collect carrot tokens and mystery crates, upgrade rabbits and bikes, and withdraw earnings via Paystack.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, TypeScript, Phaser 3.80, Vanilla CSS (NO Tailwind), Lucide React, React Router 7
- **Backend**: Node.js, Express, MongoDB (Mongoose + Auto Memory Fallback), JWT Auth, Paystack API, Axios
- **Design System**: Vanilla CSS `:root { --green:#2D8A4E; --yellow:#FFC93C; --orange:#FF7A00; --bg:#E8F5E9; }`, Fredoka font, 16px rounded cards, mobile-first responsive layout.

---

## 📁 Monorepo Structure

```text
rabbit-farm/
├── client/ (Vite + React 19)
│   ├── src/
│   │   ├── components/
│   │   │   ├── game/PhaserGame.tsx
│   │   │   ├── Navbar.tsx
│   │   │   └── AuthModal.tsx
│   │   ├── context/AuthContext.tsx
│   │   ├── game/
│   │   │   ├── scenes/ Preload.ts, FarmRide.ts, GameOver.ts
│   │   │   └── audio.ts (Web Audio synthesizer)
│   │   ├── lib/api.ts (Axios to http://localhost:5000/api)
│   │   ├── pages/ Landing.tsx, Play.tsx, Shop.tsx, Wallet.tsx
│   │   ├── styles/ index.css, landing.css, game.css, shop.css
│   │   └── App.tsx, main.tsx
│   └── vite.config.ts
│
└── server/ (Node.js + Express)
    ├── src/
    │   ├── config/ db.js, paystack.js, memoryStore.js
    │   ├── controllers/ authController.js, gameController.js, shopController.js, walletController.js
    │   ├── middleware/ auth.js (JWT)
    │   ├── models/ User.js, Rabbit.js, Bicycle.js, Ride.js, Transaction.js, Subscription.js, Withdrawal.js, modelAdapter.js
    │   ├── routes/ auth.js, game.js, shop.js, wallet.js, admin.js
    │   └── server.js
    └── .env
```

---

## 🚀 Quick Start Instructions

### 1. Start Backend Server (Port 5000)
```bash
cd server
npm install
npm run dev
```
*Note: Connects to local MongoDB (`mongodb://localhost:27017/rabbit_farm`) or automatically initializes an embedded persistent JSON store with pre-seeded shop items.*

### 2. Start Frontend Client (Port 5173)
```bash
cd client 
npm install
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 🎮 Game Controls & Mechanics

- **Jump**: `Space`, `W`, `Up Arrow`, or `Tap Screen` (Supports double jump)
- **360° Stunt Flips**: `A` / `D` or `Left` / `Right Arrow` or the on-screen **360° FLIP** button while in the air to execute full 360° (or 720°) flips for **+50 ₦ bonus** and instant nitro boost recharge!
- **360° Stunt Loop-de-Loops**: Ride through giant circular 360° loops on the farm track with inverted centrifugal physics and dynamic camera tilt for **+100 ₦ bonus**!
- **Stunt Launch Ramps**: Hit high-speed wooden ramps to launch high into the sky for massive airtime and 360° stunts.
- **Nitro Boost**: `Shift` or click the on-screen **BOOST** button with `Zap` icon
- **Collectibles**:
  - ⭐ **Star**: 5 coins
  - 🥕 **Carrot**: 10 coins
  - 🎁 **Mystery Crate**: 50–200 coins + particle explosion effect
  - ⚡ **360° Loop Stunt**: 100 coins + boost refill
  - ★ **360° Air Flip**: 50 coins + 50% boost recharge
  - 📺 **Animated Roadside Billboard Ads**: Procedural animated billboards with flashing marquee chase lights appear on the farm track. Riding into or clicking the **30s AD** button triggers a full-screen **30-Second Animated Billboard Cinema** featuring:
    - 30-second animated radial SVG & linear countdown timer with metronome tick sounds
    - Dynamic rotating commercial reel (Carrot Nitro Juice, Paystack Instant Payouts, Turbo Bikes, Lucky Harvest)
    - Interactive cheering reaction buttons (🥕 Crunch, ⚡ Nitro, ₦ Cash, 🐰 Bunny, ⭐ Star)
    - Celebratory fanfare audio and instant reward (+100 Coins = ₦10 Naira) upon countdown completion
    - Smooth ride resume with a bonus speed burst!
- **Background optimistic updates**: Dispatches custom event `game:collect` to sync with `/api/game/collect` without dropping 60fps frame rates.

---

## 🪙 Token Economics & Conversion Rate

- **Conversion Rule**: **Every 1,000 Coins = ₦100 (10 Coins = ₦1.00)**
- Coins collected during the ride are converted to Naira and added directly to your wallet balance at the end of each ride.
- **Subscription Multipliers applied to conversion**:
  - **Free**: 1.0x (1,000 Coins = ₦100)
  - **Basic (+5%)**: 1.05x (1,000 Coins = ₦105)
  - **Growth (+10%)**: 1.10x (1,000 Coins = ₦110)
  - **Pro (+25%)**: 1.25x (1,000 Coins = ₦125)
  - **Elite (+50%)**: 1.50x (1,000 Coins = ₦150)

---

## 💳 Subscriptions & Paystack Tiers

| Tier | Price | Perks |
| :--- | :--- | :--- |
| **Starter Pack (Basic)** | ₦1,000 | +5% reward boost, 50 tokens/ride, Unlimited daily rides |
| **Growth Pack (Popular)** | ₦2,000 | +10% reward boost, 120 tokens/ride, Weekly crate, Unlimited daily rides |
| **Pro Pack** | ₦5,000 | +25% reward boost, 300 tokens/ride, Premium rewards & NFTs |
| **Elite Pack** | ₦10,000 | +50% reward boost, 600 tokens/ride, VIP airdrops & instant zero-fee cashouts |

---

## 🏦 Bank Cashout / Withdrawals

- **Minimum Withdrawal**: ₦1,000
- **Supported Banks**: GTBank, Zenith, Access, UBA, FirstBank, Kuda, OPay, PalmPay, Stanbic IBTC, Fidelity.
- **Paystack Transfer**: Automated bank transfer via `https://api.paystack.co/transfer`.

---

## 🚀 Production Deployment Guide

### Architecture
```
Vercel (Frontend CDN)  →  Railway (Node.js API)  →  MongoDB Atlas (DB)
       React + Phaser         Express + JWT             Free M0 Cluster
```

---

### Step 1 — Set up MongoDB Atlas (Free)
1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → Create free account
2. Create a **Shared M0** cluster (512 MB, free forever)
3. **Database Access** → Add user with `readWriteAnyDatabase` role → Save username & password
4. **Network Access** → Add IP `0.0.0.0/0` (allow all — Railway IPs are dynamic)
5. **Connect** → **Drivers** → Copy connection string:
   ```
   mongodb+srv://<user>:<password>@<cluster>.mongodb.net/rabbit_farm?retryWrites=true&w=majority
   ```

---

### Step 2 — Deploy Backend on Railway
1. Go to [railway.app](https://railway.app) → Create project
2. **New Service** → **GitHub Repo** → Select your repo → **Root Directory**: `server`
3. Railway auto-detects Node.js and uses `npm start` (from `Procfile`)
4. Go to **Variables** tab and add:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `5000` |
| `MONGO_URI` | Your Atlas connection string |
| `JWT_SECRET` | A 64+ char random secret |
| `PAYSTACK_SECRET_KEY` | `sk_live_...` from Paystack dashboard |
| `FRONTEND_URL` | *(set after Vercel deploy)* |

5. Click **Deploy** → Copy your Railway URL: `https://rabbit-farm-xxx.up.railway.app`

---

### Step 3 — Deploy Frontend on Vercel
1. Go to [vercel.com](https://vercel.com) → New Project → Import GitHub repo
2. **Root Directory**: `client`
3. **Framework Preset**: Vite (auto-detected)
4. **Environment Variables** → Add:

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://rabbit-farm-xxx.up.railway.app/api` |

5. Click **Deploy** → Copy your Vercel URL: `https://rabbit-ride.vercel.app`

---

### Step 4 — Wire Up CORS
Back in Railway **Variables**, update:
```
FRONTEND_URL=https://rabbit-ride.vercel.app
```
Then **Redeploy** the Railway service.

---

### Post-Deployment Checklist
- [ ] `GET https://your-railway-url.up.railway.app/api/health` returns `{"status":"online"}`
- [ ] Frontend loads at your Vercel URL
- [ ] Registration + Login work
- [ ] Game starts and coins register
- [ ] Paystack subscription test payment succeeds (`sk_test_...`)
- [ ] Wallet withdrawal shows pending in Paystack dashboard

---

### File Structure of Deployment Configs
```
rabbit-farm/
├── .gitignore                ← Excludes .env, node_modules, dist, dev_data.json
├── client/
│   ├── vercel.json           ← SPA rewrites + cache headers
│   ├── .env.example          ← Template for Vercel env vars
│   └── vite.config.ts        ← Chunk splitting (react / phaser / ui)
└── server/
    ├── railway.toml          ← Railway build + health check config
    ├── Procfile              ← `web: node src/server.js`
    ├── .env.example          ← Template for Railway env vars
    └── src/server.js         ← CORS locked to FRONTEND_URL in production
```

