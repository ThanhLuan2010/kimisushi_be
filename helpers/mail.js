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
  const pickupTimeDisplay = (pickupTimeRaw === 'asap' || pickupTimeRaw === 'schnell wie möglich')
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

async function sendCustomerStatusEmail(orderData, oldStatus, newStatus, gmailConfig) {
  const gmailUser = gmailConfig?.gmailUser || process.env.GMAIL_USER;
  const gmailEnabled = gmailConfig?.gmailEnabled || process.env.GMAIL_ENABLED === 'true';
  const gmailPassword = gmailConfig?.gmailPassword || process.env.GMAIL_APP_PASSWORD;

  const customerEmail = orderData.customerEmail || orderData.email;

  if (!gmailEnabled || !gmailUser || !gmailPassword) {
    console.log('[GMAIL-CUSTOMER] Gmail not configured, skipping status update email.');
    return { success: false, reason: 'Gmail not configured' };
  }

  if (!customerEmail || !customerEmail.includes('@')) {
    console.log(`[GMAIL-CUSTOMER] Customer email invalid or missing for ${orderData.id}, skipping email.`);
    return { success: false, reason: 'No customer email' };
  }

  const isReservation = orderData.orderType === 'reservation' || orderData.type === 'reservation';
  const items = orderData.items || orderData.cart || [];
  const customerName = orderData.customerName || orderData.name || 'Sehr geehrter Kunde';
  const customerPhone = orderData.customerPhone || orderData.phone || '-';
  const pickupDateRaw = orderData.pickupDate || orderData.date || '-';
  const pickupTimeRaw = orderData.pickupTime || orderData.time || '-';
  const pickupTimeDisplay = (pickupTimeRaw === 'asap' || pickupTimeRaw === 'schnell wie möglich')
    ? 'So schnell wie möglich'
    : (pickupTimeRaw !== '-' ? `${pickupTimeRaw} Uhr` : '-');
  const deliveryFee = orderData.deliveryFee || '0';
  const address = orderData.address || '-';
  const method = orderData.method || '-';
  const notes = orderData.notes || orderData.remark || '-';
  const itemId = orderData.id || orderData.orderId || '-';
  const itemCount = orderData.itemCount || (orderData.guests ? `${orderData.guests} Personen` : '-');

  const normalizePrice = (p) => {
    if (typeof p === 'number') return p;
    if (!p) return 0;
    const cleaned = String(p).replace('€', '').replace(/\s/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  const fmt = (n) => n.toFixed(2).replace('.', ',') + ' €';

  // Customize subject and body based on status transition
  let subject = '';
  let statusHeader = '';
  let statusMessage = '';
  let statusColor = '#8B0000'; // Default dark red

  const fmtDate = pickupDateRaw !== '-' ? pickupDateRaw.split('-').reverse().join('.') : '-';

  if (isReservation) {
    statusColor = '#22c55e'; // Green
    if (newStatus === 'confirmed') {
      subject = `📅 Bestätigung: Ihre Tischreservierung bei Kimi Sushi`;
      statusHeader = `Ihre Tischreservierung wurde bestätigt`;
      statusMessage = `Hallo ${customerName},<br/><br/>wir freuen uns, Ihre Tischreservierung für <strong>${itemCount}</strong> am <strong>${fmtDate}</strong> um <strong>${pickupTimeDisplay}</strong> zu bestätigen.${orderData.tableId ? `<br/>Zugewiesener Tisch: <strong>Tisch #${orderData.tableId.replace('t', '')}</strong>.` : ''}<br/><br/>Wir freuen uns auf Ihren Besuch!`;
    } else if (newStatus === 'cancelled') {
      statusColor = '#ef4444'; // Red
      subject = `❌ Stornierung: Ihre Tischreservierung bei Kimi Sushi`;
      statusHeader = `Ihre Tischreservierung wurde storniert`;
      statusMessage = `Hallo ${customerName},<br/><br/>leider müssen wir Ihnen mitteilen, dass Ihre Tischreservierung für den <strong>${fmtDate}</strong> um <strong>${pickupTimeDisplay}</strong> storniert wurde. Bitte kontaktieren Sie uns bei Fragen telefonisch oder per E-Mail.`;
    } else if (newStatus === 'arrived') {
      subject = `✅ Willkommen bei Kimi Sushi`;
      statusHeader = `Herzlich Willkommen!`;
      statusMessage = `Hallo ${customerName},<br/><br/>vielen Dank für Ihren Besuch! Wir hoffen, Sie genießen Ihren Aufenthalt bei Kimi Sushi. Guten Appetit!`;
    } else {
      subject = `📅 Update zu Ihrer Reservierung bei Kimi Sushi`;
      statusHeader = `Status Ihrer Reservierung wurde aktualisiert`;
      statusMessage = `Hallo ${customerName},<br/><br/>der Status Ihrer Reservierung am <strong>${fmtDate}</strong> um <strong>${pickupTimeDisplay}</strong> wurde auf <strong>${newStatus}</strong> geändert.`;
    }
  } else {
    // Orders
    if (newStatus === 'cooking' || newStatus === 'confirmed' || newStatus === 'in_bearbeitung') {
      subject = `🍣 Kimi Sushi: Ihre Bestellung wird vorbereitet!`;
      statusHeader = `Ihre Bestellung wird vorbereitet`;
      statusMessage = `Hallo ${customerName},<br/><br/>wir haben Ihre Bestellung <strong>#${itemId}</strong> erhalten und bereiten Ihre Gerichte jetzt frisch zu!<br/><br/><strong>Bereitstellungszeit:</strong> ${pickupTimeDisplay}.${orderData.estimatedMinutes ? `<br/><strong>Dự kiến:</strong> trong khoảng ${orderData.estimatedMinutes} Minuten.` : ''}`;
    } else if (newStatus === 'done' || newStatus === 'fertig' || newStatus === 'abgeschlossen') {
      statusColor = '#10b981'; // Success Green
      subject = `🍣 Kimi Sushi: Ihre Bestellung ist fertig!`;
      statusHeader = `Ihre Bestellung ist fertiggestellt`;
      if (method === 'delivery') {
        statusMessage = `Hallo ${customerName},<br/><br/>Gute Nachrichten! Ihre Bestellung <strong>#${itemId}</strong> wurde frisch zubereitet und befindet sich jetzt auf dem Weg zu Ihnen unter der Adresse: <strong>${address}</strong>.`;
      } else {
        statusMessage = `Hallo ${customerName},<br/><br/>Ihre Bestellung <strong>#${itemId}</strong> steht zur Abholung bereit! Sie können Ihre Speisen ab sofort bei uns abholen.`;
      }
    } else if (newStatus === 'cancelled' || newStatus === 'storniert') {
      statusColor = '#ef4444'; // Cancelled Red
      subject = `❌ Kimi Sushi: Ihre Bestellung wurde storniert`;
      statusHeader = `Bestellung storniert`;
      statusMessage = `Hallo ${customerName},<br/><br/>leider müssen wir Ihnen mitteilen, dass Ihre Bestellung <strong>#${itemId}</strong> storniert wurde. Sollten Sie bereits bezahlt haben, wird der Betrag zurückerstattet. Bei Rückfragen stehen wir Ihnen gerne zur Verfügung.`;
    } else {
      subject = `🍣 Update zu Ihrer Bestellung bei Kimi Sushi`;
      statusHeader = `Status Update`;
      statusMessage = `Hallo ${customerName},<br/><br/>der Status Ihrer Bestellung <strong>#${itemId}</strong> wurde auf <strong>${newStatus}</strong> aktualisiert.`;
    }
  }

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: auto; border: 3px solid ${statusColor}; padding: 24px; border-radius: 14px; background: #fafafa;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: ${statusColor}; font-size: 24px; margin: 0; font-family: 'Georgia', serif;">
          ${statusHeader}
        </h1>
        <p style="color: #666; margin: 8px 0 0 0; font-size: 13px;">
          Bestellnummer: <strong>${itemId}</strong>
        </p>
      </div>
      
      <div style="background: #ffffff; border-radius: 10px; padding: 20px; margin-bottom: 16px; border: 1px solid #e5e7eb; line-height: 1.6; color: #333; font-size: 14px;">
        ${statusMessage}
      </div>

      <div style="background: #f3f4f6; border-radius: 10px; padding: 16px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
        <h3 style="margin: 0 0 10px 0; color: #374151; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">📋 Zusammenfassung</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 0; color: #666; font-size: 13px; width: 130px;"><strong>Datum:</strong></td>
            <td style="padding: 5px 0; font-size: 13px;">${fmtDate}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #666; font-size: 13px;"><strong>Uhrzeit:</strong></td>
            <td style="padding: 5px 0; font-size: 13px; font-weight: bold;">${pickupTimeDisplay}</td>
          </tr>
          ${!isReservation ? `
          <tr>
            <td style="padding: 5px 0; color: #666; font-size: 13px;"><strong>Bestellart:</strong></td>
            <td style="padding: 5px 0; font-size: 13px;">${method === 'delivery' ? '🚴 Lieferung' : '🏪 Abholung'}</td>
          </tr>
          ${method === 'delivery' && address ? `
          <tr>
            <td style="padding: 5px 0; color: #666; font-size: 13px; vertical-align: top;"><strong>Lieferadresse:</strong></td>
            <td style="padding: 5px 0; font-size: 13px;">${address}</td>
          </tr>` : ''}
          ` : `
          <tr>
            <td style="padding: 5px 0; color: #666; font-size: 13px;"><strong>Gäste:</strong></td>
            <td style="padding: 5px 0; font-size: 13px; font-weight: bold;">${itemCount}</td>
          </tr>`}
        </table>
      </div>

      ${!isReservation && items.length > 0 ? `
      <div style="background: #ffffff; border-radius: 10px; padding: 16px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
        <h3 style="margin: 0 0 12px 0; color: ${statusColor}; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">🛒 Ihre Bestellung</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 2px solid #eeeeee;">
            <th style="padding: 8px 5px; text-align: left; color: #555; font-size: 11px;">Gericht</th>
            <th style="padding: 8px 5px; text-align: center; color: #555; font-size: 11px; width: 60px;">Menge</th>
            <th style="padding: 8px 5px; text-align: right; color: #555; font-size: 11px; width: 80px;">Preis</th>
          </tr>
          ${items.map(item => {
            const unitPrice = normalizePrice(item.price);
            const qty = parseInt(item.quantity) || 1;
            const subtotal = unitPrice * qty;
            return `<tr>
              <td style="padding: 8px 5px; border-bottom: 1px solid #f9f9f9; font-size: 13px;">
                ${item.name || '-'}
                ${item.note ? `<br/><span style="color:#d97706; font-size:11px; font-style:italic;">↳ ${item.note}</span>` : ''}
              </td>
              <td style="padding: 8px 5px; text-align: center; border-bottom: 1px solid #f9f9f9; font-size: 13px; color: #666;">x${qty}</td>
              <td style="padding: 8px 5px; text-align: right; border-bottom: 1px solid #f9f9f9; font-size: 13px; font-weight: bold;">${fmt(subtotal)}</td>
            </tr>`;
          }).join('')}
          ${parseFloat(deliveryFee) > 0 ? `<tr>
            <td colspan="2" style="padding: 8px 5px; text-align: right; font-size: 12px; color: #666;">Liefergebühr:</td>
            <td style="padding: 8px 5px; text-align: right; font-size: 12px; font-weight: bold;">${fmt(parseFloat(deliveryFee))}</td>
          </tr>` : ''}
          ${orderData.discountAmount > 0 ? `<tr>
            <td colspan="2" style="padding: 8px 5px; text-align: right; font-size: 12px; color: #10b981;">Rabatt (${orderData.discountCode || 'CODE'}):</td>
            <td style="padding: 8px 5px; text-align: right; font-size: 12px; font-weight: bold; color: #10b981;">-${fmt(normalizePrice(orderData.discountAmount))}</td>
          </tr>` : ''}
          <tr style="border-top: 2px solid #eeeeee;">
            <td colspan="2" style="padding: 12px 5px; text-align: right; font-weight: bold; font-size: 14px;">Gesamtbetrag:</td>
            <td style="padding: 12px 5px; text-align: right; font-weight: bold; font-size: 16px; color: ${statusColor};">${fmt(normalizePrice(orderData.total))}</td>
          </tr>
        </table>
      </div>
      ` : ''}
      
      <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #666; margin: 0 0 4px 0;"><strong>Kimi Sushi</strong></p>
        <p style="font-size: 11px; color: #999; margin: 0;">Filderstadt, Deutschland · Tel: ${gmailConfig?.phone || ''}</p>
        <p style="font-size: 10px; color: #ccc; margin: 8px 0 0 0;">Dies ist eine automatische Benachrichtigung. Bitte antworten Sie nicht direkt auf diese E-Mail.</p>
      </div>
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
      to: customerEmail,
      subject: subject,
      html: htmlContent
    });
    console.log(`[GMAIL-CUSTOMER] Status change notification sent to ${customerEmail}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[GMAIL-CUSTOMER] Error sending status email:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  createGmailTransporter,
  sendGmailNotification,
  sendCustomerStatusEmail
};
