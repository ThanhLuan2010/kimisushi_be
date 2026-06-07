const admin = require('firebase-admin');

// Parse FIREBASE_SERVICE_ACCOUNT from environment variables
// It should be the JSON stringified version of the downloaded Service Account key
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
    console.warn('[Firebase Admin] FIREBASE_SERVICE_ACCOUNT env var is missing. Push notifications will not work.');
  }
} catch (err) {
  console.error('[Firebase Admin] Failed to initialize:', err.message);
}

/**
 * Send push notification to a list of tokens
 * @param {Array<string>} tokens - Array of FCM device tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data payload
 */
async function sendPushNotification(tokens, title, body, data = {}) {
  if (!tokens || tokens.length === 0) {
    return [];
  }

  const fcmTokens = [];
  const expoTokens = [];

  tokens.forEach(t => {
    if (t.startsWith('ExponentPushToken')) {
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
          channelId: 'default',
          sound: 'default'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default'
          }
        }
      },
      tokens: fcmTokens
    };
    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(`[Firebase] Successfully sent ${response.successCount}, failed ${response.failureCount}`);
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
      sound: 'default',
      priority: 'high',
      channelId: 'default',
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
      console.log(`[Expo Push] Response:`, JSON.stringify(result));
      
      // We can also parse 'result.data' for errors if needed, but for now just returning failed ones from FCM
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
