const admin = require('firebase-admin');
const FcmToken = require('../models/FcmToken');

// Parse FIREBASE_SERVICE_ACCOUNT from environment variables
let isFirebaseInitialized = false;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    isFirebaseInitialized = true;
    console.log('[Firebase Admin] Initialized successfully');
  } else {
    console.warn('[Firebase Admin] FIREBASE_SERVICE_ACCOUNT env var is missing. Push notifications will rely on Expo Push API.');
  }
} catch (err) {
  console.error('[Firebase Admin] Failed to initialize:', err.message);
}

/**
 * Send push notification to a list of tokens (FCM & Expo)
 * @param {Array<string>} tokens - Array of device tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data payload
 * @param {Object} options - Custom options (channelId, sound)
 */
async function sendPushNotification(tokens, title, body, data = {}, options = {}) {
  if (!tokens || tokens.length === 0) {
    return [];
  }

  const channelId = options.channelId || 'new_orders';
  const soundName = options.sound || 'notification_sound';

  const fcmTokens = [];
  const expoTokens = [];

  tokens.forEach(t => {
    if (t.startsWith('ExponentPushToken') || t.startsWith('ExpoPushToken')) {
      expoTokens.push(t);
    } else {
      fcmTokens.push(t);
    }
  });

  const failedTokens = [];

  // 1. Send via Firebase FCM
  if (isFirebaseInitialized && fcmTokens.length > 0) {
    const message = {
      notification: { title, body },
      data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
      android: {
        priority: 'high',
        notification: {
          channelId: channelId,
          sound: soundName
        }
      },
      apns: {
        payload: {
          aps: {
            sound: soundName + '.wav'
          }
        }
      },
      tokens: fcmTokens
    };
    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      console.log('[Firebase] Successfully sent ' + response.successCount + ', failed ' + response.failureCount);
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(fcmTokens[idx]);
          }
        });
      }
    } catch (error) {
      console.error('[Firebase] Error sending multicast message:', error);
    }
  }

  // 2. Send via Expo Push API
  if (expoTokens.length > 0) {
    const expoMessages = expoTokens.map(token => ({
      to: token,
      sound: soundName.endsWith('.wav') ? soundName : soundName + '.wav',
      priority: 'high',
      channelId: channelId,
      title,
      body,
      data
    }));

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(expoMessages)
      });
      const result = await response.json();
      console.log('[Expo Push] Sent ' + expoTokens.length + ' messages. Response:', JSON.stringify(result));

      // Clean up invalid or unregistered tokens automatically
      if (result && Array.isArray(result.data)) {
        result.data.forEach((ticket, idx) => {
          if (ticket.status === 'error' && ticket.details && ticket.details.error === 'DeviceNotRegistered') {
            const badToken = expoTokens[idx];
            if (badToken) {
              console.log('[Expo Push] Cleaning up unregistered token: ' + badToken);
              FcmToken.deleteOne({ token: badToken }).catch(console.warn);
            }
          }
        });
      }
    } catch (error) {
      console.error('[Expo Push] Error sending Expo messages:', error);
    }
  }

  return failedTokens;
}

module.exports = {
  admin,
  isFirebaseInitialized,
  sendPushNotification
};
