const { sendGmailNotification, createGmailTransporter } = require('../helpers/mail');

async function notify(req, res) {
  try {
    const orderData = req.body;
    if (!orderData) return res.status(400).json({ error: 'Missing order data' });

    const gmailConfig = {
      gmailEnabled: orderData.gmailEnabled,
      gmailUser: orderData.gmailUser,
      gmailPassword: orderData.gmailPassword,
      gmailNotifyEmail: orderData.gmailNotifyEmail
    };

    const result = await sendGmailNotification(orderData, gmailConfig);
    if (result.success) {
      res.json({ success: true, message: 'Email sent successfully', messageId: result.messageId });
    } else {
      res.json({ success: false, message: result.reason || result.error });
    }
  } catch (error) {
    console.error('[API] Gmail notify error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function testConnection(req, res) {
  try {
    const transporter = createGmailTransporter();
    await transporter.verify().then(() => {
      res.json({ success: true, message: 'Gmail SMTP connected successfully!' });
    }).catch(err => {
      res.status(500).json({ success: false, error: err.message });
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

async function testSend(req, res) {
  const { gmailUser, gmailPassword } = req.body || {};
  const result = await sendGmailNotification({
    orderType: 'order',
    customerName: 'Test Customer',
    customerPhone: '+49 123 456789',
    customerEmail: 'test@example.com',
    pickupTime: '18:00',
    items: [
      { name: 'Sake Nigiri', quantity: 2, price: '5,90 €' },
      { name: 'Dragon Roll', quantity: 1, price: '14,90 €' }
    ],
    total: '26,70'
  }, { gmailUser, gmailPassword, gmailEnabled: true });
  res.json(result);
}

module.exports = {
  notify,
  testConnection,
  testSend
};
