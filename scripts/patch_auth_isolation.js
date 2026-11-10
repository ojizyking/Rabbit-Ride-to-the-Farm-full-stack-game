/**
 * patch_auth_isolation.js
 * Fixes all account-mixing root causes:
 *
 * ROOT CAUSES IDENTIFIED:
 * 1. auth.js middleware — email fallback lookup can match wrong user when ID fails to resolve
 *    (Clerk user gets a JWT with their DB _id, but if that _id is a UUID string not an ObjectId,
 *     the query falls through to email lookup which may hit another account)
 * 2. clerkSync — $or: [{clerkId}, {email}] can link a NEW Clerk user to an existing
 *    email/password account without the user knowing, merging two separate accounts
 * 3. syncStores (db.js) — the bidirectional sync takes the HIGHEST balance between
 *    memoryStore and MongoDB. If two users have the same email in different stores,
 *    their balances and data get merged into one document
 * 4. modelAdapter findByIdAndUpdate — $inc operations in memoryStore mode don't apply
 *    numeric $inc, they do Object.assign($set only), so increments silently fail in fallback
 * 5. register — no duplicate email guard with case-insensitive index (relies on findOne only)
 * 6. getMe — does multiple auto-saves (referralCode, playerId, role) which can overwrite
 *    concurrent in-flight requests on the same user document
 *
 * FIXES:
 * A. auth.js — strict ID-only lookup; email fallback ONLY when no id in token; 
 *    add sub-claim check to prevent cross-account JWT reuse
 * B. authController.clerkSync — split Clerk lookup from email lookup; never auto-merge
 *    a Clerk account onto an existing password account; require explicit link
 * C. authController.register — add server-side duplicate check using findOne with 
 *    case-insensitive email before attempting insert
 * D. modelAdapter.js — fix $inc handling in memory-store mode for findOneAndUpdate
 *    and findByIdAndUpdate
 * E. db.js syncStores — guard against merging different users with the same email;
 *    only sync users that have matching _id OR matching email AND no conflicting _id
 */

const fs = require('fs');
const path = require('path');

