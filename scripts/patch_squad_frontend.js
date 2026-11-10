const fs = require('fs');
const path = require('path');

// 1. Update Wallet.tsx
const walletFile = path.join(__dirname, '../client/src/pages/Wallet.tsx');
let walletSrc = fs.readFileSync(walletFile, 'utf8');

walletSrc = walletSrc
  .replace(/depositPaystackData/g, 'depositSquadData')
  .replace(/setDepositPaystackData/g, 'setDepositSquadData')
  .replace(/paystackModalData/g, 'squadModalData')
  .replace(/setPaystackModalData/g, 'setSquadModalData')
  .replace(/Paystack NUBAN/g, 'Squad NUBAN')
  .replace(/Paystack Transfer/g, 'Squad Transfer')
  .replace(/Connecting to Paystack\.\.\./g, 'Connecting to Squad...')
  .replace(/via Paystack/g, 'via Squad')
  .replace(/Paystack Checkout/g, 'Squad Checkout')
  .replace(/Confirm Paystack Payment/g, 'Confirm Squad Payment')
  .replace(/Open Paystack Checkout/g, 'Open Squad Checkout')
  .replace(/via Paystack \(Cards, USSD, Bank Transfer, Apple Pay, OPay\)/g, 'via Squad (Cards, USSD, Bank Transfer, Apple Pay, OPay)')
  .replace(/Could not initialize Paystack transaction/g, 'Could not initialize Squad transaction')
  .replace(/\/\/ Load live Nigerian bank list from Paystack/g, '// Load live Nigerian bank list from Squad');

fs.writeFileSync(walletFile, walletSrc, 'utf8');
console.log('✅ Updated client/src/pages/Wallet.tsx');

// 2. Update Admin.tsx
const adminFile = path.join(__dirname, '../client/src/pages/Admin.tsx');
let adminSrc = fs.readFileSync(adminFile, 'utf8');

adminSrc = adminSrc
  .replace(
    "paystackRef?: string;",
    "squadRef?: string;\n  paystackRef?: string;"
  )
  .replace(
    "const handleApproveWithdrawal = async (id: string, method: 'paystack' | 'manual')",
    "const handleApproveWithdrawal = async (id: string, method: 'squad' | 'manual')"
  )
  .replace(
    "onClick={() => handleApproveWithdrawal(w._id, 'paystack')}",
    "onClick={() => handleApproveWithdrawal(w._id, 'squad')}"
  )
  .replace(
    'title="Execute real bank transfer via Paystack"',
    'title="Execute real bank transfer via Squad by GTCO"'
  )
  .replace(
    "⚡ Paystack Transfer",
    "⚡ Squad Transfer"
  )
  .replace(
    "<div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#C4B5FD' }}>\n                    Paystack\n                  </div>",
    "<div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#C4B5FD' }}>\n                    Squad (GTCO)\n                  </div>"
  )
  .replace(
    "Ref: {w.transferCode || w.paystackRef || 'N/A'}",
    "Ref: {w.transferCode || w.squadRef || w.paystackRef || 'N/A'}"
  );

fs.writeFileSync(adminFile, adminSrc, 'utf8');
console.log('✅ Updated client/src/pages/Admin.tsx');

// 3. Update Landing.tsx
const landingFile = path.join(__dirname, '../client/src/pages/Landing.tsx');
let landingSrc = fs.readFileSync(landingFile, 'utf8');

landingSrc = landingSrc
  .replace(
    "<span>Fast Paystack processing</span>",
    "<span>Fast Squad processing</span>"
  )
  .replace(
    "Nigerian bank accounts via Paystack",
    "Nigerian bank accounts via Squad by GTCO"
  );

fs.writeFileSync(landingFile, landingSrc, 'utf8');
console.log('✅ Updated client/src/pages/Landing.tsx');

// 4. Update Play.tsx
const playFile = path.join(__dirname, '../client/src/pages/Play.tsx');
let playSrc = fs.readFileSync(playFile, 'utf8');

playSrc = playSrc.replace(
  "title: 'Paystack Instant Cashouts 💳',",
  "title: 'Squad Instant Cashouts 💳',"
);

fs.writeFileSync(playFile, playSrc, 'utf8');
console.log('✅ Updated client/src/pages/Play.tsx');

// 5. Update FarmRide.ts
const farmRideFile = path.join(__dirname, '../client/src/game/scenes/FarmRide.ts');
let farmRideSrc = fs.readFileSync(farmRideFile, 'utf8');

farmRideSrc = farmRideSrc.replace(
  "sponsor: 'Carrot Fuel & Paystack Payouts'",
  "sponsor: 'Carrot Fuel & Squad Payouts'"
);

fs.writeFileSync(farmRideFile, farmRideSrc, 'utf8');
console.log('✅ Updated client/src/game/scenes/FarmRide.ts');
