require('dotenv').config();
const { sendGmailNotification, sendCustomerStatusEmail } = require('./helpers/mail');

async function testEmails() {
  console.log('--- Starting Email Tests ---');
  console.log('GMAIL_ENABLED:', process.env.GMAIL_ENABLED);
  console.log('GMAIL_USER:', process.env.GMAIL_USER);
  console.log('GMAIL_NOTIFY_EMAIL:', process.env.GMAIL_NOTIFY_EMAIL);
  // (Don't log password for security)

  // Dummy order data for testing
  const dummyOrder = {
    id: 'TEST-12345',
    orderId: 'TEST-12345',
    orderType: 'delivery',
    method: 'delivery',
    status: 'cooking',
    customerName: 'Test User',
    customerPhone: '0123456789',
    customerEmail: "luanlay2010@gmail.com", // Send to yourself for testing
    address: 'Teststraße 1, 12345 Teststadt',
    pickupDate: '2025-12-31',
    pickupTime: '18:00',
    deliveryFee: 2.50,
    total: 32.50,
    notes: 'Bitte nicht klingeln',
    items: [
      {
        name: 'Sake Sushi',
        quantity: 2,
        price: 5.00,
        note: 'Ohne Wasabi'
      },
      {
        name: 'Miso Suppe',
        quantity: 1,
        price: 4.50
      },
      {
        name: 'Tempura Roll',
        quantity: 1,
        price: 15.50
      }
    ]
  };

  try {
    console.log('\n1. Testing sendGmailNotification (Shop Notification)...');
    const shopResult = await sendGmailNotification(dummyOrder);
    console.log('Shop notification result:', shopResult);

    console.log('\n2. Testing sendCustomerStatusEmail (Customer Status Update)...');
    const customerResult = await sendCustomerStatusEmail(dummyOrder, 'neu', 'cooking');
    console.log('Customer notification result:', customerResult);

    console.log('\n--- Email Tests Completed ---');
  } catch (error) {
    console.error('Error during email tests:', error);
  }
}

testEmails();