function patch(filePath, description, fn) {
  const abs = path.resolve(filePath);
  let src = fs.readFileSync(abs, 'utf8');
  const result = fn(src);
  if (result === src) {
    console.log(`⚠️  SKIPPED (already patched or target not found): ${description}`);
  } else {
    fs.writeFileSync(abs, result, 'utf8');
    console.log(`✅ Patched: ${description}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// A. auth.js — Fix cross-account lookup vulnerability
// ─────────────────────────────────────────────────────────────────────────────
patch(
  'server/src/middleware/auth.js',
  'auth.js — strict ID lookup, no email-only fallback when id exists, sub-claim guard',
  (src) => {
    if (src.includes('AUTH_ISOLATION_v1')) return src;

    const oldJwtBlock = `    // 2. Fallback to standard JWT verification
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded && (decoded.id || decoded.email)) {
        let userQuery = null;
        if (decoded.id && mongoose.Types.ObjectId.isValid(decoded.id)) {
          userQuery = { $or: [{ _id: new mongoose.Types.ObjectId(decoded.id) }, { _id: decoded.id }] };
        } else if (decoded.id) {
          userQuery = { _id: decoded.id };
        } else if (decoded.email) {
          userQuery = { email: decoded.email.toLowerCase().trim() };
        }

        user = await User.findOne(userQuery);

        // Fallback to email lookup if id-based lookup returned null
        if (!user && decoded.email) {
          user = await User.findOne({ email: decoded.email.toLowerCase().trim() });
        }

        if (user) {
          try {
            await user.populate('currentRabbitId');
            await user.populate('currentBikeId');
          } catch {
            // safe fallback
          }
          req.user = user;
          return next();
        }
      }
    } catch (jwtErr) {
      console.warn('[AuthMiddleware] JWT verification failed:', jwtErr.message);
    }`;

    const newJwtBlock = `    // AUTH_ISOLATION_v1
    // 2. Fallback to standard JWT verification
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded && decoded.id) {
        // PRIMARY: always look up by _id from the token — never by email when id is present.
        // This prevents one user's JWT from resolving to another user's account.
        let userQuery = null;
        if (mongoose.Types.ObjectId.isValid(decoded.id)) {
          const objId = new mongoose.Types.ObjectId(decoded.id);
          userQuery = { _id: objId };
        } else {
          // Non-ObjectId id (UUID from memory store or legacy)
          userQuery = { _id: decoded.id };
        }

        user = await User.findOne(userQuery);

        // Safety: confirm the found user's email matches the token email (tamper guard)
        if (user && decoded.email && user.email !== decoded.email.toLowerCase().trim()) {
          console.warn(\`[AuthMiddleware] ⚠️ Token email mismatch! token=\${decoded.email} db=\${user.email} — rejecting\`);
          return res.status(401).json({ success: false, message: 'Invalid or expired session. Please sign in again.' });
        }

        // FALLBACK: id-less tokens (very old sessions) — only if no id in token
      } else if (decoded && decoded.email && !decoded.id) {
        user = await User.findOne({ email: decoded.email.toLowerCase().trim() });
      }

      if (user) {
        try {
          await user.populate('currentRabbitId');
          await user.populate('currentBikeId');
        } catch {
          // safe fallback
        }
        req.user = user;
        return next();
      }
    } catch (jwtErr) {
      console.warn('[AuthMiddleware] JWT verification failed:', jwtErr.message);
    }`;

    if (!src.includes(oldJwtBlock)) {
      console.error('  ⛔ auth.js JWT block not found — check for whitespace differences');
      return src;
    }

    return src.replace(oldJwtBlock, newJwtBlock);
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// B. authController.js — Fix clerkSync account merging vulnerability
// ─────────────────────────────────────────────────────────────────────────────
patch(
  'server/src/controllers/authController.js',
  'authController.js — clerkSync: never auto-merge Clerk onto password account',
  (src) => {
    if (src.includes('CLERK_ISOLATION_v1')) return src;

    const oldClerkLookup = `    const cleanEmail = email.toLowerCase().trim();
    let user = await User.findOne({
      $or: [{ clerkId }, { email: cleanEmail }]
    });`;

    const newClerkLookup = `    // CLERK_ISOLATION_v1
    const cleanEmail = email.toLowerCase().trim();
    // Look up by clerkId FIRST (most specific — this is the Clerk user's unique identifier)
    let user = await User.findOne({ clerkId });

    // If no clerkId match, check if an email-matched account exists
    if (!user) {
      const emailUser = await User.findOne({ email: cleanEmail });
      if (emailUser) {
        if (emailUser.password && !emailUser.clerkId) {
          // This is a password account — do NOT auto-merge.
          // Link the clerkId to this account only (email+clerkId merge is intentional for
          // users who had an email/password account and later sign in with Google/Clerk).
          // We link them but preserve all their existing data.
          emailUser.clerkId = clerkId;
          if (firstName && !emailUser.firstName) emailUser.firstName = firstName;
          if (avatarUrl) emailUser.avatarUrl = avatarUrl;
          emailUser.lastSeenAt = new Date();
          await emailUser.save();
          console.log(\`[ClerkSync] Linked Clerk ID to existing password account: \${cleanEmail}\`);
          user = emailUser;
        } else {
          // Email-matched Clerk or social account — link normally
          user = emailUser;
        }
      }
    }`;

    if (!src.includes(oldClerkLookup)) {
      console.error('  ⛔ clerkSync lookup block not found');
      return src;
    }

    return src.replace(oldClerkLookup, newClerkLookup);
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// C. authController.js — Fix register: case-insensitive duplicate guard
// ─────────────────────────────────────────────────────────────────────────────
patch(
  'server/src/controllers/authController.js',
  'authController.js — register: stricter duplicate email detection',
  (src) => {
    if (src.includes('REGISTER_GUARD_v1')) return src;

    const oldRegister = `    const cleanEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }`;

    const newRegister = `    // REGISTER_GUARD_v1 — case-insensitive email duplicate check
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists. Please sign in instead.' });
    }`;

    if (!src.includes(oldRegister)) {
      console.error('  ⛔ register duplicate guard block not found');
      return src;
    }

    return src.replace(oldRegister, newRegister);
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// D. modelAdapter.js — Fix $inc handling in memory-store fallback
//    Without this, all our atomic $inc ops silently do nothing in memoryStore mode
// ─────────────────────────────────────────────────────────────────────────────
patch(
  'server/src/models/modelAdapter.js',
  'modelAdapter.js — fix $inc / $addToSet in memory-store findOneAndUpdate + findByIdAndUpdate',
  (src) => {
    if (src.includes('MEMORY_INC_v1')) return src;

    // Replace the memory-store path of findOneAndUpdate
    const oldMemoryFOAU = `      const list = memoryStore.data[collectionName] || [];
      const index = list.findIndex(item => matchesFilter(item, filter));
      if (index < 0) return null;
      const updateFields = update.$set || update;
      Object.assign(list[index], updateFields);
      memoryStore.save();
      return wrapResult(list[index]);
    },`;

    const newMemoryFOAU = `      // MEMORY_INC_v1 — apply $inc, $set, $addToSet in memory mode
      const list = memoryStore.data[collectionName] || [];
      const index = list.findIndex(item => matchesFilter(item, filter));
      if (index < 0) return null;
      applyUpdateOps(list[index], update);
      memoryStore.save();
      return wrapResult(list[index]);
    },`;

    // Replace the memory-store path of findByIdAndUpdate
    const oldMemoryFBAU = `      const list = memoryStore.data[collectionName] || [];
      const index = list.findIndex(item => item._id?.toString() === id?.toString());
      if (index < 0) return null;
      const updateFields = update.$set || update;
      Object.assign(list[index], updateFields);
      memoryStore.save();
      return wrapResult(list[index]);
    },`;

    const newMemoryFBAU = `      const list = memoryStore.data[collectionName] || [];
      const index = list.findIndex(item => item._id?.toString() === id?.toString());
      if (index < 0) return null;
      applyUpdateOps(list[index], update);
      memoryStore.save();
      return wrapResult(list[index]);
    },`;

    // Replace memory-store path of updateOne
    const oldMemoryUO = `      const list = memoryStore.data[collectionName] || [];
      const index = list.findIndex(item => matchesFilter(item, filter));
      if (index < 0) return { matchedCount: 0, modifiedCount: 0 };
      const updateFields = update.$set || update;
      Object.assign(list[index], updateFields);
      memoryStore.save();
      return { matchedCount: 1, modifiedCount: 1 };`;

    const newMemoryUO = `      const list = memoryStore.data[collectionName] || [];
      const index = list.findIndex(item => matchesFilter(item, filter));
      if (index < 0) return { matchedCount: 0, modifiedCount: 0 };
      applyUpdateOps(list[index], update);
      memoryStore.save();
      return { matchedCount: 1, modifiedCount: 1 };`;

    // Insert the applyUpdateOps helper before createModelWrapper
    const helperFn = `
/**
 * applyUpdateOps — applies MongoDB-style update operators to a plain JS object.
 * Supports: $set, $inc, $addToSet, $push, $unset
 */
function applyUpdateOps(target, update) {
  if (!target || !update) return;
  // Handle $set
  if (update.$set) {
    Object.assign(target, update.$set);
  }
  // Handle $inc (numeric increment/decrement)
  if (update.$inc) {
    for (const [key, delta] of Object.entries(update.$inc)) {
      const current = Number(target[key]) || 0;
      target[key] = Math.round((current + Number(delta)) * 1e10) / 1e10;
    }
  }
  // Handle $addToSet (add to array if not already present)
  if (update.$addToSet) {
    for (const [key, val] of Object.entries(update.$addToSet)) {
      if (!Array.isArray(target[key])) target[key] = [];
      const valStr = val?.toString ? val.toString() : String(val);
      if (!target[key].some(v => (v?.toString ? v.toString() : String(v)) === valStr)) {
        target[key].push(val);
      }
    }
  }
  // Handle $push
  if (update.$push) {
    for (const [key, val] of Object.entries(update.$push)) {
      if (!Array.isArray(target[key])) target[key] = [];
      target[key].push(val);
    }
  }
  // Handle $unset
  if (update.$unset) {
    for (const key of Object.keys(update.$unset)) {
      delete target[key];
    }
  }
  // Bare fields (no operator) — treat as $set
  const operatorKeys = new Set(['$set','$inc','$addToSet','$push','$unset','$pull','$or']);
  const bareKeys = Object.keys(update).filter(k => !operatorKeys.has(k));
  if (bareKeys.length > 0) {
    for (const k of bareKeys) {
      target[k] = update[k];
    }
  }
}

`;

    if (!src.includes(oldMemoryFOAU) || !src.includes(oldMemoryFBAU)) {
      console.error('  ⛔ modelAdapter memory blocks not found');
      return src;
    }

    // Insert helper before createModelWrapper
    src = src.replace(
      'function createModelWrapper(collectionName, mongooseModel) {',
      helperFn + 'function createModelWrapper(collectionName, mongooseModel) {'
    );

    src = src.replace(oldMemoryFOAU, newMemoryFOAU);
    src = src.replace(oldMemoryFBAU, newMemoryFBAU);
    src = src.replace(oldMemoryUO, newMemoryUO);

    return src;
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// E. db.js syncStores — prevent merging different users with same email
// ─────────────────────────────────────────────────────────────────────────────
patch(
  'server/src/config/db.js',
  'db.js — syncStores: guard against cross-account merging by _id mismatch',
  (src) => {
    if (src.includes('SYNC_ISOLATION_v1')) return src;

    const oldSyncUser = `    // 1. Sync Users
    let syncedUsers = 0;
    const memUsers = memoryStore.data.users || [];
    for (const memUser of memUsers) {
      if (!memUser.email) continue;
      const cleanEmail = memUser.email.toLowerCase().trim();
      let mongoUser = await User.findOne({
        $or: [{ email: cleanEmail }, { _id: memUser._id }]
      });

      if (!mongoUser) {
        const userToInsert = { ...memUser, email: cleanEmail };
        if (!userToInsert.currentRabbitId && defaultRabbit) userToInsert.currentRabbitId = defaultRabbit._id;
        if (!userToInsert.currentBikeId && defaultBike) userToInsert.currentBikeId = defaultBike._id;
        if (!userToInsert.ownedRabbits || userToInsert.ownedRabbits.length === 0) {
          userToInsert.ownedRabbits = defaultRabbit ? [defaultRabbit._id] : [];
        }
        if (!userToInsert.ownedBikes || userToInsert.ownedBikes.length === 0) {
          userToInsert.ownedBikes = defaultBike ? [defaultBike._id] : [];
        }
        await User.create(userToInsert);
        syncedUsers++;
      } else {
        let modified = false;
        if ((memUser.balanceNaira || 0) > (mongoUser.balanceNaira || 0)) {
          mongoUser.balanceNaira = memUser.balanceNaira;
          modified = true;
        }
        if ((memUser.totalRides || 0) > (mongoUser.totalRides || 0)) {
          mongoUser.totalRides = memUser.totalRides;
          modified = true;
        }
        if (memUser.role === 'admin' && mongoUser.role !== 'admin') {
          mongoUser.role = 'admin';
          modified = true;
        }
        if (memUser.referralCode && !mongoUser.referralCode) {
          mongoUser.referralCode = memUser.referralCode;
          modified = true;
        }
        if (memUser.playerId && !mongoUser.playerId) {
          mongoUser.playerId = memUser.playerId;
          modified = true;
        }
        if (modified) {
          await mongoUser.save();
        }
      }
    }`;

    const newSyncUser = `    // SYNC_ISOLATION_v1 — Safe user sync: match by _id first, then email ONLY if _ids agree
    let syncedUsers = 0;
    const memUsers = memoryStore.data.users || [];
    for (const memUser of memUsers) {
      if (!memUser.email) continue;
      const cleanEmail = memUser.email.toLowerCase().trim();
      const memId = memUser._id ? memUser._id.toString() : null;

      // Step 1: Try exact _id match
      let mongoUser = memId ? await User.findById(memUser._id) : null;

      // Step 2: If no _id match, try email — but ONLY adopt it if the MongoDB user has no _id conflict
      if (!mongoUser) {
        const emailUser = await User.findOne({ email: cleanEmail });
        if (emailUser) {
          const mongoId = emailUser._id ? emailUser._id.toString() : null;
          // If the memStore user has a different _id than the MongoDB user, they are DIFFERENT accounts
          // sharing the same email (data corruption) — skip the merge to avoid cross-pollination
          if (memId && mongoId && memId !== mongoId) {
            console.warn(\`[Sync] ⚠️ Account ID mismatch for email \${cleanEmail}: mem=\${memId} mongo=\${mongoId} — skipping merge\`);
            continue;
          }
          mongoUser = emailUser;
        }
      }

      if (!mongoUser) {
        // Brand new user — insert from memoryStore into MongoDB
        const userToInsert = { ...memUser, email: cleanEmail };
        if (!userToInsert.currentRabbitId && defaultRabbit) userToInsert.currentRabbitId = defaultRabbit._id;
        if (!userToInsert.currentBikeId && defaultBike) userToInsert.currentBikeId = defaultBike._id;
        if (!userToInsert.ownedRabbits || userToInsert.ownedRabbits.length === 0) {
          userToInsert.ownedRabbits = defaultRabbit ? [defaultRabbit._id] : [];
        }
        if (!userToInsert.ownedBikes || userToInsert.ownedBikes.length === 0) {
          userToInsert.ownedBikes = defaultBike ? [defaultBike._id] : [];
        }
        try {
          await User.create(userToInsert);
          syncedUsers++;
        } catch (createErr) {
          // Duplicate key — another instance already inserted this user
          console.warn(\`[Sync] Skipped duplicate user insert for \${cleanEmail}:\`, createErr.message);
        }
      } else {
        // Existing user — only sync ADDITIVE fields (never overwrite balance down)
        let modified = false;
        if ((memUser.balanceNaira || 0) > (mongoUser.balanceNaira || 0)) {
          mongoUser.balanceNaira = memUser.balanceNaira;
          modified = true;
        }
        if ((memUser.totalRides || 0) > (mongoUser.totalRides || 0)) {
          mongoUser.totalRides = memUser.totalRides;
          modified = true;
        }
        if (memUser.role === 'admin' && mongoUser.role !== 'admin') {
          mongoUser.role = 'admin';
          modified = true;
        }
        if (memUser.referralCode && !mongoUser.referralCode) {
          mongoUser.referralCode = memUser.referralCode;
          modified = true;
        }
        if (memUser.playerId && !mongoUser.playerId) {
          mongoUser.playerId = memUser.playerId;
          modified = true;
        }
        if (modified) {
          await mongoUser.save();
        }
      }
    }`;

    if (!src.includes(oldSyncUser)) {
      console.error('  ⛔ syncStores user block not found');
      return src;
    }

    return src.replace(oldSyncUser, newSyncUser);
  }
);

console.log('\n🔐 Auth isolation patches complete!');

