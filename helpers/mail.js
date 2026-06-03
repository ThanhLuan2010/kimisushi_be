const nodemailer = require('nodemailer');

function createGmailTransporter(gmailUser, gmailPassword) {
  const user = gmailUser || process.env.GMAIL_USER;
  const pass = gmailPassword || process.env.GMAIL_APP_PASSWORD;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });
}

function createGmailTransporterWithConfig(gmailConfig) {
  const user = gmailConfig?.gmailUser || process.env.GMAIL_USER;
  const pass = gmailConfig?.gmailPassword || process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });
}

async function sendGmailNotification(orderData, gmailConfig) {
  const gmailUser = gmailConfig?.gmailUser || process.env.GMAIL_USER;
  const gmailNotifyEmail = gmailConfig?.gmailNotifyEmail || process.env.GMAIL_NOTIFY_EMAIL || gmailUser;
  const gmailEnabled = gmailConfig?.gmailEnabled || process.env.GMAIL_ENABLED === 'true';
  const gmailPassword = gmailConfig?.gmailPassword || process.env.GMAIL_APP_PASSWORD;

  if (!gmailEnabled || !gmailUser || !gmailPassword) {
    console.log('[GMAIL] Gmail not configured, skipping notification.');
    return { success: false, reason: 'Gmail not configured' };
  }

  const isReservation = orderData.orderType === 'reservation' || orderData.type === 'reservation';
  const items = orderData.items || [];
  const customerName = orderData.customerName || orderData.name || 'Khách hàng';
  const customerPhone = orderData.customerPhone || orderData.phone || '-';
  const customerEmail = orderData.customerEmail || orderData.email || '-';
  const pickupDateRaw = orderData.pickupDate || orderData.date || '-';
  const pickupTimeRaw = orderData.pickupTime || orderData.time || '-';
  const pickupTimeDisplay = pickupTimeRaw === 'asap'
    ? 'So schnell wie möglich'
    : (pickupTimeRaw !== '-' ? `${pickupTimeRaw} Uhr` : '-');
  const deliveryFee = orderData.deliveryFee || '0';
  const address = orderData.address || '-';
  const method = orderData.method || '-';
  const notes = orderData.notes || orderData.remark || '-';
  const status = orderData.status || 'neu';
  const itemId = orderData.id || orderData.orderId || '-';
  const itemCount = orderData.itemCount || (orderData.guests ? `${orderData.guests} ${isReservation ? 'Gäste' : 'Personen'}` : '-');

  const normalizePrice = (p) => {
    if (typeof p === 'number') return p;
    if (!p) return 0;
    const cleaned = String(p).replace('€', '').replace(/\s/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  const fmt = (n) => n.toFixed(2).replace('.', ',') + ' €';

  const subject = isReservation
    ? `📅 Neue Tischreservierung - ${customerName} - ${new Date().toLocaleDateString('de-DE')}`
    : `Neue Bestellung - ${customerName} - ${new Date().toLocaleDateString('de-DE')}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: auto; border: 3px solid ${isReservation ? '#22c55e' : '#8B0000'}; padding: 24px; border-radius: 14px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: ${isReservation ? '#22c55e' : '#8B0000'}; font-size: 26px; margin: 0;">
          ${isReservation ? '🍣 Neue Tischreservierung' : '🍣 Neue Bestellung'}
        </h1>
        <p style="color: #888; margin: 8px 0 0 0; font-size: 13px;">
          ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}
        </p>
      </div>
      <div style="background: #f0f9ff; border-radius: 10px; padding: 16px; margin-bottom: 16px; border: 1px solid #dbeafe;">
        <h3 style="margin: 0 0 10px 0; color: #1e40af; font-size: 14px; text-transform: uppercase;">📋 Bestell-/Reservierungsdaten</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 13px; width: 130px;"><strong>Nr.:</strong></td>
            <td style="padding: 6px 0; font-size: 14px; font-weight: bold;">${itemId}</td>
          </tr>
          ${isReservation ? `<tr>
            <td style="padding: 6px 0; color: #666; font-size: 13px;"><strong>Personen:</strong></td>
            <td style="padding: 6px 0; font-size: 16px; font-weight: bold; color: #22c55e;">${itemCount}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 13px;"><strong>Datum:</strong></td>
            <td style="padding: 6px 0; font-size: 14px;">${pickupDateRaw !== '-' ? pickupDateRaw.split('-').reverse().join('.') : '-'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 13px;"><strong>Uhrzeit:</strong></td>
            <td style="padding: 6px 0; font-size: 14px; font-weight: bold;">${pickupTimeDisplay}</td>
          </tr>
          ${!isReservation ? `<tr>
            <td style="padding: 6px 0; color: #666; font-size: 13px;"><strong>Art:</strong></td>
            <td style="padding: 6px 0; font-size: 14px;">${method === 'delivery' ? '🚴 Lieferung' : '🏪 Abholung / Vor Ort'}</td>
          </tr>` : ''}
          ${notes && notes.trim() ? `<tr>
            <td style="padding: 6px 0; color: #666; font-size: 13px; vertical-align: top;"><strong>⚠️ Allergien:</strong></td>
            <td style="padding: 6px 0; font-size: 14px; color: #b91c1c; font-weight: bold;">${notes}</td>
          </tr>` : ''}
        </table>
      </div>
      <div style="background: #fff; border-radius: 10px; padding: 16px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
        <h3 style="margin: 0 0 10px 0; color: #111; font-size: 14px; text-transform: uppercase;">👤 Kundendaten</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 13px; width: 130px;"><strong>Name:</strong></td>
            <td style="padding: 6px 0; font-size: 14px; font-weight: bold;">${customerName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 13px;"><strong>Telefon:</strong></td>
            <td style="padding: 6px 0; font-size: 14px;">${customerPhone}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 13px;"><strong>E-Mail:</strong></td>
            <td style="padding: 6px 0; font-size: 14px;">${customerEmail}</td>
          </tr>
          ${!isReservation && address && address !== 'Abholung / Vor Ort' ? `<tr>
            <td style="padding: 6px 0; color: #666; font-size: 13px;"><strong>Adresse:</strong></td>
            <td style="padding: 6px 0; font-size: 14px;">${address}</td>
          </tr>` : ''}
        </table>
      </div>
      ${!isReservation && items.length > 0 ? `
      <div style="background: #fff; border-radius: 10px; padding: 16px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
        <h3 style="margin: 0 0 12px 0; color: #8B0000; font-size: 14px; text-transform: uppercase;">🛒 Ordered Items</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background: #8B0000;">
            <th style="padding: 9px 10px; text-align: left; color: white; font-size: 12px; border-bottom: 2px solid #a80000;">Gericht</th>
            <th style="padding: 9px 10px; text-align: center; color: white; font-size: 12px; border-bottom: 2px solid #a80000;">Menge</th>
            <th style="padding: 9px 10px; text-align: right; color: white; font-size: 12px; border-bottom: 2px solid #a80000;">Einzelpreis</th>
            <th style="padding: 9px 10px; text-align: right; color: white; font-size: 12px; border-bottom: 2px solid #a80000;">Gesamt</th>
          </tr>
          ${(() => {
            let orderSubtotal = 0;
            return items.map(item => {
              const unitPrice = normalizePrice(item.price);
              const qty = parseInt(item.quantity) || 1;
              const subtotal = unitPrice * qty;
              orderSubtotal += subtotal;
              return `<tr>
                <td style="padding: 9px 10px; border-bottom: 1px solid #f0f0f0; font-size: 13px;">${item.name || '-'}</td>
                <td style="padding: 9px 10px; text-align: center; border-bottom: 1px solid #f0f0f0; font-size: 13px;">x${qty}</td>
                <td style="padding: 9px 10px; text-align: right; border-bottom: 1px solid #f0f0f0; font-size: 13px;">${fmt(unitPrice)}</td>
                <td style="padding: 9px 10px; text-align: right; border-bottom: 1px solid #f0f0f0; font-size: 13px; font-weight: bold;">${fmt(subtotal)}</td>
              </tr>`;
            }).join('');
          })()}
          ${parseFloat(deliveryFee) > 0 ? `<tr>
            <td colspan="3" style="padding: 9px 10px; text-align: right; font-size: 13px; color: #666;">Liefergebühr:</td>
            <td style="padding: 9px 10px; text-align: right; font-size: 13px;">${parseFloat(deliveryFee).toFixed(2).replace('.', ',')} €</td>
          </tr>` : ''}
          <tr style="background: #fef3c7;">
            <td colspan="3" style="padding: 12px 10px; text-align: right; font-weight: bold; font-size: 16px;">Gesamtbetrag:</td>
            <td style="padding: 12px 10px; text-align: right; font-weight: bold; font-size: 20px; color: #8B0000;">
              ${(() => {
                const delFee = parseFloat(deliveryFee) || 0;
                const itemsTotal = items.reduce((s, i) => s + normalizePrice(i.price) * (parseInt(i.quantity) || 1), 0);
                return fmt(itemsTotal + delFee);
              })()}
            </td>
          </tr>
        </table>
      </div>
      ` : ''}
      <div style="background: #fef3c7; border-radius: 10px; padding: 14px; margin-bottom: 16px; border: 1px solid #fde68a;">
        <p style="margin: 0; color: #92400e; font-size: 13px; text-align: center;">
          ${isReservation ? 'Bitte diese Reservierung umgehend bestätigen!' : 'Bitte diese Bestellung umgehend bearbeiten!'}
        </p>
      </div>
      <div style="background: #f9fafb; border-radius: 8px; padding: 12px; margin-bottom: 8px;">
        <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
          <strong>Status:</strong> ${status.charAt(0).toUpperCase() + status.slice(1)} · ${isReservation ? 'Reservierung' : 'Bestellung'}
        </p>
      </div>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0 12px;">
      <p style="font-size: 11px; color: #aaa; text-align: center; margin: 0;">Kimi Sushi — Automatisiertes Benachrichtigungssystem</p>
    </div>
  `;

  const transporter = gmailConfig?.gmailPassword
    ? await createGmailTransporterWithConfig(gmailConfig)
    : createGmailTransporter();

  if (!transporter) {
    return { success: false, reason: 'No valid Gmail credentials' };
  }

  try {
    const info = await transporter.sendMail({
      from: `"Kimi Sushi" <${gmailUser}>`,
      to: gmailNotifyEmail,
      subject: subject,
      html: htmlContent
    });
    console.log('[GMAIL] Notification sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[GMAIL] Error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  createGmailTransporter,
  sendGmailNotification
};
