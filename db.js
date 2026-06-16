const dns = require('dns');
const mongoose = require('mongoose');

if (!process.env.VERCEL) {
  const googleResolver = new dns.promises.Resolver();
  googleResolver.setServers(['8.8.8.8']);

  dns.promises.resolveSrv = async function(hostname) {
    if (hostname.includes('dwxwnkm.mongodb.net')) {
      return googleResolver.resolveSrv(hostname);
    }
    return dns.promises.Resolver.prototype.resolveSrv.call(this, hostname);
  };

  dns.promises.resolveTxt = async function(hostname) {
    if (hostname.includes('dwxwnkm.mongodb.net')) {
      try {
        return await googleResolver.resolveTxt(hostname);
      } catch {
        return [];
      }
    }
    return dns.promises.Resolver.prototype.resolveTxt.call(this, hostname);
  };

  dns.promises.resolve4 = async function(hostname) {
    if (hostname.includes('dwxwnkm.mongodb.net')) {
      return googleResolver.resolve4(hostname);
    }
    return dns.promises.Resolver.prototype.resolve4.call(this, hostname);
  };
}

let reconnectTimer = null;

// Disable query buffering globally so operations fail immediately if database is not connected
mongoose.set('bufferCommands', false);

async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  if (mongoose.connection.readyState === 2) {
    console.log('[MongoDB] Already connecting...');
    return;
  }

  const mongoUrl = process.env.MONGODB_URL;
  if (!mongoUrl) {
    console.warn('[MongoDB] MONGODB_URL not set in .env — running without database connection.');
    return;
  }

  try {
    await mongoose.connect(mongoUrl, {
      serverSelectionTimeoutMS: 5000, // Reduced from 10000 to fail faster
    });
    console.log('[MongoDB] Connected successfully.');

    mongoose.connection.on('error', (err) => {
      console.error('[MongoDB] Connection error:', err);
    });
    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB] Disconnected. Will retry on next operation.');
      scheduleReconnect();
    });
    mongoose.connection.on('reconnected', () => {
      console.log('[MongoDB] Reconnected successfully.');
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    });
  } catch (err) {
    console.error('[MongoDB] Failed to connect:', err.message);
    scheduleReconnect();
  }
}

function scheduleReconnect(delay = 15000) {
  if (reconnectTimer) return;
  if (!process.env.MONGODB_URL) return; // Don't reconnect if URL is missing
  console.warn(`[MongoDB] Scheduling reconnect in ${delay / 1000}s...`);
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    console.log('[MongoDB] Attempting reconnection...');
    try {
      await mongoose.connect(process.env.MONGODB_URL, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log('[MongoDB] Reconnected successfully.');
    } catch (err) {
      console.error('[MongoDB] Reconnection failed:', err.message);
      scheduleReconnect(Math.min(delay * 1.5, 120000));
    }
  }, delay);
}

module.exports = { connectDB, mongoose };
